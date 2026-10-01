import { getMarketSnapshot } from "@/lib/chain/server"

export async function GET() {
  try {
    const snapshot = await getMarketSnapshot()
    return Response.json(snapshot, {
      headers: { "Cache-Control": "public, s-maxage=3, stale-while-revalidate=10" },
    })
  } catch (error) {
    console.error("market snapshot failed", error)
    return Response.json(
      { error: "Unable to reach Celo Sepolia. Try again in a moment." },
      { status: 502 },
    )
  }
}
