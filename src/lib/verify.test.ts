import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { skyForecast, suggestPrice } from "./forecast"
import { fetchSky, insolationUntil, modeledSky, parseOpenMeteo, watClock, type Sky } from "./irradiance"
import { PERFORMANCE_RATIO, SELF_CONSUMPTION_FLOOR_W, physicalBound, verifyReading } from "./verify"

/** A fixed sunny day: 06:45 sunrise, 18:45 sunset, 800 W/m² from 10:00 to 15:00. */
function sunnySky(): Sky {
  const hours = Array.from({ length: 48 }, (_, h) => {
    const local = h % 24
    const ghi = local >= 10 && local < 15 ? 800 : local >= 7 && local < 18 ? 300 : 0
    return { start: h * 60, ghi, cloud: 20 }
  })
  return { source: "Open-Meteo", date: "2026-10-06", sunrise: 6 * 60 + 45, sunset: 18 * 60 + 45, hours, note: "test" }
}

const NOON = 12 * 60
const PEERS = [1500, 2000, 2500, 1800, 2200, 2100]

describe("verifyReading", () => {
  it("accepts a normal midday reading", () => {
    const v = verifyReading({ wh: 2000, kWp: 5, minute: NOON, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.verdict, "accept")
    assert.ok(v.risk < 0.4, `risk ${v.risk}`)
    assert.ok(v.checks.every((c) => c.status === "pass"))
  })

  it("rejects before sunrise", () => {
    const v = verifyReading({ wh: 500, kWp: 5, minute: 5 * 60, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.verdict, "reject")
    assert.equal(v.risk, 1)
    assert.match(v.reasons[0], /before sunrise/)
  })

  it("rejects after sunset", () => {
    const v = verifyReading({ wh: 500, kWp: 5, minute: 21 * 60, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.verdict, "reject")
    assert.match(v.reasons[0], /after sunset/)
  })

  it("rejects a reading above the physical bound and says how much fits", () => {
    // By 12:00: 300 × 3 h (07–10) + 800 × 2 h = 2500 Wh/m². 2 kWp × 2500 × 0.8 = 4000 Wh,
    // minus 300 W × 5.25 h = 1575 Wh floor → 2425 Wh bound.
    const v = verifyReading({ wh: 5000, kWp: 2, minute: NOON, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.producedWh, 4000)
    assert.equal(v.floorWh, 1575)
    assert.equal(v.boundWh, 2425)
    assert.equal(v.verdict, "reject")
    assert.match(v.reasons[0], /more than a 2 kWp roof could spare/)
    assert.match(v.reasons[0], /up to 2\.4 kWh/)
  })

  it("rejects when today's earlier listings plus this one exceed the bound", () => {
    const sky = sunnySky()
    const alone = verifyReading({ wh: 2000, kWp: 5, minute: NOON, sky, listedTodayWh: 0, peerWh: PEERS })
    assert.notEqual(alone.verdict, "reject")
    const cumulative = verifyReading({ wh: 2000, kWp: 5, minute: NOON, sky, listedTodayWh: alone.boundWh - 1000, peerWh: PEERS })
    assert.equal(cumulative.verdict, "reject")
    assert.match(cumulative.reasons[0], /already claimed today/)
    assert.equal(cumulative.headroomWh, 1000)
  })

  it("flags a peer outlier without rejecting it on its own", () => {
    const v = verifyReading({ wh: 6000, kWp: 15, minute: 15 * 60, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    const peer = v.checks.find((c) => c.id === "peer")!
    assert.equal(peer.status, "warn")
    assert.equal(peer.score, 1)
    assert.notEqual(v.verdict, "reject")
  })

  it("skips the peer check with too few listings and clamps kWp", () => {
    const v = verifyReading({ wh: 1000, kWp: 99, minute: NOON, sky: sunnySky(), listedTodayWh: null, peerWh: [1000] })
    assert.equal(v.kWp, 15)
    assert.equal(v.checks.find((c) => c.id === "peer")!.status, "skip")
    assert.ok(v.reasons.some((r) => /connect a wallet/.test(r)))
  })

  it("adds low-sun risk near sunset", () => {
    const v = verifyReading({ wh: 2000, kWp: 5, minute: 18 * 60 + 15, sky: sunnySky(), listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.checks.find((c) => c.id === "time")!.status, "warn")
    assert.equal(v.risk, 0.05) // 0.15 × (1 − 30/45)
    assert.equal(v.verdict, "accept")
  })
})

describe("physical bound", () => {
  it("is kWp × insolation × PR minus the self-consumption floor", () => {
    const sky = sunnySky()
    const b = physicalBound(sky, 5, NOON)
    const insolation = insolationUntil(sky, NOON)
    assert.equal(insolation, 2500)
    assert.equal(b.producedWh, 5 * 2500 * PERFORMANCE_RATIO)
    assert.equal(b.floorWh, SELF_CONSUMPTION_FLOOR_W * 5.25)
  })

  it("counts a partial current hour", () => {
    assert.equal(insolationUntil(sunnySky(), 12 * 60 + 30), 2500 + 400)
  })
})

describe("weather fetch", () => {
  const now = new Date("2026-10-06T11:00:00Z") // 12:00 WAT

  it("falls back to the modeled clear sky when the fetch fails", async () => {
    const sky = await fetchSky({ now, fetchImpl: async () => Promise.reject(new Error("offline")) })
    assert.equal(sky.source, "modeled")
    assert.match(sky.note, /offline/)
    assert.equal(sky.date, "2026-10-06")
    // Still usable: a normal reading verifies against the clear-sky bound.
    const v = verifyReading({ wh: 2000, kWp: 5, minute: NOON, sky, listedTodayWh: 0, peerWh: PEERS })
    assert.equal(v.source, "modeled")
    assert.equal(v.verdict, "accept")
    assert.ok(v.reasons.some((r) => /assumed a clear sky/.test(r)))
  })

  it("falls back when the API is slower than the timeout", async () => {
    const slow = (_: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("timed out"))))
    const started = Date.now()
    const sky = await fetchSky({ now, fetchImpl: slow, timeoutMs: 50 })
    assert.equal(sky.source, "modeled")
    assert.ok(Date.now() - started < 2000)
  })

  it("falls back on an HTTP error or a malformed body", async () => {
    const http500 = await fetchSky({ now, fetchImpl: async () => new Response("nope", { status: 500 }) })
    assert.equal(http500.source, "modeled")
    const junk = await fetchSky({ now, fetchImpl: async () => Response.json({ hourly: { time: [] } }) })
    assert.equal(junk.source, "modeled")
  })

  it("parses Open-Meteo hourly irradiance, shifting hour-ending stamps to hour starts", async () => {
    const time = Array.from({ length: 48 }, (_, h) => `2026-10-0${6 + Math.floor(h / 24)}T${String(h % 24).padStart(2, "0")}:00`)
    const body = {
      hourly: { time, shortwave_radiation: time.map((_, h) => (h % 24 === 13 ? 700 : 0)), cloud_cover: time.map(() => 40) },
      daily: { time: ["2026-10-06", "2026-10-07"], sunrise: ["2026-10-06T06:44", "2026-10-07T06:44"], sunset: ["2026-10-06T18:41", "2026-10-07T18:41"] },
    }
    const sky = await fetchSky({ now, fetchImpl: async () => Response.json(body) })
    assert.equal(sky.source, "Open-Meteo")
    assert.equal(sky.sunrise, 6 * 60 + 44)
    assert.equal(sky.sunset, 18 * 60 + 41)
    // The 13:00 stamp is the mean over 12:00–13:00.
    assert.equal(sky.hours.find((h) => h.start === 12 * 60)!.ghi, 700)
    assert.equal(insolationUntil(sky, 13 * 60), 700)
  })

  it("rejects a body that does not cover today", () => {
    assert.throws(() => parseOpenMeteo({ hourly: { time: ["2026-10-01T10:00"], shortwave_radiation: [500] } }, "2026-10-06"))
  })

  it("converts to WAT", () => {
    assert.deepEqual(watClock(new Date("2026-10-06T23:30:00Z")), { date: "2026-10-07", minute: 30 })
  })
})

describe("forecast from irradiance", () => {
  it("gives a band that contains the estimate and widens with cloud cover", () => {
    const points = skyForecast(sunnySky(), NOON, 5, 4)
    assert.equal(points.length, 4)
    for (const p of points) assert.ok(p.band[0] <= p.kwh && p.kwh <= p.band[1])
    assert.equal(points[0].kwh, (5 * 800 * PERFORMANCE_RATIO) / 1000)
    const cloudy = sunnySky()
    cloudy.hours = cloudy.hours.map((h) => ({ ...h, cloud: 100 }))
    const [clear] = points
    const [overcast] = skyForecast(cloudy, NOON, 5, 1)
    assert.ok(overcast.band[1] - overcast.band[0] > clear.band[1] - clear.band[0])
  })

  it("uses a wide band on the modeled sky", () => {
    const [p] = skyForecast(modeledSky("2026-10-06"), NOON, 5, 1)
    assert.ok(p.band[0] < p.kwh * 0.5)
  })

  it("lets live supply drive the price adjustment", () => {
    const trades = Array.from({ length: 10 }, () => ({ price: 0.13 }))
    const scarce = suggestPrice(trades, NOON, { supplyKw: 0.5 })
    const plenty = suggestPrice(trades, NOON, { supplyKw: 500 })
    assert.ok(scarce.price > plenty.price)
  })
})
