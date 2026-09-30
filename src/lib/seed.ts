/**
 * Seeded, simulated data for the Sunpool demo.
 *
 * Nothing in this file comes from a real meter. The UI labels it as simulated.
 * Production path: readings signed by certified smart meters or inverter APIs.
 *
 * Everything is deterministic (seeded PRNG), so server and client render the
 * same numbers and the demo looks the same every time it runs.
 */

export const NEIGHBORHOOD = {
  name: "Surulere",
  city: "Lagos",
  country: "Nigeria",
  timezone: "WAT",
  // Early-October sun times for Lagos (≈6.5° N), rounded to 5 minutes.
  sunriseMinutes: 6 * 60 + 45,
  sunsetMinutes: 18 * 60 + 45,
} as const

/**
 * Grid emission factor used for "estimated CO₂ avoided".
 * Nigeria, 2025: 455.71 gCO₂e/kWh (lifecycle), Ember Yearly Electricity Data
 * via Our World in Data, "Carbon intensity of electricity generation".
 * https://ourworldindata.org/grapher/carbon-intensity-electricity
 * This is an estimate: it assumes each traded kWh displaces an average grid kWh.
 */
export const EMISSION_FACTOR = {
  kgPerKwh: 0.456,
  label: "Nigeria grid, 2025",
  source: "Ember via Our World in Data",
  url: "https://ourworldindata.org/grapher/carbon-intensity-electricity",
} as const

/**
 * Typical Lagos specific yield is roughly 4.5–5.4 kWh per kWp per day
 * (NASA POWER-based estimates). We model 5.0 with a half-sine day curve.
 */
export const SPECIFIC_YIELD_KWH_PER_KWP = 5.0

export type House = {
  id: string
  name: string
  street: string
  /** Rooftop array size in kW. 0 means the household only buys. */
  panelKw: number
  /** Typical daytime consumption in kW. */
  loadKw: number
}

export const HOUSES: House[] = [
  { id: "H01", name: "Adebayo", street: "No. 4, Ogunlana Dr", panelKw: 5.2, loadKw: 1.1 },
  { id: "H02", name: "Okafor", street: "No. 11, Ogunlana Dr", panelKw: 3.6, loadKw: 0.9 },
  { id: "H03", name: "Balogun", street: "No. 2, Adelabu St", panelKw: 8.4, loadKw: 1.8 },
  { id: "H04", name: "Eze", street: "No. 17, Adelabu St", panelKw: 4.0, loadKw: 1.0 },
  { id: "H05", name: "Nwosu", street: "No. 9, Bode Thomas St", panelKw: 6.0, loadKw: 1.4 },
  { id: "H06", name: "Ogunleye", street: "No. 23, Bode Thomas St", panelKw: 2.8, loadKw: 0.7 },
  { id: "H07", name: "Bello", street: "No. 5, Akerele Ext", panelKw: 7.2, loadKw: 1.6 },
  { id: "H08", name: "Ibekwe", street: "No. 14, Akerele Ext", panelKw: 4.8, loadKw: 1.2 },
  { id: "H09", name: "Adeyemi", street: "No. 8, Ogunlana Dr", panelKw: 0, loadKw: 1.3 },
  { id: "H10", name: "Olawale", street: "No. 31, Adelabu St", panelKw: 0, loadKw: 0.8 },
  { id: "H11", name: "Chukwu", street: "No. 6, Bode Thomas St", panelKw: 0, loadKw: 1.5 },
  { id: "H12", name: "Danjuma", street: "No. 19, Akerele Ext", panelKw: 0, loadKw: 1.0 },
  { id: "H13", name: "Salami", street: "No. 27, Ogunlana Dr", panelKw: 0, loadKw: 1.2 },
  { id: "H14", name: "Obi", street: "No. 3, Adelabu St", panelKw: 0, loadKw: 0.9 },
]

export const SELLERS = HOUSES.filter((h) => h.panelKw > 0)
export const BUYERS = HOUSES.filter((h) => h.panelKw === 0)
export const TOTAL_PANEL_KW = SELLERS.reduce((sum, h) => sum + h.panelKw, 0)

/** The household the demo viewer acts as when buying. */
export const DEMO_BUYER: House = {
  id: "H15",
  name: "You",
  street: "Demo buyer",
  panelKw: 0,
  loadKw: 1.0,
}

/** The household the demo viewer acts as when listing surplus. */
export const DEMO_SELLER = HOUSES[0]

/** Price band for the seeded market, in cUSD per kWh. */
export const PRICE_FLOOR = 0.11
export const PRICE_CEILING = 0.15

export const houseById = (id: string) =>
  HOUSES.find((h) => h.id === id) ?? (id === DEMO_BUYER.id ? DEMO_BUYER : undefined)

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/** mulberry32: tiny, fast, seeded PRNG. Returns floats in [0, 1). */
export function createRng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(rng: () => number, items: readonly T[]) =>
  items[Math.floor(rng() * items.length)]

const round = (value: number, step: number) => Math.round(value / step) * step

const hex = (rng: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rng() * 16).toString(16)).join("")

// ---------------------------------------------------------------------------
// Solar curve
// ---------------------------------------------------------------------------

