/**
 * Seller-to-buyer matching: a ranked fill plan for a request of N kWh.
 *
 * Listings are bought whole (the contract's `buy` takes a listing id, not a quantity),
 * so the plan is a set of whole listings, not a split of one. Ranking is deliberately
 * simple and every number in it is visible:
 *
 *   score = pricePerKwh × (1 + RELIABILITY_PENALTY × (1 − reliability))
 *
 * Lower is better. Reliability is 1 unless we can compare the listing with what the
 * seller's panel is still forecast to generate today (reliability = forecast kWh left
 * / listed kWh, capped at 1). So a seller can be at most RELIABILITY_PENALTY dearer
 * in the ranking for an unconvincing listing; price decides almost everything else.
 *
 * Proximity is not scored: neither the seeded houses nor on-chain listings carry
 * coordinates or a feeder, so there is nothing honest to rank on.
 */

export const RELIABILITY_PENALTY = 0.05
export const MAX_REQUEST_KWH = 1000
const EPS = 1e-9

/** Petrol-generator electricity in Nigeria, per kWh. Source: docs/RESEARCH.md. */
export const GENERATOR = {
  ngnPerKwh: 750,
  source: "Minister of Power Adebayo Adelabu, reported by TheCable, 21 Oct 2024",
  href: "https://thecable.ng/adelabu-electricity-produced-with-petrol-generator-now-costs-n750-kwh",
} as const

export type MatchListing = {
  id: string
  sellerId: string
  /** kWh remaining in the listing. */
  kwh: number
  /** Stablecoin per kWh. */
  price: number
}

export type MatchInput = {
  kwh: number
  maxPrice?: number
  listings: MatchListing[]
  /**
   * kWh each seller's panel is still forecast to generate today, by seller id.
   * Sellers missing from the map are scored as neutral (reliability 1).
   */
  sellerForecastKwh?: Record<string, number>
  /** Display name for a seller, used in the reasons. */
  label?: (sellerId: string) => string
  /** Settlement token symbol used in the reasons. */
  currency?: string
}

export type MatchPick = {
  listingId: string
  sellerId: string
  kwh: number
  price: number
  cost: number
  score: number
  /** 0..1; 1 when no forecast was available. */
  reliability: number
  reasons: string[]
}

export type MatchPlan = {
  status: "full" | "partial" | "none"
  requestedKwh: number
  filledKwh: number
  /** kWh requested but not available. */
  shortfallKwh: number
  /** kWh beyond the request, because listings are bought whole. */
  overshootKwh: number
  totalCost: number
  avgPrice: number | null
  picks: MatchPick[]
  /** Open listings that passed the maxPrice filter. */
  considered: number
  /** Open listings dropped for being above maxPrice. */
  excludedByMaxPrice: number
  /** Saving against paying the volume-weighted average ask of every eligible listing. Null with fewer than two listings. */
  savingVsAverageAsk: number | null
  generator: {
    ngnPerKwh: number
    /** Naira the same kWh would cost from a petrol generator. */
    equivalentNgn: number
    source: string
    /** No sourced USD/NGN rate exists in the project, so no cross-currency saving is computed. */
    saving: null
    savingNote: string
  }
  /** Plain-English summary, including partial fills and filters. */
  summary: string
}

const round = (n: number, digits: number) => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

const fmtPrice = (n: number) => n.toFixed(3)
const fmtKwh = (n: number) => n.toFixed(1)

export type ParsedRequest = { ok: true; kwh: number; maxPrice?: number } | { ok: false; error: string }

/** Validate `kwh` and optional `maxPrice` query values. */
export function parseMatchRequest(kwh: string | null, maxPrice: string | null): ParsedRequest {
  if (kwh === null || kwh.trim() === "") return { ok: false, error: "kwh is required, e.g. ?kwh=5" }
  const n = Number(kwh)
  if (!Number.isFinite(n) || n <= 0) return { ok: false, error: "kwh must be a number above 0" }
  if (n > MAX_REQUEST_KWH) return { ok: false, error: `kwh must be at most ${MAX_REQUEST_KWH}` }
  if (maxPrice === null || maxPrice.trim() === "") return { ok: true, kwh: n }
  const p = Number(maxPrice)
  if (!Number.isFinite(p) || p < 0) return { ok: false, error: "maxPrice must be a number, 0 or above" }
  return { ok: true, kwh: n, maxPrice: p }
}

// Offers are bought whole, so the cheapest-first greedy fill can overshoot badly
// (5 kWh wanted, 9.6 kWh bought). For small markets, search every subset that
// covers the request and take the lowest total score-weighted cost; otherwise
// (or if nothing covers it) fall back to greedy fill.
const SUBSET_LIMIT = 14

function chooseSet<T extends { l: { kwh: number }; score: number }>(scored: T[], need: number): T[] {
  if (scored.length > SUBSET_LIMIT) return scored
  let best: T[] | null = null
  let bestCost = Infinity
  for (let mask = 1; mask < 1 << scored.length; mask++) {
    let kwh = 0
    let cost = 0
    let count = 0
    for (let i = 0; i < scored.length; i++) {
      if (mask & (1 << i)) {
        kwh += scored[i].l.kwh
        cost += scored[i].l.kwh * scored[i].score
        count++
      }
    }
    if (kwh < need - EPS) continue
    if (cost < bestCost - EPS || (Math.abs(cost - bestCost) <= EPS && best && count < best.length)) {
      best = scored.filter((_, i) => mask & (1 << i))
      bestCost = cost
    }
  }
  return best ?? scored
}

