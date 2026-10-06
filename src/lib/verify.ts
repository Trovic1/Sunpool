/**
 * Reading verification: the anomaly check a meter reading must pass before the
 * simulated meter signs it. Pure and deterministic, so it runs the same in the
 * route handlers, in the browser (offline demo) and in unit tests.
 *
 * How it decides (three explainable checks, no trained model):
 *
 * 1. Time of day. A reading must be taken between sunrise and sunset. Outside
 *    daylight: hard reject. In the first or last 45 minutes the sun is low, which
 *    adds a little risk.
 * 2. Physical bound. A roof of `kWp` cannot have produced more than
 *    kWp × (irradiation since midnight in kWh/m² ÷ 1 kW/m²) × performance ratio.
 *    Subtract a household self-consumption floor, then subtract what this seller
 *    already listed today (read from Celo, not from server memory). The new reading
 *    plus earlier listings must fit inside that bound: hard reject if not. Using
 *    most of the bound raises risk, because a home normally uses more than the floor.
 * 3. Peer comparison. The z-score of the requested Wh against recent listings by
 *    other sellers. An outlier raises risk; it never rejects on its own.
 *
 * risk = 0.60 × bound usage + 0.25 × peer outlier + 0.15 × low sun, each in 0–1.
 * Verdict: reject on a hard rule or risk ≥ 0.70, review at ≥ 0.40, else accept.
 */

import { insolationUntil, type Sky } from "./irradiance"

/**
 * Performance ratio: share of the nameplate × irradiance energy a real system
 * delivers after temperature, soiling, wiring and inverter losses. NREL PVWatts
 * assumes 14% system losses by default before temperature losses
 * (https://pvwatts.nrel.gov/downloads/pvwattsv5.pdf), and Reich et al., "Performance
 * ratio revisited", Prog. Photovolt. 20 (2012), report typical PR of roughly 0.7–0.9.
 * Heat lowers PR in Lagos, so 0.8 is on the generous side for an upper bound.
 */
export const PERFORMANCE_RATIO = 0.8

export const KWP_MIN = 1
export const KWP_MAX = 15
export const KWP_DEFAULT = 5

/**
 * Self-consumption floor: the minimum a home with solar uses during daylight
 * (fridge, fans, lights, phones). 300 W is deliberately low, so honest sellers are
 * not refused; the seeded Surulere homes use 0.7–1.8 kW in the day.
 */
export const SELF_CONSUMPTION_FLOOR_W = 300

/** Minutes after sunrise and before sunset that count as "low sun". */
export const LOW_SUN_MINUTES = 45
/** Fewer peer listings than this and the peer check is skipped. */
export const MIN_PEERS = 5

export const WEIGHTS = { bound: 0.6, peer: 0.25, lowSun: 0.15 } as const
export const THRESHOLDS = { review: 0.4, reject: 0.7 } as const

export type Verdict = "accept" | "review" | "reject"
export type CheckStatus = "pass" | "warn" | "fail" | "skip"

export type Check = {
  id: "time" | "bound" | "peer"
  label: string
  status: CheckStatus
  /** 0–1 contribution before weighting. */
  score: number
  detail: string
}

export type VerifyInput = {
  /** Requested reading, Wh. */
  wh: number
  /** Declared rooftop size, kWp (clamped to KWP_MIN–KWP_MAX). */
  kWp: number
  /** Minute of the WAT day the reading is taken. */
  minute: number
  sky: Sky
  /** Wh this seller already listed today, or null when unknown (no wallet in a dry run). */
  listedTodayWh: number | null
  /** Recent listing sizes by other sellers, Wh. */
  peerWh: number[]
}

export type Verification = {
  verdict: Verdict
  /** 0–1, two decimals. */
  risk: number
  /** Human-readable reasons, most important first. */
  reasons: string[]
  checks: Check[]
  kWp: number
  wh: number
  /** Energy the roof could have produced so far today, Wh. */
  producedWh: number
  /** Self-consumption floor so far today, Wh. */
  floorWh: number
  /** Most this seller can list today in total, Wh. */
  boundWh: number
  listedTodayWh: number
  /** What is left to list today, Wh. */
  headroomWh: number
  source: Sky["source"]
  sunrise: number
  sunset: number
}

