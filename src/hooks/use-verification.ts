"use client"

import { useEffect, useMemo, useState } from "react"

import { modeledSky } from "@/lib/irradiance"
import { DEMO_SELLER } from "@/lib/seed"
import { verifyReading, type Verification } from "@/lib/verify"

import type { MarketModel } from "./market-types"

export type VerificationState =
  | { status: "idle" }
  | { status: "checking"; result?: Verification }
  | { status: "ready"; result: Verification }
  | { status: "error"; message: string }

const DEBOUNCE_MS = 450

/**
 * Dry-run verification for the Sell form.
 * Chain mode asks /api/verify (live weather + on-chain listings). The offline demo
 * runs the same pure check in the browser on the modeled sky and seeded listings.
 */
export function useVerification(market: MarketModel, wh: number, kWp: number): VerificationState {
  const valid = Number.isFinite(wh) && wh >= 100 && Number.isFinite(kWp) && kWp > 0

  const seeded = useMemo<Verification | undefined>(() => {
    if (market.mode !== "seeded" || !valid) return undefined
    const own = (id: string) => id === DEMO_SELLER.id
    return verifyReading({
      wh,
      kWp,
      minute: market.minute,
      sky: modeledSky("seeded"),
      listedTodayWh: market.listings.filter((l) => own(l.sellerId)).reduce((s, l) => s + l.kwh * 1000, 0),
      peerWh: market.listings.filter((l) => !own(l.sellerId)).map((l) => l.kwh * 1000),
    })
  }, [market.mode, market.minute, market.listings, valid, wh, kWp])

  const account = market.account
  const chain = market.mode === "chain"
  const key = `${account ?? ""}|${Math.round(wh)}|${kWp}`
  const [remote, setRemote] = useState<{ key: string; state: VerificationState; last?: Verification }>({
    key: "",
    state: { status: "idle" },
  })

  useEffect(() => {
    if (!chain || !valid) return
    const controller = new AbortController()
    const settle = (state: VerificationState) =>
      setRemote((prev) => ({ key, state, last: state.status === "ready" ? state.result : prev.last }))
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ seller: account, wh: Math.round(wh), kWp }),
          signal: controller.signal,
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok || !body.verdict) throw new Error(body.error ?? "The verification service did not answer.")
        settle({ status: "ready", result: body })
      } catch (error) {
        if (controller.signal.aborted) return
        settle({ status: "error", message: error instanceof Error ? error.message : "Verification is unavailable." })
      }
    }, DEBOUNCE_MS)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [chain, valid, key, account, wh, kWp])

  if (!valid) return { status: "idle" }
  if (seeded) return { status: "ready", result: seeded }
  if (remote.key !== key) return { status: "checking", result: remote.last }
  return remote.state
}