export function matchListings(input: MatchInput): MatchPlan {
  const currency = input.currency ?? "USDC"
  const name = input.label ?? ((id: string) => id)
  const valid = input.listings.filter((l) => l.kwh > EPS && Number.isFinite(l.price) && l.price >= 0)
  const eligible = input.maxPrice === undefined ? valid : valid.filter((l) => l.price <= input.maxPrice! + EPS)
  const excludedByMaxPrice = valid.length - eligible.length

  const scored = eligible
    .map((l) => {
      const forecast = input.sellerForecastKwh?.[l.sellerId]
      const reliability = forecast === undefined ? 1 : Math.min(1, Math.max(0, forecast / l.kwh))
      return { l, forecast, reliability, score: l.price * (1 + RELIABILITY_PENALTY * (1 - reliability)) }
    })
    .sort((a, b) => a.score - b.score || a.l.price - b.l.price || a.l.id.localeCompare(b.l.id))

  const cheapest = scored.length ? Math.min(...scored.map((s) => s.l.price)) : 0
  const picks: MatchPick[] = []
  let remaining = input.kwh

  for (const s of chooseSet(scored, input.kwh)) {
    if (remaining <= EPS) break
    const covers = s.l.kwh >= remaining - EPS
    const reasons: string[] = []
    if (s.l.price - cheapest < 0.0005) reasons.push(`Lowest price on offer, ${fmtPrice(s.l.price)} ${currency}/kWh`)
    else reasons.push(`${fmtPrice(s.l.price)} ${currency}/kWh, ${fmtPrice(s.l.price - cheapest)} above the cheapest`)
    if (s.forecast !== undefined) {
      reasons.push(
        s.reliability >= 1
          ? `${name(s.l.sellerId)}'s panels are forecast to make ${fmtKwh(s.forecast)} kWh more today, enough to cover this`
          : `${name(s.l.sellerId)}'s panels are forecast to make only ${fmtKwh(s.forecast)} kWh more today, so this ranks slightly lower`,
      )
    } else {
      reasons.push("No panel forecast for this seller, so reliability is not scored")
    }
    if (covers) {
      const over = s.l.kwh - remaining
      reasons.push(over > 0.05 ? `Covers the rest of your request, with ${fmtKwh(over)} kWh to spare` : "Covers the rest of your request")
    } else {
      reasons.push(`Takes ${fmtKwh(s.l.kwh)} kWh of the ${fmtKwh(remaining)} kWh still needed`)
    }
    picks.push({
      listingId: s.l.id,
      sellerId: s.l.sellerId,
      kwh: s.l.kwh,
      price: s.l.price,
      cost: round(s.l.kwh * s.l.price, 6),
      score: round(s.score, 6),
      reliability: round(s.reliability, 3),
      reasons,
    })
    remaining -= s.l.kwh
  }

  const filledKwh = round(picks.reduce((sum, p) => sum + p.kwh, 0), 6)
  const totalCost = round(picks.reduce((sum, p) => sum + p.cost, 0), 6)
  const shortfallKwh = round(Math.max(0, input.kwh - filledKwh), 6)
  const overshootKwh = round(Math.max(0, filledKwh - input.kwh), 6)
  const status: MatchPlan["status"] = picks.length === 0 ? "none" : shortfallKwh > EPS ? "partial" : "full"

  let savingVsAverageAsk: number | null = null
  if (picks.length > 0 && eligible.length > 1) {
    const volume = eligible.reduce((sum, l) => sum + l.kwh, 0)
    const avgAsk = eligible.reduce((sum, l) => sum + l.kwh * l.price, 0) / volume
    savingVsAverageAsk = round(Math.max(0, filledKwh * avgAsk - totalCost), 6)
  }

  let summary: string
  if (status === "none") {
    summary =
      valid.length === 0
        ? "No solar is listed right now."
        : `Nothing is listed at or under ${fmtPrice(input.maxPrice ?? 0)} ${currency}/kWh. The cheapest offer is ${fmtPrice(Math.min(...valid.map((l) => l.price)))}.`
  } else if (status === "partial") {
    summary = `Only ${fmtKwh(filledKwh)} kWh of the ${fmtKwh(input.kwh)} kWh you asked for is available${
      excludedByMaxPrice ? " at your price limit" : ""
    }. This plan takes all of it.`
  } else {
    summary = `${picks.length === 1 ? "One offer covers" : `${picks.length} offers cover`} your ${fmtKwh(input.kwh)} kWh${
      overshootKwh > 0.05 ? `, with ${fmtKwh(overshootKwh)} kWh extra because offers are bought whole` : ""
    }.`
  }

  return {
    status,
    requestedKwh: input.kwh,
    filledKwh,
    shortfallKwh,
    overshootKwh,
    totalCost,
    avgPrice: filledKwh > 0 ? round(totalCost / filledKwh, 6) : null,
    picks,
    considered: eligible.length,
    excludedByMaxPrice,
    savingVsAverageAsk,
    generator: {
      ngnPerKwh: GENERATOR.ngnPerKwh,
      equivalentNgn: round(filledKwh * GENERATOR.ngnPerKwh, 2),
      source: GENERATOR.source,
      saving: null,
      savingNote: "No sourced USD/NGN rate is used, so the saving against a generator is not converted. Compare per kWh.",
    },
    summary,
  }
}
