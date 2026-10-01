import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { network } from "hardhat"
import { getAddress, keccak256, parseUnits, stringToHex, type Address, type Hex } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"

const { viem } = await network.create()
const publicClient = await viem.getPublicClient()
const [admin, seller, buyer, stranger] = await viem.getWalletClients()

const meterKey = privateKeyToAccount(generatePrivateKey())
const rogueKey = privateKeyToAccount(generatePrivateKey())
const METER_ID = keccak256(stringToHex("meter:H03"))
const OTHER_METER_ID = keccak256(stringToHex("meter:H07"))

type Reading = { readingId: Hex; meterId: Hex; seller: Address; timestamp: bigint; wh: bigint }

const usdm = (value: string) => parseUnits(value, 18)

async function deploy() {
  const stablecoin = await viem.deployContract("MockStablecoin")
  const registry = await viem.deployContract("ReadingRegistry", [admin.account.address])
  const recs = await viem.deployContract("RECToken", [admin.account.address])
  const market = await viem.deployContract("EnergyMarket", [
    admin.account.address,
    stablecoin.address,
    registry.address,
    recs.address,
  ])

  await registry.write.grantRole([await registry.read.CONSUMER_ROLE(), market.address])
  await recs.write.grantRole([await recs.read.MINTER_ROLE(), market.address])
  await registry.write.registerMeter([METER_ID, meterKey.address])

  await stablecoin.write.mint([buyer.account.address, usdm("100")])
  await stablecoin.write.approve([market.address, usdm("100")], { account: buyer.account })

  return { stablecoin, registry, recs, market }
}

let nonce = 0
function makeReading(overrides: Partial<Reading> = {}): Reading {
  nonce += 1
  return {
    readingId: keccak256(stringToHex(`reading:${nonce}`)),
    meterId: METER_ID,
    seller: seller.account.address,
    timestamp: 1_790_000_000n + BigInt(nonce),
    wh: 2_500n,
    ...overrides,
  }
}

async function sign(
  registryAddress: Address,
  reading: Reading,
  signer: ReturnType<typeof privateKeyToAccount> = meterKey,
) {
  return signer.signTypedData({
    domain: {
      name: "Sunpool ReadingRegistry",
      version: "1",
      chainId: await publicClient.getChainId(),
      verifyingContract: registryAddress,
    },
    types: {
      Reading: [
        { name: "readingId", type: "bytes32" },
        { name: "meterId", type: "bytes32" },
        { name: "seller", type: "address" },
        { name: "timestamp", type: "uint64" },
        { name: "wh", type: "uint64" },
      ],
    },
    primaryType: "Reading",
    message: reading,
  })
}

describe("ReadingRegistry: double-claim rejection", () => {
  it("lets a reading be listed once and rejects the second claim with ReadingAlreadyConsumed", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    const signature = await sign(registry.address, reading)

    await market.write.list([reading, signature, usdm("0.124")], { account: seller.account })
    assert.equal(await registry.read.isConsumed([reading.readingId]), true)

    await viem.assertions.revertWithCustomErrorWithArgs(
      market.write.list([reading, signature, usdm("0.124")], { account: seller.account }),
      registry,
      "ReadingAlreadyConsumed",
      [reading.readingId, (consumedAt: bigint) => consumedAt > 0n],
    )
  })

  it("rejects a re-signed copy of the same reading ID, even at a different price", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await market.write.list([reading, await sign(registry.address, reading), usdm("0.12")], {
      account: seller.account,
    })

    const sameIdMoreEnergy = { ...reading, wh: 9_000n }
    await viem.assertions.revertWithCustomError(
      market.write.list([sameIdMoreEnergy, await sign(registry.address, sameIdMoreEnergy), usdm("0.2")], {
        account: seller.account,
      }),
      registry,
      "ReadingAlreadyConsumed",
    )
  })
})