export const clampKwp = (kWp: number) =>
  Number.isFinite(kWp) ? Math.min(KWP_MAX, Math.max(KWP_MIN, kWp)) : KWP_DEFAULT

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const kwh = (wh: number) => (wh / 1000).toFixed(1)
const hhmm = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(Math.floor(minute % 60)).padStart(2, "0")}`

/** Most a roof could have produced today until `minute`, and the floor it used itself. */
export function physicalBound(sky: Sky, kWp: number, minute: number) {
  const insolation = insolationUntil(sky, minute) // Wh/m²
  // kWp is rated at 1000 W/m², so kWp × (Wh/m² ÷ 1000 W/m²) is kWh; × 1000 → Wh.
  const producedWh = kWp * insolation * PERFORMANCE_RATIO
  const daylightMinutes = Math.max(0, Math.min(minute, sky.sunset) - sky.sunrise)
  const floorWh = (SELF_CONSUMPTION_FLOOR_W * daylightMinutes) / 60
  return { producedWh, floorWh, boundWh: Math.max(0, producedWh - floorWh) }
}

function stats(values: number[]) {
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, values.length - 1)
  return { mean, std: Math.sqrt(variance) }
}

export function verifyReading(input: VerifyInput): Verification {
  const { wh, minute, sky } = input
  const kWp = clampKwp(input.kWp)
  const listedTodayWh = Math.max(0, input.listedTodayWh ?? 0)
  const checks: Check[] = []
  const hard: string[] = []

  // 1. Time of day -----------------------------------------------------------
  const daylight = minute > sky.sunrise && minute < sky.sunset
  let lowSun = 0
  if (!daylight) {
    hard.push(
      minute <= sky.sunrise
        ? `It is before sunrise (${hhmm(sky.sunrise)} WAT): no solar surplus has been produced yet today.`
        : `It is after sunset (${hhmm(sky.sunset)} WAT): a new surplus reading is only issued in daylight.`,
    )
    checks.push({ id: "time", label: "Time of day", status: "fail", score: 1, detail: hard[hard.length - 1] })
  } else {
    const edge = Math.min(minute - sky.sunrise, sky.sunset - minute)
    lowSun = clamp01(1 - edge / LOW_SUN_MINUTES)
    checks.push({
      id: "time",
      label: "Time of day",
      status: lowSun > 0 ? "warn" : "pass",
      score: lowSun,
      detail:
        lowSun > 0
          ? `Low sun: within ${LOW_SUN_MINUTES} minutes of ${minute - sky.sunrise < sky.sunset - minute ? "sunrise" : "sunset"}.`
          : `Daylight (sunrise ${hhmm(sky.sunrise)}, sunset ${hhmm(sky.sunset)} WAT).`,
    })
  }

  // 2. Physical bound ----------------------------------------------------------
  const { producedWh, floorWh, boundWh } = physicalBound(sky, kWp, Math.min(minute, 1440))
  const total = listedTodayWh + wh
  const usage = boundWh > 0 ? total / boundWh : Infinity
  const headroomWh = Math.max(0, Math.floor(boundWh - listedTodayWh))
  const boundScore = usage <= 0.5 ? 0 : clamp01((usage - 0.5) / 0.5)
  const already = listedTodayWh > 0 ? ` plus ${kwh(listedTodayWh)} kWh already claimed today` : ""
  if (usage > 1) {
    const detail =
      boundWh <= 0
        ? `A ${kWp} kWp roof has not produced more than the home uses yet today.`
        : `${kwh(wh)} kWh${already} is more than a ${kWp} kWp roof could spare so far today (${kwh(boundWh)} kWh). ${
            headroomWh >= 100
              ? `You can list up to ${(Math.floor(headroomWh / 100) / 10).toFixed(1)} kWh now.`
              : "Nothing is left to list right now."
          }`
    if (daylight) hard.push(detail)
    checks.push({ id: "bound", label: "Physical limit", status: "fail", score: 1, detail })
  } else {
    checks.push({
      id: "bound",
      label: "Physical limit",
      status: boundScore >= 0.67 ? "warn" : "pass",
      score: boundScore,
      detail: `${kwh(total)} of ${kwh(boundWh)} kWh a ${kWp} kWp roof could spare so far today (${Math.round(usage * 100)}%).`,
    })
  }

  // 3. Peer comparison ---------------------------------------------------------
  let peerScore = 0
  if (input.peerWh.length < MIN_PEERS) {
    checks.push({
      id: "peer",
      label: "Compared with neighbours",
      status: "skip",
      score: 0,
      detail: `Skipped: only ${input.peerWh.length} recent listings by other sellers (needs ${MIN_PEERS}).`,
    })
  } else {
    const { mean, std } = stats(input.peerWh)
    // Floor the spread so a handful of identical listings cannot make every new size an outlier.
    const spread = Math.max(std, 0.25 * mean, 200)
    const z = (wh - mean) / spread
    peerScore = clamp01((z - 1) / 2) // z ≤ 1 → 0, z ≥ 3 → 1
    checks.push({
      id: "peer",
      label: "Compared with neighbours",
      status: peerScore >= 0.5 ? "warn" : "pass",
      score: peerScore,
      detail: `${kwh(wh)} kWh vs a typical ${kwh(mean)} kWh across ${input.peerWh.length} recent listings (z = ${z.toFixed(1)}).`,
    })
  }

  const weighted = WEIGHTS.bound * boundScore + WEIGHTS.peer * peerScore + WEIGHTS.lowSun * lowSun
  const risk = Math.round((hard.length ? 1 : clamp01(weighted)) * 100) / 100
  const verdict: Verdict = hard.length || risk >= THRESHOLDS.reject ? "reject" : risk >= THRESHOLDS.review ? "review" : "accept"

  const reasons = hard.length
    ? hard
    : checks
        .filter((c) => c.status === "warn" || c.status === "fail")
        .sort((a, b) => b.score - a.score)
        .map((c) => c.detail)
  if (!reasons.length) {
    reasons.push(
      input.peerWh.length >= MIN_PEERS
        ? "In daylight, within what the roof could spare so far today, and in line with neighbours."
        : "In daylight and within what the roof could spare so far today. Too few recent listings to compare with neighbours.",
    )
  }
  if (input.listedTodayWh === null) reasons.push("Your earlier listings today are not included: connect a wallet.")
  if (sky.source === "modeled") reasons.push("No live weather: assumed a clear sky, so the limit is looser than usual.")

  return {
    verdict,
    risk,
    reasons,
    checks,
    kWp,
    wh,
    producedWh: Math.round(producedWh),
    floorWh: Math.round(floorWh),
    boundWh: Math.round(boundWh),
    listedTodayWh,
    headroomWh,
    source: sky.source,
    sunrise: sky.sunrise,
    sunset: sky.sunset,
  }
}