/**
 * Clear-sky output per kWp at a given minute of the day, as a fraction of the
 * daily peak. Half-sine between sunrise and sunset, zero at night.
 */
export function clearSkyShape(minute: number) {
  const { sunriseMinutes, sunsetMinutes } = NEIGHBORHOOD
  if (minute <= sunriseMinutes || minute >= sunsetMinutes) return 0
  const progress = (minute - sunriseMinutes) / (sunsetMinutes - sunriseMinutes)
  return Math.sin(Math.PI * progress)
}

/**
 * Peak kW per kWp so that the half-sine integrates to the daily specific yield:
 * yield = peak × (2 / π) × daylight hours.
 */
export const PEAK_KW_PER_KWP =
  (SPECIFIC_YIELD_KWH_PER_KWP * Math.PI) /
  (2 * ((NEIGHBORHOOD.sunsetMinutes - NEIGHBORHOOD.sunriseMinutes) / 60))

/**
 * Weather factor for today's simulated sky: a hazy morning, clear midday and a
 * typical October afternoon shower around 15:00–16:30.
 */
export function weatherFactor(minute: number) {
  const hour = minute / 60
  const haze = hour < 9 ? 0.82 + (hour - 6.75) * 0.06 : 0.95
  const shower = 0.45 * Math.exp(-((hour - 15.75) ** 2) / (2 * 0.55 ** 2))
  return Math.max(0.35, Math.min(1, haze - shower))
}

// ---------------------------------------------------------------------------
// Trades
// ---------------------------------------------------------------------------

export type TradeStatus = "settled" | "pending"

export type Trade = {
  id: string
  /** Minute of the simulated day (0–1439). */
  minute: number
  sellerId: string
  buyerId: string
  kwh: number
  /** cUSD per kWh */
  price: number
  readingId: string
  status: TradeStatus
}

export function makeReadingId(sellerId: string, minute: number, rng: () => number) {
  const hh = String(Math.floor(minute / 60)).padStart(2, "0")
  const mm = String(minute % 60).padStart(2, "0")
  return `RD-${sellerId}-${hh}${mm}-${hex(rng, 4)}`
}

/** One simulated trade at a given minute, sized to the solar curve. */
export function makeTrade(minute: number, rng: () => number, index: number): Trade {
  const seller = pick(rng, SELLERS)
  const buyer = pick(rng, BUYERS)
  const sun = clearSkyShape(minute) * weatherFactor(minute)
  const kwh = Math.max(0.2, round(0.2 + sun * 1.1 * (0.6 + rng() * 0.8), 0.1))
  // Prices drift up slightly when the sky is darker (less supply).
  const scarcity = 1 - weatherFactor(minute)
  const price = Math.min(
    PRICE_CEILING,
    Math.max(PRICE_FLOOR, round(0.122 + scarcity * 0.03 + (rng() - 0.5) * 0.012, 0.001)),
  )
  return {
    id: `T${String(index).padStart(4, "0")}`,
    minute,
    sellerId: seller.id,
    buyerId: buyer.id,
    kwh: Number(kwh.toFixed(1)),
    price: Number(price.toFixed(3)),
    readingId: makeReadingId(seller.id, minute, rng),
    status: "settled",
  }
}

/** Trades already settled today before the demo clock starts. */
export function seedTrades(untilMinute: number, seed = 20261005): Trade[] {
  const rng = createRng(seed)
  const trades: Trade[] = []
  let minute = NEIGHBORHOOD.sunriseMinutes + 40
  let index = 1
  while (minute < untilMinute) {
    trades.push(makeTrade(minute, rng, index++))
    // Busier around midday: gaps of roughly 5–14 minutes.
    const sun = clearSkyShape(minute)
    minute += Math.round(12 - sun * 7 + rng() * 2)
  }
  return trades.reverse() // newest first
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export type Listing = {
  id: string
  sellerId: string
  kwh: number
  price: number
  /** Listing is valid until this minute of the day. */
  untilMinute: number
  readingId: string
}

export function seedListings(seed = 7): Listing[] {
  const rng = createRng(seed)
  const rows: Array<[string, number, number, number]> = [
    ["H03", 6.4, 0.124, 16 * 60],
    ["H07", 4.8, 0.127, 15 * 60 + 30],
    ["H05", 3.2, 0.121, 15 * 60],
    ["H01", 2.5, 0.13, 17 * 60],
    ["H08", 1.8, 0.126, 14 * 60 + 30],
  ]
  return rows.map(([sellerId, kwh, price, untilMinute], i) => ({
    id: `L${String(i + 1).padStart(3, "0")}`,
    sellerId,
    kwh,
    price,
    untilMinute,
    readingId: makeReadingId(sellerId, 11 * 60 + 30 + i * 2, rng),
  }))
}

// ---------------------------------------------------------------------------
// Demo clock
// ---------------------------------------------------------------------------

export const DEMO_START_MINUTE = {
  live: 11 * 60 + 40,
  empty: 5 * 60 + 50,
  error: 11 * 60 + 40,
} as const

/** Real milliseconds per simulated minute on the demo clock. */
export const MS_PER_SIM_MINUTE = 1000
/** Real milliseconds between simulated trades arriving on the tape. */
export const TRADE_INTERVAL_MS = 5000