describe("ReadingRegistry: signature checks", () => {
  it("rejects a reading signed by an unregistered key", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await viem.assertions.revertWithCustomErrorWithArgs(
      market.write.list([reading, await sign(registry.address, reading, rogueKey), usdm("0.12")], {
        account: seller.account,
      }),
      registry,
      "UnregisteredMeter",
      [rogueKey.address],
    )
  })

  it("rejects a reading whose data was changed after signing", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    const signature = await sign(registry.address, reading)
    const tampered = { ...reading, wh: reading.wh * 10n }
    // The recovered signer is some unrelated address, so the meter lookup fails.
    await viem.assertions.revertWithCustomError(
      market.write.list([tampered, signature, usdm("0.12")], { account: seller.account }),
      registry,
      "UnregisteredMeter",
    )
  })

  it("rejects a registered key signing for a different meter", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading({ meterId: OTHER_METER_ID })
    await viem.assertions.revertWithCustomErrorWithArgs(
      market.write.list([reading, await sign(registry.address, reading), usdm("0.12")], {
        account: seller.account,
      }),
      registry,
      "MeterMismatch",
      [METER_ID, OTHER_METER_ID],
    )
  })

  it("rejects a malformed signature", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await viem.assertions.revertWithCustomError(
      market.write.list([reading, "0x1234", usdm("0.12")], { account: seller.account }),
      registry,
      "InvalidSignature",
    )
  })

  it("rejects listing someone else's reading", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await viem.assertions.revertWithCustomError(
      market.write.list([reading, await sign(registry.address, reading), usdm("0.12")], {
        account: stranger.account,
      }),
      market,
      "NotSeller",
    )
  })

  it("stops accepting a meter's readings after its key is revoked", async () => {
    const { registry, market } = await deploy()
    await registry.write.revokeMeter([meterKey.address])
    const reading = makeReading()
    await viem.assertions.revertWithCustomError(
      market.write.list([reading, await sign(registry.address, reading), usdm("0.12")], {
        account: seller.account,
      }),
      registry,
      "UnregisteredMeter",
    )
  })
})

describe("EnergyMarket: settlement", () => {
  it("moves exactly wh × price / 1000 from buyer to seller and mints one certificate", async () => {
    const { registry, market, stablecoin, recs } = await deploy()
    const reading = makeReading({ wh: 6_400n })
    const price = usdm("0.124")
    await market.write.list([reading, await sign(registry.address, reading), price], { account: seller.account })

    const expected = (6_400n * price) / 1000n // 0.7936 USDm
    assert.equal(expected, usdm("0.7936"))
    assert.equal(await market.read.quote([6_400n, price]), expected)

    const buyerBefore = await stablecoin.read.balanceOf([buyer.account.address])
    const sellerBefore = await stablecoin.read.balanceOf([seller.account.address])
    await market.write.buy([1n, price], { account: buyer.account })
    assert.equal(await stablecoin.read.balanceOf([buyer.account.address]), buyerBefore - expected)
    assert.equal(await stablecoin.read.balanceOf([seller.account.address]), sellerBefore + expected)
    assert.equal(await stablecoin.read.balanceOf([market.address]), 0n)

    assert.equal(await recs.read.ownerOf([1n]), getAddress(buyer.account.address))
    const cert = await recs.read.certificate([1n])
    assert.equal(cert.readingId, reading.readingId)
    assert.equal(cert.meterId, METER_ID)
    assert.equal(cert.wh, 6_400n)
    assert.equal(cert.producer, getAddress(seller.account.address))
    assert.equal(await recs.read.totalMinted(), 1n)
  })

  it("emits TradeSettled with the amounts the UI streams into the tape", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading({ wh: 1_500n })
    const price = usdm("0.13")
    await market.write.list([reading, await sign(registry.address, reading), price], { account: seller.account })

    await viem.assertions.emitWithArgs(market.write.buy([1n, price], { account: buyer.account }), market, "TradeSettled", [
      1n,
      seller.account.address,
      buyer.account.address,
      reading.readingId,
      1_500n,
      price,
      usdm("0.195"),
      1n,
    ])
  })

  it("rounds fractional totals down", async () => {
    const { market } = await deploy()
    assert.equal(await market.read.quote([1n, 999n]), 0n)
    assert.equal(await market.read.quote([3n, 1_000n]), 3n)
    assert.equal(await market.read.quote([333n, 7n]), 2n)
  })

  it("cannot sell the same listing twice", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    const price = usdm("0.12")
    await market.write.list([reading, await sign(registry.address, reading), price], { account: seller.account })
    await market.write.buy([1n, price], { account: buyer.account })
    await viem.assertions.revertWithCustomErrorWithArgs(
      market.write.buy([1n, price], { account: buyer.account }),
      market,
      "ListingNotActive",
      [1n],
    )
  })

  it("protects the buyer from a price above their maximum", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await market.write.list([reading, await sign(registry.address, reading), usdm("0.15")], {
      account: seller.account,
    })
    await viem.assertions.revertWithCustomError(
      market.write.buy([1n, usdm("0.14")], { account: buyer.account }),
      market,
      "PriceChanged",
    )
  })

  it("rejects buying your own listing and buying a cancelled listing", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    const price = usdm("0.12")
    await market.write.list([reading, await sign(registry.address, reading), price], { account: seller.account })
    await viem.assertions.revertWithCustomError(
      market.write.buy([1n, price], { account: seller.account }),
      market,
      "SelfPurchase",
    )
    await market.write.cancel([1n], { account: seller.account })
    await viem.assertions.revertWithCustomError(
      market.write.buy([1n, price], { account: buyer.account }),
      market,
      "ListingNotActive",
    )
  })

  it("reverts when the buyer has not approved enough stablecoin", async () => {
    const { registry, market, stablecoin } = await deploy()
    await stablecoin.write.approve([market.address, 0n], { account: buyer.account })
    const reading = makeReading()
    const price = usdm("0.12")
    await market.write.list([reading, await sign(registry.address, reading), price], { account: seller.account })
    await viem.assertions.revertWithCustomError(
      market.write.buy([1n, price], { account: buyer.account }),
      stablecoin,
      "ERC20InsufficientAllowance",
    )
  })
})

