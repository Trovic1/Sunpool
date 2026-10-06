import { isAddress, type Address } from "viem"

import { KWP_DEFAULT } from "@/lib/verify"
import { verifyWithLiveData } from "@/lib/verify-server"

/**
 * Dry run of the reading check. Nothing is signed. Body: { seller?, wh, kWp? }.
 * Same logic as /api/readings, so the Sell form can show the verdict before signing.
 */
export async function POST(request: Request) {
  let body: { seller?: string; wh?: number; kWp?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send JSON with wh, and optionally seller and kWp." }, { status: 400 })
  }
  const { seller, wh, kWp } = body
  if (typeof wh !== "number" || !Number.isFinite(wh) || wh <= 0 || wh > 1_000_000) {
    return Response.json({ error: "wh must be a positive number of watt-hours." }, { status: 400 })
  }
  if (seller !== undefined && (typeof seller !== "string" || !isAddress(seller))) {
    return Response.json({ error: "seller must be an address." }, { status: 400 })
  }
  if (kWp !== undefined && (typeof kWp !== "number" || !Number.isFinite(kWp))) {
    return Response.json({ error: "kWp must be a number." }, { status: 400 })
  }

  const verification = await verifyWithLiveData({
    seller: seller as Address | undefined,
    wh: Math.round(wh),
    kWp: kWp ?? KWP_DEFAULT,
  })
  return Response.json(verification, { headers: { "Cache-Control": "no-store" } })
}
