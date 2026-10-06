/**
 * Transparent generation forecast and price suggestion.
 *
 * Model: clear-sky solar curve × forecast weather factor, corrected by an
 * exponentially smoothed ratio of actual to forecast output so far today.
 * The confidence band widens with the forecast horizon. No ML dependency.
 */

import {
  BUYERS,
  HOUSES,
  NEIGHBORHOOD,
  PEAK_KW_PER_KWP,
  PRICE_CEILING,
  PRICE_FLOOR,
  TOTAL_PANEL_KW,
  clearSkyShape,
  createRng,
  weatherFactor,
  type Trade,
} from "./seed"
import type { Sky } from "./irradiance"
import { PERFORMANCE_RATIO } from "./verify"

/** Smoothing weight for the actual/forecast ratio. */
export const SMOOTHING_ALPHA = 0.3
/** Band half-width: base share plus a share per hour ahead. */
export const BAND_BASE = 0.08
export const BAND_PER_HOUR = 0.025

export const CHART_START_MINUTE = 6 * 60
export const CHART_END_MINUTE = 19 * 60 + 30
export const CHART_STEP_MINUTES = 15

/**
 * The weather the forecast expected at dawn. It saw the afternoon shower
 * coming, but placed it later and milder than what actually happens.
 */
function forecastWeatherFactor(minute: number) {
  const hour = minute / 60
  const haze = hour < 9 ? 0.85 + (hour - 6.75) * 0.05 : 0.96
  const shower = 0.3 * Math.exp(-((hour - 16.25) ** 2) / (2 * 0.7 ** 2))
  return Math.max(0.4, Math.min(1, haze - shower))
}

const clearSkyKw = (minute: number) => TOTAL_PANEL_KW * PEAK_KW_PER_KWP * clearSkyShape(minute)

/** Simulated metered output for the whole neighborhood, in kW. */
export function actualKw(minute: number) {
  const noise = 1 + (createRng(minute * 7919)() - 0.5) * 0.08
  return clearSkyKw(minute) * weatherFactor(minute) * noise
}

export type GenerationPoint = {
  minute: number
  label: string
  /** Metered output so far, kW. Undefined for future points. */
  actual?: number
  /** Forecast output, kW. */
  forecast: number
  /** Confidence band [low, high], kW. Only for future points. */
  band?: [number, number]
}

export type GenerationSeries = {
  points: GenerationPoint[]
  /** kWh generated since sunrise. */
  generatedKwh: number
  /** kWh expected for the rest of the day. */
  remainingKwh: number
  /** Current smoothed correction applied to the naive forecast. */
  correction: number
}

