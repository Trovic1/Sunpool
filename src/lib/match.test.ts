import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { GENERATOR, matchListings, parseMatchRequest, type MatchListing } from "./match"

const L = (id: string, kwh: number, price: number, sellerId = `S${id}`): MatchListing => ({ id, sellerId, kwh, price })

const LISTINGS = [L("a", 6.4, 0.124), L("b", 4.8, 0.127), L("c", 3.2, 0.121), L("d", 2.5, 0.13)]

describe("parseMatchRequest", () => {
  it("accepts kwh and optional maxPrice", () => {
    assert.deepEqual(parseMatchRequest("5", null), { ok: true, kwh: 5 })
    assert.deepEqual(parseMatchRequest("5.5", "0.13"), { ok: true, kwh: 5.5, maxPrice: 0.13 })
  })
  it("rejects bad kwh", () => {
    for (const bad of [null, "", "abc", "0", "-2", "Infinity", "5000"]) {
      assert.equal(parseMatchRequest(bad, null).ok, false, String(bad))
    }
  })
  it("rejects bad maxPrice", () => {
    assert.equal(parseMatchRequest("5", "x").ok, false)
    assert.equal(parseMatchRequest("5", "-1").ok, false)
  })
})

describe("matchListings", () => {
  it("covers the request at the lowest cost, not the biggest cheap offers", () => {
    const plan = matchListings({ kwh: 5, listings: LISTINGS })
    assert.equal(plan.status, "full")
    assert.deepEqual(plan.picks.map((p) => p.listingId), ["c", "d"])
    assert.ok(Math.abs(plan.filledKwh - 5.7) < 1e-9)
    assert.ok(Math.abs(plan.overshootKwh - 0.7) < 1e-9)
    assert.ok(Math.abs(plan.totalCost - (3.2 * 0.121 + 2.5 * 0.13)) < 1e-6)
    assert.ok(plan.picks[0].reasons[0].startsWith("Lowest price"))
  })

  it("uses one listing when it covers the request", () => {
    const plan = matchListings({ kwh: 3, listings: LISTINGS })
    assert.equal(plan.picks.length, 1)
    assert.equal(plan.picks[0].listingId, "c")
    assert.match(plan.summary, /One offer covers/)
  })

  it("returns a partial fill and says so when supply is short", () => {
    const plan = matchListings({ kwh: 50, listings: LISTINGS })
    assert.equal(plan.status, "partial")
    assert.equal(plan.picks.length, 4)
    assert.ok(Math.abs(plan.shortfallKwh - (50 - 16.9)) < 1e-9)
    assert.equal(plan.overshootKwh, 0)
    assert.match(plan.summary, /Only 16\.9 kWh/)
  })

  it("handles no listings", () => {
    const plan = matchListings({ kwh: 5, listings: [] })
    assert.equal(plan.status, "none")
    assert.equal(plan.picks.length, 0)
    assert.equal(plan.totalCost, 0)
    assert.equal(plan.avgPrice, null)
    assert.match(plan.summary, /No solar is listed/)
  })

  it("applies maxPrice", () => {
    const plan = matchListings({ kwh: 20, maxPrice: 0.125, listings: LISTINGS })
    assert.deepEqual(plan.picks.map((p) => p.listingId).sort(), ["a", "c"])
    assert.equal(plan.excludedByMaxPrice, 2)
    assert.equal(plan.status, "partial")
  })

  it("explains an empty result caused by maxPrice", () => {
    const plan = matchListings({ kwh: 2, maxPrice: 0.1, listings: LISTINGS })
    assert.equal(plan.status, "none")
    assert.match(plan.summary, /cheapest offer is 0\.121/)
  })

  it("ignores empty listings", () => {
    const plan = matchListings({ kwh: 1, listings: [L("z", 0, 0.01), L("a", 2, 0.12)] })
    assert.deepEqual(plan.picks.map((p) => p.listingId), ["a"])
  })

  it("lets a weak forecast move a near-equal seller down, but only slightly", () => {
    const listings = [L("a", 4, 0.121, "A"), L("b", 4, 0.122, "B")]
    const plan = matchListings({ kwh: 4, listings, sellerForecastKwh: { A: 0.5, B: 10 } })
    assert.equal(plan.picks[0].listingId, "b")
    assert.ok(plan.picks[1] === undefined)
    // A 5% cap: a much dearer but reliable seller does not jump a cheap one.
    const far = matchListings({
      kwh: 4,
      listings: [L("a", 4, 0.1, "A"), L("b", 4, 0.13, "B")],
      sellerForecastKwh: { A: 0, B: 10 },
    })
    assert.equal(far.picks[0].listingId, "a")
  })

  it("is neutral for sellers with no forecast and says so", () => {
    const plan = matchListings({ kwh: 1, listings: [L("a", 2, 0.12)] })
    assert.equal(plan.picks[0].reliability, 1)
    assert.ok(plan.picks[0].reasons.some((r) => r.includes("No panel forecast")))
  })

  it("reports the generator in naira per kWh without inventing an FX rate", () => {
    const plan = matchListings({ kwh: 3, listings: LISTINGS })
    assert.equal(plan.generator.ngnPerKwh, GENERATOR.ngnPerKwh)
    assert.equal(plan.generator.ngnPerKwh, 750)
    assert.equal(plan.generator.equivalentNgn, 3.2 * 750)
    assert.equal(plan.generator.saving, null)
  })

  it("computes saving against the average ask from real listings only", () => {
    const plan = matchListings({ kwh: 3, listings: LISTINGS })
    assert.ok(plan.savingVsAverageAsk !== null && plan.savingVsAverageAsk > 0)
    assert.equal(matchListings({ kwh: 1, listings: [L("a", 2, 0.12)] }).savingVsAverageAsk, null)
  })
})
