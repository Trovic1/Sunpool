import { randomBytes } from "node:crypto"

import { encodePacked, isAddress, keccak256, type Address } from "viem"
import { privateKeyToAccount } from "viem/accounts"

import { DEMO_METER_ID, EIP712_DOMAIN, READING_TYPES } from "@/lib/chain/contracts"

/**
 * Simulated smart meter. Issues a reading for the caller's surplus and signs it with
 * the meter key registered in ReadingRegistry.
 *
 * Production path: certified smart meters or inverter APIs sign readings on the
 * device, and this endpoint goes away. Until then the energy figures are simulated,
 * and the UI says so.
 */

const MIN_WH = 100
const MAX_WH = 10_000 // 10 kWh: a generous daily surplus for a 5 kW Lagos rooftop.
const MAX_PER_DAY = 25

const issued = new Map<string, { day: string; count: number }>()

function allow(seller: string) {
  const day = new Date().toISOString().slice(0, 10)
  const entry = issued.get(seller)
  if (!entry || entry.day !== day) {
    issued.set(seller, { day, count: 1 })
    return true
  }
  if (entry.count >= MAX_PER_DAY) return false
  entry.count += 1
  return true
}

export async function POST(request: Request) {
  const key = process.env.METER_SIGNER_PRIVATE_KEY
  if (!key) {
    return Response.json({ error: "The simulated meter is not configured on this server." }, { status: 503 })
  }

  let body: { seller?: string; wh?: number }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Send JSON with seller and wh." }, { status: 400 })
  }

  const { seller, wh } = body
  if (!seller || !isAddress(seller)) {
    return Response.json({ error: "Connect a wallet so the reading can name you as the seller." }, { status: 400 })
  }
  if (typeof wh !== "number" || !Number.isInteger(wh) || wh < MIN_WH || wh > MAX_WH) {
    return Response.json(
      { error: `Energy must be between ${MIN_WH / 1000} and ${MAX_WH / 1000} kWh.` },
      { status: 400 },
    )
  }
  if (!allow(seller.toLowerCase())) {
    return Response.json(
      { error: `This meter issues at most ${MAX_PER_DAY} readings per seller per day.` },
      { status: 429 },
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
  })
}
