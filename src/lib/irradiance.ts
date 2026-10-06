/**
 * Sunlight on the Surulere rooftops: hourly global horizontal irradiance (GHI).
 *
 * Primary source: the free Open-Meteo forecast API (no key). Its `shortwave_radiation`
 * is GHI in W/m², averaged over the preceding hour, from numerical weather models.
 * It is a forecast/model analysis, not a pyranometer measurement.
 * Docs (checked 2026-10-06): https://open-meteo.com/en/docs
 *
 * Fallback: the app's existing half-sine clear-sky curve, scaled to 1000 W/m² at
 * solar noon. With no weather data we assume a clear sky, which makes the
 * plausibility bound looser, never tighter. The source is labelled "modeled".
 *
 * Pure apart from `fetchSky`, which takes an injectable fetch so tests run offline.
 */

import { NEIGHBORHOOD, clearSkyShape } from "./seed"

export const LOCATION = { name: "Surulere, Lagos", latitude: 6.5, longitude: 3.35, timezone: "Africa/Lagos" } as const

/** Lagos is UTC+1 all year (WAT, no daylight saving). */
const WAT_OFFSET_MS = 60 * 60 * 1000
/** Clear-sky GHI at solar noon used by the fallback (W/m²); standard test condition irradiance. */
export const CLEAR_SKY_PEAK_GHI = 1000
export const FETCH_TIMEOUT_MS = 3000
export const REVALIDATE_SECONDS = 30 * 60

export type SkySource = "Open-Meteo" | "modeled"

export type SkyHour = {
  /** Start of the hour, minutes after today's WAT midnight (≥ 1440 is tomorrow). */
  start: number
  /** Mean GHI over the hour, W/m². */
  ghi: number
  /** Cloud cover in %, when known. */
  cloud: number | null
}

export type Sky = {
  source: SkySource
  /** WAT date the minutes are relative to, YYYY-MM-DD. */
  date: string
  sunrise: number
  sunset: number
  hours: SkyHour[]
  /** Why this source was used. */
  note: string
}

/** WAT calendar date and minute of the day. */
export function watClock(now: Date = new Date()) {
  const iso = new Date(now.getTime() + WAT_OFFSET_MS).toISOString()
  const date = iso.slice(0, 10)
  const minute = Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) + Number(iso.slice(17, 19)) / 60
  return { date, minute }
}

const meanShape = (start: number) => {
  // Average the clear-sky shape over the hour (4 samples, mid-points of 15-minute slots).
  let sum = 0
  for (let i = 0; i < 4; i++) sum += clearSkyShape(((start + 7.5 + i * 15) % 1440 + 1440) % 1440)
  return sum / 4
}

/** Clear-sky fallback for today and tomorrow. */
export function modeledSky(date: string, note = "No weather data; assuming a clear sky."): Sky {
  return {
    source: "modeled",
    date,
    sunrise: NEIGHBORHOOD.sunriseMinutes,
    sunset: NEIGHBORHOOD.sunsetMinutes,
    hours: Array.from({ length: 48 }, (_, h) => ({
      start: h * 60,
      ghi: Math.round(CLEAR_SKY_PEAK_GHI * meanShape(h * 60)),
      cloud: null,
    })),
    note,
  }
}

const minuteOf = (localIso: string, date: string) => {
  // "2026-10-06T07:00" → minutes relative to `date` midnight.
  const day = Math.round((Date.parse(`${localIso.slice(0, 10)}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000)
  return day * 1440 + Number(localIso.slice(11, 13)) * 60 + Number(localIso.slice(14, 16))
}

type OpenMeteoBody = {
  hourly?: { time?: unknown; shortwave_radiation?: unknown; cloud_cover?: unknown }
  daily?: { time?: unknown; sunrise?: unknown; sunset?: unknown }
}

/** Parse an Open-Meteo forecast body into a Sky for `date`. Throws on anything unexpected. */
export function parseOpenMeteo(body: unknown, date: string): Sky {
  const b = body as OpenMeteoBody
  const time = b?.hourly?.time
  const ghi = b?.hourly?.shortwave_radiation
  const cloud = b?.hourly?.cloud_cover
  if (!Array.isArray(time) || !Array.isArray(ghi) || time.length === 0 || time.length !== ghi.length) {
    throw new Error("Open-Meteo response has no hourly irradiance")
  }
  const hours: SkyHour[] = []
  for (let i = 0; i < time.length; i++) {
    const g = ghi[i]
    if (typeof time[i] !== "string" || typeof g !== "number" || !Number.isFinite(g) || g < 0 || g > 1500) continue
    // Open-Meteo stamps the END of the averaging hour.
    const start = minuteOf(time[i] as string, date) - 60
    if (start < 0 || start >= 2880) continue
    const c = Array.isArray(cloud) && typeof cloud[i] === "number" ? (cloud[i] as number) : null
    hours.push({ start, ghi: g, cloud: c })
  }
  if (!hours.some((h) => h.start < 1440) || hours.filter((h) => h.start < 1440).length < 20) {
    throw new Error(`Open-Meteo response does not cover ${date}`)
  }

  let sunrise: number = NEIGHBORHOOD.sunriseMinutes
  let sunset: number = NEIGHBORHOOD.sunsetMinutes
  const days = b?.daily?.time
  const rises = b?.daily?.sunrise
  const sets = b?.daily?.sunset
  if (Array.isArray(days) && Array.isArray(rises) && Array.isArray(sets)) {
    const i = days.indexOf(date)
    if (i >= 0 && typeof rises[i] === "string" && typeof sets[i] === "string") {
      const r = minuteOf(rises[i], date)
      const s = minuteOf(sets[i], date)
      if (r > 0 && s > r && s < 1440) {
        sunrise = r
        sunset = s
      }
    }
  }
  return { source: "Open-Meteo", date, sunrise, sunset, hours: hours.sort((a, b) => a.start - b.start), note: "Open-Meteo forecast irradiance for Surulere." }
}

export function openMeteoUrl() {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    hourly: "shortwave_radiation,cloud_cover",
    daily: "sunrise,sunset",
    timezone: LOCATION.timezone,
    past_days: "1",
    forecast_days: "2",
  })
  return `https://api.open-meteo.com/v1/forecast?${params}`
}

type FetchLike = (input: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>

/**
 * Today's sky for Surulere. Never throws: any failure or a response slower than
 * `timeoutMs` falls back to the modeled clear sky.
 */
export async function fetchSky({
  now = new Date(),
  fetchImpl = fetch as FetchLike,
  timeoutMs = FETCH_TIMEOUT_MS,
}: { now?: Date; fetchImpl?: FetchLike; timeoutMs?: number } = {}): Promise<Sky> {
  const { date } = watClock(now)
  try {
    const res = await fetchImpl(openMeteoUrl(), {
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`)
    return parseOpenMeteo(await res.json(), date)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return modeledSky(date, `Open-Meteo unavailable (${reason}); assuming a clear sky.`)
  }
}

/** Irradiation on a horizontal square metre from midnight until `minute`, in Wh/m². */
export function insolationUntil(sky: Sky, minute: number) {
  let wh = 0
  for (const h of sky.hours) {
    if (h.start >= minute || h.start >= 1440) continue
    wh += h.ghi * (Math.min(60, minute - h.start) / 60)
  }
  return wh
}

/** The hour that contains `minute`. */
export const hourAt = (sky: Sky, minute: number) => sky.hours.find((h) => minute >= h.start && minute < h.start + 60)
