import "server-only"

import type { Address } from "viem"

import { getListingActivity } from "./chain/listings"
import { fetchSky, watClock } from "./irradiance"
import { verifyReading, type Verification } from "./verify"

export type ServerVerification = Verification & {
  /** WAT minute the check ran at. */
  minute: number
  skyNote: string
  /** False when Celo could not be read; the peer check and listed-today are then missing. */
  chainChecked: boolean
}

/**
 * Run the reading check with live inputs: today's sky and this seller's listings
 * from Celo. `extraIssuedWh` lets the meter count readings it signed that are not
 * on-chain yet (cheap first gate, per instance).
 */
export async function verifyWithLiveData({
  seller,
  wh,
  kWp,
  extraIssuedWh = 0,
}: {
  seller?: Address
  wh: number
  kWp: number
  extraIssuedWh?: number
}): Promise<ServerVerification> {
  const now = new Date()
  const { minute } = watClock(now)
  const [sky, activity] = await Promise.all([
    fetchSky({ now }),
    getListingActivity(seller, now.getTime()).catch((error) => {
      console.error("listing activity failed", error)
      return null
    }),
  ])
  const chainToday = activity?.sellerTodayWh ?? null
  const listedTodayWh = seller ? Math.max(chainToday ?? 0, extraIssuedWh) : null
  const result = verifyReading({
    wh,
    kWp,
    minute,
    sky,
    listedTodayWh,
    peerWh: activity?.peerWh ?? [],
  })
  return { ...result, minute: Math.round(minute), skyNote: sky.note, chainChecked: activity !== null }
}
