import { getMarketSnapshot } from "@/lib/chain/server"
import { skyForecast, suggestPrice } from "@/lib/forecast"
import { LOCATION, fetchSky, watClock } from "@/lib/irradiance"
import { TOTAL_PANEL_KW, seedTrades } from "@/lib/seed"
import { KWP_DEFAULT, PERFORMANCE_RATIO, clampKwp } from "@/lib/verify"

/**
 * Generation forecast and suggested price, from live irradiance when available.
 * GET /api/forecast?kWp=5&hours=12
 */

const TRADES_TIMEOUT_MS = 2500

async function recentTrades(minute: number) {
  try {
    const snapshot = await Promise.race([
      getMarketSnapshot(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TRADES_TIMEOUT_MS)),
    ])
    if (snapshot.trades.length >= 5) return { trades: snapshot.trades, basis: "on-chain trades" as const }
  } catch {
    // Fall through to the seeded Lagos price band.
  }
  return { trades: seedTrades(minute), basis: "seeded Lagos price band (fewer than 5 on-chain trades)" as const }
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const kWp = clampKwp(Number(params.get("kWp") ?? KWP_DEFAULT))
  const hours = Math.min(24, Math.max(1, Math.round(Number(params.get("hours") ?? 12)) || 12))

  const now = new Date()
  const { minute } = watClock(now)
  const [sky, { trades, basis }] = await Promise.all([fetchSky({ now }), recentTrades(minute)])

  const rooftop = skyForecast(sky, minute, kWp, hours)
  const neighbourhood = skyForecast(sky, minute, TOTAL_PANEL_KW, 2)
  // Next full hour of neighbourhood supply, in kW (kWh over one hour).
  const nextHourSupplyKw = neighbourhood[1]?.kwh ?? neighbourhood[0]?.kwh ?? 0
  const price = suggestPrice(trades, minute, { supplyKw: nextHourSupplyKw })

  return Response.json(
    {
      location: LOCATION,
      source: sky.source,
      sourceNote: sky.note,
      generatedAt: now.toISOString(),
      minute: Math.round(minute),
      sunrise: sky.sunrise,
      sunset: sky.sunset,
      kWp,
      performanceRatio: PERFORMANCE_RATIO,
      method:
        sky.source === "Open-Meteo"
          ? "kWh = kWp × GHI/1000 × PR per hour. Band: ±(10% + 3%/hour ahead + up to 25% for cloud cover)."
          : "No live weather: 75% of the clear-sky curve, band 30–100% of clear sky.",
      points: rooftop,
      totalKwh: Math.round(rooftop.reduce((s, p) => s + p.kwh, 0) * 100) / 100,
      price: {
        suggested: price.price,
        median: price.median,
        sampleSize: price.sampleSize,
        basis,
        nextHourSupplyKw: Math.round(nextHourSupplyKw * 100) / 100,
        buyerDemandKw: Math.round(price.demandKw * 100) / 100,
        adjustment: Math.round(price.adjustment * 1000) / 1000,
        reason: price.reason,
      },
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  )
}