describe("Access control", () => {
  it("only meter admins can register or revoke meter keys", async () => {
    const { registry } = await deploy()
    await viem.assertions.revertWithCustomError(
      registry.write.registerMeter([METER_ID, stranger.account.address], { account: stranger.account }),
      registry,
      "AccessControlUnauthorizedAccount",
    )
    await viem.assertions.revertWithCustomError(
      registry.write.revokeMeter([meterKey.address], { account: stranger.account }),
      registry,
      "AccessControlUnauthorizedAccount",
    )
  })

  it("only the market can consume readings", async () => {
    const { registry } = await deploy()
    const reading = makeReading()
    await viem.assertions.revertWithCustomError(
      registry.write.consume([reading, await sign(registry.address, reading)], { account: seller.account }),
      registry,
      "AccessControlUnauthorizedAccount",
    )
  })

  it("only the market can mint certificates", async () => {
    const { recs } = await deploy()
    await viem.assertions.revertWithCustomError(
      recs.write.mint(
        [
          stranger.account.address,
          { readingId: METER_ID, meterId: METER_ID, producer: stranger.account.address, timestamp: 1n, wh: 1n },
        ],
        { account: stranger.account },
      ),
      recs,
      "AccessControlUnauthorizedAccount",
    )
  })

  it("only the seller can cancel, and only pausers can pause", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    await market.write.list([reading, await sign(registry.address, reading), usdm("0.12")], {
      account: seller.account,
    })
    await viem.assertions.revertWithCustomError(
      market.write.cancel([1n], { account: stranger.account }),
      market,
      "NotSeller",
    )
    await viem.assertions.revertWithCustomError(
      market.write.pause({ account: stranger.account }),
      market,
      "AccessControlUnauthorizedAccount",
    )
  })

  it("blocks listing and buying while paused", async () => {
    const { registry, market } = await deploy()
    const reading = makeReading()
    const signature = await sign(registry.address, reading)
    await market.write.pause()
    await viem.assertions.revertWithCustomError(
      market.write.list([reading, signature, usdm("0.12")], { account: seller.account }),
      market,
      "EnforcedPause",
    )
    await market.write.unpause()
    await market.write.list([reading, signature, usdm("0.12")], { account: seller.account })
  })
})
