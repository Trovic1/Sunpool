/**
 * Puts real state on Celo Sepolia so the live market is not empty:
 * - lists a few signed readings from the deployer's "demo rooftop"
 * - lists one reading reserved for the double-claim test and saves it to
 *   src/lib/chain/double-claim-fixture.json (public data: the reading and its signature)
 *
 * Meter readings are simulated: the registered meter key signs them here.
 * Run: node --env-file=.env.local scripts/seed-chain.ts
 */
import { randomBytes } from "node:crypto"
import { writeFileSync } from "node:fs"

import { createPublicClient, createWalletClient, encodePacked, http, keccak256, parseUnits, type Hex } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { celoSepolia } from "viem/chains"

import { energyMarketAbi } from "../src/lib/chain/abis.ts"
import { CELO_SEPOLIA } from "../src/lib/chain/celo.ts"

const MARKET = "0xEc37879ac09BE6C49539de1B3CE29eb9f220f602"
const REGISTRY = "0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10"
const METER_ID = keccak256(new TextEncoder().encode("sunpool:demo-meter"))

const deployer = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as Hex)
const meter = privateKeyToAccount(process.env.METER_SIGNER_PRIVATE_KEY as Hex)
const transport = http(CELO_SEPOLIA.rpcUrl)
const publicClient = createPublicClient({ chain: celoSepolia, transport })
const wallet = createWalletClient({ chain: celoSepolia, transport, account: deployer })

async function signedReading(wh: bigint) {
  const timestamp = BigInt(Math.floor(Date.now() / 1000))
  const readingId = keccak256(
    encodePacked(["address", "uint64", "bytes16"], [deployer.address, timestamp, `0x${randomBytes(16).toString("hex")}`]),
  )
  const reading = { readingId, meterId: METER_ID, seller: deployer.address, timestamp, wh }
  const signature = await meter.signTypedData({
    domain: { name: "Sunpool ReadingRegistry", version: "1", chainId: CELO_SEPOLIA.id, verifyingContract: REGISTRY },
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
  return { reading, signature }
}

async function list(wh: bigint, price: string) {
  const { reading, signature } = await signedReading(wh)
  const hash = await wallet.writeContract({
    address: MARKET,
    abi: energyMarketAbi,
    functionName: "list",
    args: [reading, signature, parseUnits(price, 18)],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  console.log(`listed ${Number(wh) / 1000} kWh at ${price} USDm/kWh: ${receipt.status} ${hash}`)
  return { reading, signature, hash }
}

const fixture = await list(1_200n, "0.125")
writeFileSync(
  "src/lib/chain/double-claim-fixture.json",
  JSON.stringify(
    {
      note: "A reading already consumed on Celo Sepolia. The double-claim page replays it to show the rejection.",
      reading: { ...fixture.reading, timestamp: fixture.reading.timestamp.toString(), wh: fixture.reading.wh.toString() },
      signature: fixture.signature,
      firstClaimTx: fixture.hash,
      pricePerKwh: parseUnits("0.125", 18).toString(),
    },
    null,
    2,
  ) + "\n",
)

for (const [wh, price] of [
  [3_200n, "0.121"],
  [2_500n, "0.127"],
  [4_800n, "0.124"],
] as const) {
  await list(wh, price)
}
