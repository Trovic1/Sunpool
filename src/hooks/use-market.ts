"use client"

import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { buildGenerationSeries, suggestPrice } from "@/lib/forecast"
import { CURRENCY, formatCusd, formatKwh, formatPrice } from "@/lib/format"
import {
  DEMO_BUYER,
  DEMO_SELLER,
  DEMO_START_MINUTE,
  EMISSION_FACTOR,
  MS_PER_SIM_MINUTE,
  NEIGHBORHOOD,
  TRADE_INTERVAL_MS,
  createRng,
  houseById,
  makeReadingId,
  makeTrade,
  seedListings,
  seedTrades,
  type Trade,
} from "@/lib/seed"

import {
  SCENARIOS,
  type FeedStatus,
  type ListSurplusInput,
  type MarketListing,
  type MarketModel,
  type Scenario,
} from "./market-types"

export { SCENARIOS }
export type { FeedStatus, MarketListing, Scenario }
export type Market = MarketModel

/** Simulated network latency for buys, listings and reconnects. */
const LOAD_MS = 700
const SETTLE_MS = 1100

export function useMarket(): MarketModel {
  const [scenario, setScenario] = useQueryState(
    "state",
    parseAsStringLiteral(SCENARIOS).withDefault("live"),
  )

  // Which scenario's seed is currently loaded. While it lags the URL, the feed is loading.
  const [loadedScenario, setLoadedScenario] = useState<Scenario | null>(null)
  const [feedStatus, setFeedStatus] = useState<Exclude<FeedStatus, "loading">>("ready")
  const status: FeedStatus = loadedScenario === scenario ? feedStatus : "loading"
  const [minute, setMinute] = useState<number>(DEMO_START_MINUTE[scenario])
  const [trades, setTrades] = useState<Trade[]>([])
  const [listings, setListings] = useState<MarketListing[]>([])
  const [paused, setPaused] = useState(false)
  const [announcement, setAnnouncement] = useState("")

  const rngRef = useRef(createRng(4242))
  const indexRef = useRef(1000)
  const minuteRef = useRef(minute)
  useEffect(() => {
    minuteRef.current = minute
  }, [minute])

  // (Re)load the seeded feed whenever the scenario changes.
  useEffect(() => {
    const start = DEMO_START_MINUTE[scenario]
    const timer = window.setTimeout(() => {
      rngRef.current = createRng(4242)
      setMinute(start)
      setTrades(scenario === "empty" ? [] : seedTrades(start))
      setListings(scenario === "empty" ? [] : seedListings())
      setPaused(false)
      setFeedStatus(scenario === "error" ? "error" : "ready")
      setLoadedScenario(scenario)
    }, LOAD_MS)
    return () => window.clearTimeout(timer)
  }, [scenario])

  const live = scenario === "live" && status === "ready" && !paused

  // Demo clock.
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      setMinute((m) => Math.min(m + 1, NEIGHBORHOOD.sunsetMinutes))
    }, MS_PER_SIM_MINUTE)
    return () => window.clearInterval(timer)
  }, [live])

  // Simulated trades arriving from the neighborhood.
  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      const now = minuteRef.current
      if (now >= NEIGHBORHOOD.sunsetMinutes) return
      const trade = makeTrade(now, rngRef.current, indexRef.current++)
      setTrades((prev) => [trade, ...prev].slice(0, 200))
      const seller = houseById(trade.sellerId)?.name
      const buyer = houseById(trade.buyerId)?.name
      setAnnouncement(
        `New trade: ${formatKwh(trade.kwh)} kWh from ${seller} to ${buyer} at ${formatPrice(trade.price)} ${CURRENCY} per kWh.`,
      )
    }, TRADE_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [live])

  const togglePaused = useCallback(() => {
    const next = !paused
    setPaused(next)
    toast(next ? "Trade tape paused" : "Trade tape resumed", {
      description: next
        ? "The demo clock stops and new trades are held until you resume."
        : "New trades will stream in again.",
    })
  }, [paused])

  const buy = useCallback(
    (listing: MarketListing) => {
      if (listing.pending) return
      const pendingTrade: Trade = {
        id: `T${indexRef.current++}`,
        minute: minuteRef.current,
        sellerId: listing.sellerId,
        buyerId: DEMO_BUYER.id,
        kwh: listing.kwh,
        price: listing.price,
        readingId: listing.readingId,
        status: "pending",
      }
      setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, pending: true } : l)))
      setTrades((prev) => [pendingTrade, ...prev])

      window.setTimeout(() => {
        const seller = houseById(listing.sellerId)?.name ?? listing.sellerId
        if (scenario === "error") {
          setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, pending: false } : l)))
          setTrades((prev) => prev.filter((t) => t.id !== pendingTrade.id))
          toast.error("Unable to settle this purchase", {
            description: "The trade feed is offline. Reconnect, then buy again.",
          })
          return
        }
        setListings((prev) => prev.filter((l) => l.id !== listing.id))
        setTrades((prev) =>
          prev.map((t) => (t.id === pendingTrade.id ? { ...t, status: "settled" } : t)),
        )
        toast.success(`Bought ${formatKwh(listing.kwh)} kWh from ${seller}`, {
          description: `${formatCusd(listing.kwh * listing.price)} ${CURRENCY} at ${formatPrice(listing.price)} ${CURRENCY}/kWh. Certificate minted for reading ${listing.readingId} (simulated).`,
        })
        setAnnouncement(`Purchase settled: ${formatKwh(listing.kwh)} kWh from ${seller}.`)
      }, SETTLE_MS)
    },
    [scenario],
  )

  const listSurplus = useCallback(
    ({ kwh, price, untilMinute }: ListSurplusInput) =>
      new Promise<void>((resolve, reject) => {
        const listing: MarketListing = {
          id: `L${indexRef.current++}`,
          sellerId: DEMO_SELLER.id,
          kwh,
          price,
          untilMinute,
          readingId: makeReadingId(DEMO_SELLER.id, minuteRef.current, rngRef.current),
          pending: true,
        }
        setListings((prev) => [listing, ...prev])
        window.setTimeout(() => {
          if (scenario === "error") {
            setListings((prev) => prev.filter((l) => l.id !== listing.id))
            toast.error("Unable to publish your listing", {
              description: "The trade feed is offline. Reconnect, then list again.",
            })
            reject(new Error("offline"))
            return
          }
          setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, pending: false } : l)))
          toast.success(`Listed ${formatKwh(kwh)} kWh at ${formatPrice(price)} ${CURRENCY}/kWh`, {
            description: `Visible to buyers in ${NEIGHBORHOOD.name} now.`,
          })
          resolve()
        }, SETTLE_MS)
      }),
    [scenario],
  )

  const retry = useCallback(() => {
    setFeedStatus("reconnecting")
    window.setTimeout(() => {
      toast.success("Reconnected to the trade feed")
      void setScenario("live")
    }, 900)
  }, [setScenario])

  const changeScenario = useCallback(
    (next: Scenario) => {
      if (next === scenario) return
      void setScenario(next)
      const labels: Record<Scenario, string> = {
        live: "Showing the live demo",
        empty: "Showing pre-dawn: no trades yet",
        error: "Showing the feed-offline state",
      }
      toast(labels[next])
    },
    [scenario, setScenario],
  )

  const settled = useMemo(() => trades.filter((t) => t.status === "settled"), [trades])

  const totals = useMemo(() => {
    const kwh = settled.reduce((sum, t) => sum + t.kwh, 0)
    const cusd = settled.reduce((sum, t) => sum + t.kwh * t.price, 0)
    return {
      kwh,
      cusd,
      certificates: settled.length,
      co2Kg: kwh * EMISSION_FACTOR.kgPerKwh,
    }
  }, [settled])

  const generation = useMemo(() => buildGenerationSeries(minute), [minute])
  const suggestion = useMemo(() => suggestPrice(settled, minute), [settled, minute])

  return {
    mode: "seeded",
    scenario,
    changeScenario,
    status,
    minute,
    trades,
    listings,
    paused,
    togglePaused,
    buy,
    listSurplus,
    retry,
    totals,
    generation,
    suggestion,
    announcement,
  }
}

