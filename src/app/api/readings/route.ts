import { randomBytes } from "node:crypto"

import { encodePacked, isAddress, keccak256, type Address } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { DEMO_METER_ID, EIP712_DOMAIN, READING_TYPES } from "@/lib/chain/contracts"
import { KWP_DEFAULT } from "@/lib/verify"
import { verifyWithLiveData } from "@/lib/verify-server"

/**
 * Simulated smart meter. Issues a reading for the caller's surplus and signs it with
 * the meter key registered in ReadingRegistry, but only after the reading passes the
 * verification check in src/lib/verify.ts (time of day, physical bound against
 * today's irradiance and the seller's on-chain listings, peer comparison).
 *
 * Production path: certified smart meters or inverter APIs sign readings on the
 * device, and this endpoint goes away. Until then the energy figures are simulated,
 * and the UI says so. See docs/THREAT_MODEL.md.
 */

const MIN_WH = 100
const MAX_WH = 10_000 // 10 kWh per reading; the physical bound below is usually tighter.
const MAX_PER_DAY = 25

/**
 * Cheap first gate, per server instance: readings issued today and their Wh. The
 * durable accounting is the seller's Listed events on Celo; this map also counts
 * readings signed but not listed yet, so a burst of requests cannot outrun the chain.
 */
const issued = new Map<string, { day: string; count: number; wh: number }>()

function todayEntry(seller: string) {
  const day = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10) // WAT date
  const entry = issued.get(seller)
  if (!entry || entry.day !== day) {
    const fresh = { day, count: 0, wh: 0 }
    issued.set(seller, fresh)
    return fresh
  }
  return entry
}

export async function POST(request: Request) {
  const key = process.env.METER_SIGNER_PRIVATE_KEY
  if (!key) {
    return Response.json({ error: "The simulated meter is not configured on this server." }, { status: 503 })
  }

  let body: { seller?: string; wh?: number; kWp?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send JSON with seller and wh." }, { status: 400 })
  }

  const { seller, wh, kWp } = body
  if (!seller || typeof seller !== "string" || !isAddress(seller)) {
    return Response.json({ error: "Connect a wallet so the reading can name you as the seller." }, { status: 400 })
  }
  if (typeof wh !== "number" || !Number.isInteger(wh) || wh < MIN_WH || wh > MAX_WH) {
    return Response.json(
      { error: `Energy must be between ${MIN_WH / 1000} and ${MAX_WH / 1000} kWh.` },
      { status: 400 },
    )
  }
  if (kWp !== undefined && (typeof kWp !== "number" || !Number.isFinite(kWp))) {
    return Response.json({ error: "Rooftop size must be a number of kWp." }, { status: 400 })
  }

  const entry = todayEntry(seller.toLowerCase())
  if (entry.count >= MAX_PER_DAY) {
    return Response.json(
      { error: `This meter issues at most ${MAX_PER_DAY} readings per seller per day.` },
      { status: 429 },
    )
  }

  // Reserve before the await so concurrent requests from one seller see each other.
  const issuedBefore = entry.wh
  entry.count += 1
  entry.wh += wh
  const release = () => {
    entry.count -= 1
    entry.wh -= wh
  }

  let verification
  try {
    verification = await verifyWithLiveData({
      seller: seller as Address,
      wh,
      kWp: kWp ?? KWP_DEFAULT,
      extraIssuedWh: issuedBefore,
    })
  } catch (error) {
    release()
    throw error
  }
  if (verification.verdict === "reject" || !verification.chainChecked) release()
  if (!verification.chainChecked) {
    // Fail closed: without today's on-chain listings the bound cannot be enforced.
    return Response.json(
      { error: "Can't read today's listings from Celo, so the meter won't sign. Try again in a moment.", verification },
      { status: 503 },
    )
  }
  if (verification.verdict === "reject") {
    return Response.json(
      { error: `Verification rejected this reading. ${verification.reasons[0]}`, verification },
      { status: 422 },
    )
  }

  const timestamp = BigInt(Math.floor(Date.now() / 1000))
  const readingId = keccak256(
    encodePacked(["address", "uint64", "bytes16"], [seller as Address, timestamp, `0x${randomBytes(16).toString("hex")}`]),
  )
  const reading = { readingId, meterId: DEMO_METER_ID, seller: seller as Address, timestamp, wh: BigInt(wh) }

  const meter = privateKeyToAccount(key as `0x${string}`)
  const signature = await meter.signTypedData({
    domain: EIP712_DOMAIN,
    types: READING_TYPES,
    primaryType: "Reading",
    message: reading,
  })

  return Response.json({
    reading: { ...reading, timestamp: timestamp.toString(), wh: String(wh) },
    signature,
    meter: meter.address,
    verification,
  })
}
