import "server-only"

import { parseAbiItem, type Address } from "viem"

import { SUNPOOL_CONTRACTS } from "./contracts"
import { publicClient } from "./server"

/**
 * Per-seller accounting for reading verification, read from the chain.
 *
 * Every listing consumes a signed reading and emits `Listed(listingId, seller
 * indexed, readingId, meterId, wh, price)`. Summing a seller's Listed Wh since WAT
 * midnight gives a durable "already listed today" that survives cold starts and is
 * the same on every server instance. The cache below only saves RPC calls.
 */

const listed = parseAbiItem(
  "event Listed(uint256 indexed listingId, address indexed seller, bytes32 indexed readingId, bytes32 meterId, uint64 wh, uint256 pricePerKwh)",
)

/** Forno rejects eth_getLogs ranges above 100,000 blocks. */
const LOG_CHUNK = 99_000n
/** Peer comparison window. Celo Sepolia has one-second blocks. */
const WINDOW_SECONDS = 7n * 86_400n
const WAT_OFFSET_SECONDS = 3_600

type ListedEvent = { seller: string; wh: number; timestamp: number }

const cache: { scannedTo: bigint; events: ListedEvent[] } = { scannedTo: 0n, events: [] }
let inflight: Promise<void> | null = null

async function scan() {
  const head = await publicClient.getBlock({ blockTag: "latest" })
  const earliest = head.number > WINDOW_SECONDS ? head.number - WINDOW_SECONDS : 0n
  let from = cache.scannedTo + 1n
  if (from < earliest) from = earliest
  if (from < SUNPOOL_CONTRACTS.deployBlock) from = SUNPOOL_CONTRACTS.deployBlock
  const chunks: [bigint, bigint][] = []
  for (let f = from; f <= head.number; f += LOG_CHUNK + 1n) {
    chunks.push([f, f + LOG_CHUNK > head.number ? head.number : f + LOG_CHUNK])
  }
  const results = await Promise.all(
    chunks.map(([fromBlock, toBlock]) =>
      publicClient.getLogs({ address: SUNPOOL_CONTRACTS.energyMarket, event: listed, fromBlock, toBlock }),
    ),
  )
  const batch = results.flat().map((log) => ({
    seller: log.args.seller!.toLowerCase(),
    wh: Number(log.args.wh!),
    // One-second blocks: derive time from the head instead of one RPC per block.
    timestamp: Number(head.timestamp - (head.number - log.blockNumber!)),
  }))
  const cutoff = Number(head.timestamp - WINDOW_SECONDS)
  cache.events = [...cache.events, ...batch].filter((e) => e.timestamp >= cutoff)
  cache.scannedTo = head.number
}

/** Unix seconds of the most recent WAT midnight. */
export const watMidnight = (nowSeconds: number) =>
  Math.floor((nowSeconds + WAT_OFFSET_SECONDS) / 86_400) * 86_400 - WAT_OFFSET_SECONDS

export type ListingActivity = {
  /** Wh this seller listed since WAT midnight (null when no seller was given). */
  sellerTodayWh: number | null
  /** Listing sizes by other sellers over the last seven days, Wh. */
  peerWh: number[]
}

/** Throws if Celo cannot be reached; callers decide whether to fail closed. */
export async function getListingActivity(seller?: Address, now = Date.now()): Promise<ListingActivity> {
  inflight ??= scan().finally(() => {
    inflight = null
  })
  await inflight
  const me = seller?.toLowerCase()
  const midnight = watMidnight(Math.floor(now / 1000))
  return {
    sellerTodayWh: me
      ? cache.events.filter((e) => e.seller === me && e.timestamp >= midnight).reduce((s, e) => s + e.wh, 0)
      : null,
    peerWh: cache.events.filter((e) => e.seller !== me).map((e) => e.wh),
  }
}
