import "server-only"

import { createPublicClient, formatUnits, http, parseAbiItem, type Address, type Hex } from "viem"
import { celoSepolia } from "viem/chains"

import { CELO_SEPOLIA, SETTLEMENT_TOKEN } from "./celo"
import { SUNPOOL_CONTRACTS, energyMarketAbi } from "./contracts"

export const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(CELO_SEPOLIA.rpcUrl, { batch: true, retryCount: 2 }),
})

/** Forno rejects eth_getLogs ranges above 100,000 blocks. */
const LOG_CHUNK = 99_000n

const tradeSettled = parseAbiItem(
  "event TradeSettled(uint256 indexed listingId, address indexed seller, address indexed buyer, bytes32 readingId, uint64 wh, uint256 pricePerKwh, uint256 total, uint256 certificateId)",
)

export type ChainTrade = {
  listingId: string
  seller: Address
  buyer: Address
  readingId: Hex
  wh: number
  /** Stablecoin per kWh, as a decimal number for display. */
  price: number
  /** Stablecoin total, decimal number. */
  total: number
  certificateId: string
  txHash: Hex
  blockNumber: string
  /** Unix seconds. */
  timestamp: number
}

export type ChainListing = {
  id: string
  seller: Address
  wh: number
  price: number
  /** Exact price in base units, as a decimal string. */
  priceWei: string
  listedAt: number
  readingId: Hex
}

export type MarketSnapshot = {
  listings: ChainListing[]
  trades: ChainTrade[]
  totals: { wh: number; stablecoin: number; certificates: number; trades: number }
  headBlock: string
  updatedAt: number
}

// Module-level cache: survives between requests on a warm server instance, so each
// poll only scans blocks it has not seen yet.
const cache: { scannedTo: bigint; trades: ChainTrade[]; blockTimes: Map<bigint, number> } = {
  scannedTo: SUNPOOL_CONTRACTS.deployBlock - 1n,
  trades: [],
  blockTimes: new Map(),
}

async function blockTime(blockNumber: bigint) {
  const cached = cache.blockTimes.get(blockNumber)
  if (cached !== undefined) return cached
  const block = await publicClient.getBlock({ blockNumber })
  const ts = Number(block.timestamp)
  cache.blockTimes.set(blockNumber, ts)
  return ts
}

async function scanTrades(head: bigint) {
  let from = cache.scannedTo + 1n
  while (from <= head) {
    const to = from + LOG_CHUNK > head ? head : from + LOG_CHUNK
    const logs = await publicClient.getLogs({
      address: SUNPOOL_CONTRACTS.energyMarket,
      event: tradeSettled,
      fromBlock: from,
      toBlock: to,
    })
    // Build the whole chunk first so a failure part-way never leaves duplicates behind.
    const batch: ChainTrade[] = []
    for (const log of logs) {
      const a = log.args
      batch.push({
        listingId: a.listingId!.toString(),
        seller: a.seller!,
        buyer: a.buyer!,
        readingId: a.readingId!,
        wh: Number(a.wh!),
        price: Number(formatUnits(a.pricePerKwh!, SETTLEMENT_TOKEN.decimals)),
        total: Number(formatUnits(a.total!, SETTLEMENT_TOKEN.decimals)),
        certificateId: a.certificateId!.toString(),
        txHash: log.transactionHash!,
        blockNumber: log.blockNumber!.toString(),
        timestamp: await blockTime(log.blockNumber!),
      })
    }
    cache.trades.push(...batch)
    cache.scannedTo = to
    from = to + 1n
  }
}

async function readListings(): Promise<ChainListing[]> {
  const count = await publicClient.readContract({
    address: SUNPOOL_CONTRACTS.energyMarket,
    abi: energyMarketAbi,
    functionName: "listingCount",
  })
  if (count === 0n) return []
  const ids = Array.from({ length: Number(count) }, (_, i) => BigInt(i + 1))
  const results = await publicClient.multicall({
    contracts: ids.map((id) => ({
      address: SUNPOOL_CONTRACTS.energyMarket,
      abi: energyMarketAbi,
      functionName: "getListing" as const,
      args: [id] as const,
    })),
    allowFailure: false,
  })
  return results
    .map((l, i) => ({ l, id: ids[i] }))
    .filter(({ l }) => l.active)
    .map(({ l, id }) => ({
      id: id.toString(),
      seller: l.seller,
      wh: Number(l.wh),
      price: Number(formatUnits(l.pricePerKwh, SETTLEMENT_TOKEN.decimals)),
      priceWei: l.pricePerKwh.toString(),
      listedAt: Number(l.listedAt),
      readingId: l.reading.readingId,
    }))
    .reverse()
}

let inflight: Promise<MarketSnapshot> | null = null

export function getMarketSnapshot() {
  // Collapse concurrent polls into one RPC round trip.
  inflight ??= (async () => {
    try {
      const head = await publicClient.getBlockNumber()
      const [listings] = await Promise.all([readListings(), scanTrades(head)])
      const trades = [...cache.trades].sort((a, b) => b.timestamp - a.timestamp)
      return {
        listings,
        trades: trades.slice(0, 100),
        totals: {
          wh: trades.reduce((s, t) => s + t.wh, 0),
          stablecoin: trades.reduce((s, t) => s + t.total, 0),
          certificates: trades.length,
          trades: trades.length,
        },
        headBlock: head.toString(),
        updatedAt: Date.now(),
      }
    } finally {
      inflight = null
    }
  })()
  return inflight
}
