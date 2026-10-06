import { getCertificateLedger } from "@/lib/chain/certificates"

export async function GET() {
  try {
    const ledger = await getCertificateLedger()
    return Response.json(ledger, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30" },
    })
  } catch (error) {
    console.error("certificate ledger failed", error)
    return Response.json(
      { error: "Unable to read certificates from Celo Sepolia. Try again in a moment." },
      { status: 502 },
    )
  }
}
