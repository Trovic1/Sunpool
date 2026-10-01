import { keccak256, stringToHex, type Address } from "viem"

import { energyMarketAbi, readingRegistryAbi, recTokenAbi } from "./abis"
import { CELO_SEPOLIA, SETTLEMENT_TOKEN } from "./celo"

/**
 * Sunpool contracts on Celo Sepolia. Deployed 2026-10-01 with Hardhat Ignition
 * (ignition/deployments/chain-11142220). Source verified on Blockscout.
 * Env vars override the defaults so a redeploy needs no code change.
 */
export const SUNPOOL_CONTRACTS = {
  chainId: CELO_SEPOLIA.id,
  readingRegistry: (process.env.NEXT_PUBLIC_READING_REGISTRY_ADDRESS ??
    "0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10") as Address,
  recToken: (process.env.NEXT_PUBLIC_REC_TOKEN_ADDRESS ?? "0xC92552b83C094E8052d9b8B4EDba34A3E1bA4ec6") as Address,
  /** USDC-settled market. The first market (USDm, 0xEc37879a…f602) is paused. */
  energyMarket: (process.env.NEXT_PUBLIC_ENERGY_MARKET_ADDRESS ??
    "0xAd7dF1530410e4eA9a6CAcb0C9C993958Aef0A29") as Address,
  stablecoin: SETTLEMENT_TOKEN.address as Address,
  /** First block to scan for events (USDC market deployment). */
  deployBlock: BigInt(process.env.NEXT_PUBLIC_DEPLOY_BLOCK ?? 37_567_991),
} as const

/** Wallets with a public role in the demo, shown by name instead of a raw address. */
export const KNOWN_PARTIES: Record<string, string> = {
  "0x59ec2a89824c6293b02879e0f0da5013467cbc7b": "Sunpool demo rooftop",
}

/** Meter ID registered for the simulated meter signer (see ignition/modules/Sunpool.ts). */
export const DEMO_METER_ID = keccak256(stringToHex("sunpool:demo-meter"))

export const EIP712_DOMAIN = {
  name: "Sunpool ReadingRegistry",
  version: "1",
  chainId: SUNPOOL_CONTRACTS.chainId,
  verifyingContract: SUNPOOL_CONTRACTS.readingRegistry,
} as const

export const READING_TYPES = {
  Reading: [
    { name: "readingId", type: "bytes32" },
    { name: "meterId", type: "bytes32" },
    { name: "seller", type: "address" },
    { name: "timestamp", type: "uint64" },
    { name: "wh", type: "uint64" },
  ],
} as const

export type SignedReading = {
  reading: {
    readingId: `0x${string}`
    meterId: `0x${string}`
    seller: Address
    timestamp: bigint
    wh: bigint
  }
  signature: `0x${string}`
}

export const erc20Abi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const

export { energyMarketAbi, readingRegistryAbi, recTokenAbi }

/**
 * EnergyMarket ABI plus the custom errors of the contracts it calls, so reverts that
 * bubble up from ReadingRegistry (e.g. ReadingAlreadyConsumed) decode by name.
 */
export const marketAbiWithErrors = [
  ...energyMarketAbi,
  ...readingRegistryAbi.filter((item) => item.type === "error"),
  ...recTokenAbi.filter((item) => item.type === "error" && item.name !== "ZeroAddress"),
] as const

export const explorerTx = (hash: string) => `${CELO_SEPOLIA.explorerUrl}/tx/${hash}`
export const explorerAddress = (address: string) => `${CELO_SEPOLIA.explorerUrl}/address/${address}`
export const explorerToken = (address: string, id: bigint | number) =>
  `${CELO_SEPOLIA.explorerUrl}/token/${address}/instance/${id}`

/** "seeded" keeps the offline demo; "chain" uses Celo Sepolia. */
export const DATA_SOURCE: "seeded" | "chain" =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "seeded" ? "seeded" : "chain"
