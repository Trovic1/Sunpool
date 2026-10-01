import type { GenerationSeries, PriceSuggestion } from "@/lib/forecast"
import type { Listing, Trade } from "@/lib/seed"

export const SCENARIOS = ["live", "empty", "error"] as const
export type Scenario = (typeof SCENARIOS)[number]

export type FeedStatus = "loading" | "ready" | "error" | "reconnecting"

export type MarketTrade = Trade & {
  /** Chain mode only. */
  txHash?: string
  timestamp?: number
  certificateId?: string
}

export type MarketListing = Omit<Listing, "untilMinute"> & {
  /** Seeded mode: listing expires at this minute of the day. */
  untilMinute?: number
  /** Chain mode: unix seconds when listed. */
  listedAt?: number
  /** Chain mode: exact price in stablecoin base units. */
  priceWei?: string
  pending?: boolean
}

export type ListSurplusInput = { kwh: number; price: number; untilMinute: number }

/** The shape every Market component reads. Implemented by the seeded and on-chain hooks. */
export type MarketModel = {
  mode: "seeded" | "chain"
  /** Connected wallet in chain mode. */
  account?: string
  scenario: Scenario
  changeScenario: (next: Scenario) => void
  status: FeedStatus
  /** Minute of the day in WAT (simulated clock in seeded mode, real clock on chain). */
  minute: number
  trades: MarketTrade[]
  listings: MarketListing[]
  paused: boolean
  togglePaused: () => void
  buy: (listing: MarketListing) => void
  listSurplus: (input: ListSurplusInput) => Promise<void>
  retry: () => void
  totals: { kwh: number; cusd: number; certificates: number; co2Kg: number }
  generation: GenerationSeries
  suggestion: PriceSuggestion
  announcement: string
}
