import { DATA_SOURCE } from "@/lib/chain/contracts"
import { getMarketSnapshot } from "@/lib/chain/server"
import { CURRENCY } from "@/lib/format"
import { fetchSky, watClock } from "@/lib/irradiance"
import { skyForecast } from "@/lib/forecast"
import { matchListings, parseMatchRequest, type MatchListing } from "@/lib/match"
import { HOUSES, houseById, seedListings } from "@/lib/seed"

/**
 * Ranked fill plan for a buyer request.
 * GET /api/match?kwh=5&maxPrice=0.13[&source=seeded|chain][&only=id,id]
 *
 * `only` limits the plan to those listing ids (the Market passes the offers it shows,
 * which leaves out the buyer's own listings and anything already bought).
 *
 * Listings come from Celo Sepolia, or from the seeded demo when NEXT_PUBLIC_DATA_SOURCE
 * is "seeded" (or `source=seeded` is passed, the same override the Market uses).
 */

const headers = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const parsed = parseMatchRequest(params.get("kwh"), params.get("maxPrice"))
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400, headers })

  const requested = params.get("source")
  const source: "seeded" | "chain" = requested === "seeded" || requested === "chain" ? requested : DATA_SOURCE

  const now = new Date()
  const { minute } = watClock(now)
  const sky = await fetchSky({ now })

  let listings: MatchListing[]
  // kWh each known panel array is still forecast to make today. Chain sellers have no
  // declared array size, so they are left out and scored as neutral.
  const sellerForecastKwh: Record<string, number> = {}
  let label = (id: string) => id

  if (source === "seeded") {
    listings = seedListings().map((l) => ({ id: l.id, sellerId: l.sellerId, kwh: l.kwh, price: l.price }))
    for (const house of HOUSES) {
      if (house.panelKw <= 0) continue
      sellerForecastKwh[house.id] = skyForecast(sky, minute, house.panelKw, 24)
        .filter((p) => p.start < 1440)
        .reduce((sum, p) => sum + p.kwh, 0)
    }
    label = (id) => houseById(id)?.name ?? id
  } else {
    try {
      const snapshot = await getMarketSnapshot()
      listings = snapshot.listings.map((l) => ({ id: l.id, sellerId: l.seller, kwh: l.wh / 1000, price: l.price }))
    } catch (error) {
      console.error("match: market snapshot failed", error)
      return Response.json({ error: "Unable to reach Celo Sepolia. Try again in a moment." }, { status: 502, headers })
    }
    label = (id) => (id.startsWith("0x") ? `${id.slice(0, 6)}…${id.slice(-4)}` : id)
  }

  const only = params.get("only")
  if (only !== null) {
    const ids = new Set(only.split(",").slice(0, 100))
    listings = listings.filter((l) => ids.has(l.id))
  }

  const plan = matchListings({
    kwh: parsed.kwh,
    maxPrice: parsed.maxPrice,
    listings,
    sellerForecastKwh,
    label,
    currency: CURRENCY,
  })

  return Response.json(
    {
      source,
      currency: CURRENCY,
      generatedAt: now.toISOString(),
      forecastSource: sky.source,
      method:
        "Cheapest first, whole listings. score = price × (1 + 5% × (1 − reliability)); reliability = seller's forecast kWh still to come today ÷ listed kWh, capped at 1, only where the panel size is known. Proximity is not scored: no location data exists.",
      ...plan,
    },
    { headers },
  )
}