export const minuteLabel = (minute: number) => {
  const h = Math.floor(minute / 60)
  const m = Math.floor(minute % 60)
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function buildGenerationSeries(nowMinute: number): GenerationSeries {
  const points: GenerationPoint[] = []
  let correction = 1
  let generatedKwh = 0
  let remainingKwh = 0
  const stepHours = CHART_STEP_MINUTES / 60

  for (let minute = CHART_START_MINUTE; minute <= CHART_END_MINUTE; minute += CHART_STEP_MINUTES) {
    const naive = clearSkyKw(minute) * forecastWeatherFactor(minute)

    if (minute <= nowMinute) {
      const actual = actualKw(minute)
      if (naive > 0.5) {
        correction = SMOOTHING_ALPHA * (actual / naive) + (1 - SMOOTHING_ALPHA) * correction
      }
      generatedKwh += actual * stepHours
      points.push({
        minute,
        label: minuteLabel(minute),
        actual: round2(actual),
        forecast: round2(naive),
      })
    } else {
      const forecast = naive * correction
      const hoursAhead = (minute - nowMinute) / 60
      const spread = forecast * (BAND_BASE + BAND_PER_HOUR * hoursAhead)
      remainingKwh += forecast * stepHours
      points.push({
        minute,
        label: minuteLabel(minute),
        forecast: round2(forecast),
        band: [round2(Math.max(0, forecast - spread)), round2(forecast + spread)],
      })
    }
  }

  // Start the band at the last metered point so it joins the actual line.
  const lastActual = [...points].reverse().find((p) => p.actual !== undefined)
  if (lastActual && lastActual.actual !== undefined) {
    lastActual.band = [lastActual.actual, lastActual.actual]
  }

  return { points, generatedKwh, remainingKwh, correction }
}

// ---------------------------------------------------------------------------
// Price suggestion
// ---------------------------------------------------------------------------

/** Neighborhood daytime demand in kW (all households). */
function demandKw(minute: number) {
  const base = HOUSES.reduce((sum, h) => sum + h.loadKw, 0)
  const hour = minute / 60
  const eveningRamp = hour > 16 ? 1 + (hour - 16) * 0.12 : 1
  return base * eveningRamp
}

export type PriceSuggestion = {
  price: number
  median: number
  sampleSize: number
  supplyKw: number
  demandKw: number
  adjustment: number
  reason: string
}

/**
 * `supplyKw` overrides the modeled next-hour neighbourhood supply, e.g. with one
 * derived from live irradiance (see `skyForecast`).
 */
export function suggestPrice(
  trades: Pick<Trade, "price">[],
  nowMinute: number,
  { supplyKw }: { supplyKw?: number } = {},
): PriceSuggestion {
  const recent = trades.slice(0, 20).map((t) => t.price).sort((a, b) => a - b)
  const median = recent.length
    ? recent.length % 2
      ? recent[(recent.length - 1) / 2]
      : (recent[recent.length / 2 - 1] + recent[recent.length / 2]) / 2
    : (PRICE_FLOOR + PRICE_CEILING) / 2

  const nextHour = nowMinute + 60
  const supply = supplyKw ?? clearSkyKw(nextHour) * forecastWeatherFactor(nextHour)
  const demand = demandKw(nextHour)
  // Buyers-only demand is what the market clears against.
  const buyerShare = BUYERS.reduce((sum, h) => sum + h.loadKw, 0) / HOUSES.reduce((s, h) => s + h.loadKw, 0)
  const marketDemand = demand * buyerShare
  const ratio = supply > 0 ? marketDemand / supply : 2
  const adjustment = Math.max(-0.05, Math.min(0.05, (ratio - 0.35) * 0.1))
  const price = Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, median * (1 + adjustment)))

  const direction =
    adjustment > 0.005 ? "above" : adjustment < -0.005 ? "below" : "at"
  const reason =
    direction === "at"
      ? `At the median of the last ${recent.length} trades. Supply and demand are balanced for the next hour.`
      : `${Math.abs(adjustment * 100).toFixed(1)}% ${direction} the median of the last ${recent.length} trades, because ${
          direction === "above" ? "forecast supply is falling" : "forecast supply exceeds buyer demand"
        } over the next hour.`

  return {
    price: Math.round(price * 1000) / 1000,
    median,
    sampleSize: recent.length,
    supplyKw: supply,
    demandKw: marketDemand,
    adjustment,
    reason,
  }
}

export const isDaylight = (minute: number) =>
  minute > NEIGHBORHOOD.sunriseMinutes && minute < NEIGHBORHOOD.sunsetMinutes

const round2 = (value: number) => Math.round(value * 100) / 100

// ---------------------------------------------------------------------------
// Forecast from irradiance (live Open-Meteo or the modeled clear sky)
// ---------------------------------------------------------------------------

/** Typical clear-sky share actually reached when only the modeled sky is known. */
export const MODELED_CLEARNESS = 0.75

export type SkyForecastPoint = {
  /** Start of the hour, minutes after today's WAT midnight. */
  start: number
  label: string
  /** Mean irradiance over the hour, W/m². */
  ghi: number
  cloud: number | null
  /** Expected energy from the given array in this hour, kWh. */
  kwh: number
  /** Confidence band [low, high], kWh. */
  band: [number, number]
}

/**
 * Hour-by-hour generation for an array of `kWp`, from the current hour onwards.
 *
 * Expected kWh = kWp × GHI/1000 × performance ratio × 1 h. With live weather the band
 * half-width is 10% + 3% per hour ahead + up to 25% for full cloud cover, because
 * forecast irradiance under cloud is least reliable. With the modeled sky the point
 * estimate is 75% of clear sky and the band runs from 30% to 100% of clear sky.
 */
export function skyForecast(sky: Sky, nowMinute: number, kWp: number, hours = 12): SkyForecastPoint[] {
  const first = Math.floor(nowMinute / 60) * 60
  return sky.hours
    .filter((h) => h.start >= first && h.start < first + hours * 60)
    .map((h) => {
      const clear = (kWp * h.ghi * PERFORMANCE_RATIO) / 1000
      let kwh: number
      let band: [number, number]
      if (sky.source === "modeled") {
        kwh = clear * MODELED_CLEARNESS
        band = [clear * 0.3, clear]
      } else {
        const ahead = Math.max(0, (h.start - nowMinute) / 60)
        const half = Math.min(0.9, 0.1 + 0.03 * ahead + 0.25 * ((h.cloud ?? 50) / 100))
        kwh = clear
        band = [clear * (1 - half), clear * (1 + half)]
      }
      return {
        start: h.start,
        label: minuteLabel(h.start % 1440),
        ghi: h.ghi,
        cloud: h.cloud,
        kwh: round2(kwh),
        band: [round2(band[0]), round2(band[1])],
      }
    })
}
