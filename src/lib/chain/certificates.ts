import "server-only"

import type { Address, Hex } from "viem"

import { SUNPOOL_CONTRACTS, readingRegistryAbi, recTokenAbi } from "./contracts"
import { cachedTrades, publicClient, syncTrades } from "./server"

/** One renewable energy certificate (RECToken), joined with the trade that minted it. */
export type CertificateRecord = {
  id: string
  wh: number
  producer: Address
  owner: Address
  meterId: Hex
  readingId: Hex
  /** Meter reading time, unix seconds. */
  readingTimestamp: number
  /** ReadingRegistry.consumedAt(readingId), unix seconds. 0 means not consumed. */
  consumedAt: number
  /** Settlement on the live market. Absent for certificates minted elsewhere. */
  trade?: {
    listingId: string
    txHash: Hex
    /** Unix seconds. */
    timestamp: number
    /** Settlement token per kWh. */
    price: number
    /** Settlement token paid. */
    total: number
  }
}

export type CertificateLedger = {
  certificates: CertificateRecord[]
  totals: { certificates: number; wh: number }
  contracts: { recToken: Address; readingRegistry: Address; energyMarket: Address }
  headBlock: string
  updatedAt: number
}

type StaticCert = Omit<CertificateRecord, "owner" | "consumedAt" | "trade">

// Certificate data and a non-zero consumedAt never change, so they are cached for the
// life of the server instance. Owners can change (ERC-721 transfer), so they are re-read.
const certs = new Map<string, StaticCert>()
const consumed = new Map<Hex, number>()

const FRESH_MS = 10_000
let last: CertificateLedger | null = null
let inflight: Promise<CertificateLedger> | null = null

async function buildLedger(): Promise<CertificateLedger> {
  const [headBlock, totalMinted] = await Promise.all([
    syncTrades(),
    publicClient.readContract({
      address: SUNPOOL_CONTRACTS.recToken,
      abi: recTokenAbi,
      functionName: "totalMinted",
    }),
  ])

  const ids = Array.from({ length: Number(totalMinted) }, (_, i) => BigInt(i + 1))
  const missing = ids.filter((id) => !certs.has(id.toString()))

  const [details, owners] = await Promise.all([
    missing.length
      ? publicClient.multicall({
          contracts: missing.map((id) => ({
            address: SUNPOOL_CONTRACTS.recToken,
            abi: recTokenAbi,
            functionName: "certificate" as const,
            args: [id] as const,
          })),
          allowFailure: false,
        })
      : Promise.resolve([]),
    ids.length
      ? publicClient.multicall({
          contracts: ids.map((id) => ({
            address: SUNPOOL_CONTRACTS.recToken,
            abi: recTokenAbi,
            functionName: "ownerOf" as const,
            args: [id] as const,
          })),
          allowFailure: false,
        })
      : Promise.resolve([]),
  ])

  details.forEach((c, i) => {
    const id = missing[i].toString()
    certs.set(id, {
      id,
      wh: Number(c.wh),
      producer: c.producer,
      meterId: c.meterId,
      readingId: c.readingId,
      readingTimestamp: Number(c.timestamp),
    })
  })

  // The "cannot be double counted" proof: each certificate's reading is consumed in the registry.
  const unchecked = ids
    .map((id) => certs.get(id.toString())!.readingId)
    .filter((readingId) => !consumed.has(readingId))
  if (unchecked.length) {
    const results = await publicClient.multicall({
      contracts: unchecked.map((readingId) => ({
        address: SUNPOOL_CONTRACTS.readingRegistry,
        abi: readingRegistryAbi,
        functionName: "consumedAt" as const,
        args: [readingId] as const,
      })),
      allowFailure: false,
    })
    results.forEach((at, i) => {
      if (at > 0n) consumed.set(unchecked[i], Number(at))
    })
  }

  const trades = new Map(cachedTrades().map((t) => [t.certificateId, t]))
  const certificates: CertificateRecord[] = ids
    .map((id, i) => {
      const c = certs.get(id.toString())!
      const t = trades.get(c.id)
      return {
        ...c,
        owner: owners[i],
        consumedAt: consumed.get(c.readingId) ?? 0,
        trade: t
          ? { listingId: t.listingId, txHash: t.txHash, timestamp: t.timestamp, price: t.price, total: t.total }
          : undefined,
      }
    })
    .reverse()

  return {
    certificates,
    totals: { certificates: certificates.length, wh: certificates.reduce((s, c) => s + c.wh, 0) },
    contracts: {
      recToken: SUNPOOL_CONTRACTS.recToken,
      readingRegistry: SUNPOOL_CONTRACTS.readingRegistry,
      energyMarket: SUNPOOL_CONTRACTS.energyMarket,
    },
    headBlock: headBlock.toString(),
    updatedAt: Date.now(),
  }
}

/** Every certificate on the live RECToken. Cached for a few seconds; concurrent calls share one read. */
export function getCertificateLedger() {
  if (last && Date.now() - last.updatedAt < FRESH_MS) return Promise.resolve(last)
  inflight ??= buildLedger()
    .then((ledger) => (last = ledger))
    .finally(() => {
      inflight = null
    })
  return inflight
}
