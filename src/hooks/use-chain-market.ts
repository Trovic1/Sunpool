"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createElement, useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { formatUnits, parseUnits, type Address } from "viem"
import { useConfig } from "wagmi"
import { readContract, waitForTransactionReceipt, writeContract } from "wagmi/actions"

import { SETTLEMENT_TOKEN } from "@/lib/chain/celo"
import { SUNPOOL_CONTRACTS, erc20Abi, explorerTx, marketAbiWithErrors, type SignedReading } from "@/lib/chain/contracts"
import { explainError } from "@/lib/chain/errors"
import { retryOnStaleNonce, waitForWalletToCatchUp } from "@/lib/chain/wallet-sync"
import type { MarketSnapshot } from "@/lib/chain/server"
import { buildGenerationSeries, suggestPrice } from "@/lib/forecast"
import { CURRENCY, formatCusd, formatKwh, formatPrice, shortAddress } from "@/lib/format"
import { EMISSION_FACTOR, seedTrades } from "@/lib/seed"

import type { ListSurplusInput, MarketListing, MarketModel, MarketTrade } from "./market-types"
import { useWallet } from "./use-wallet"

const POLL_MS = 5000
const WAT_OFFSET_SECONDS = 60 * 60

/** Minute of the day in Lagos (WAT, UTC+1). */
const watMinute = (unixSeconds: number) => Math.floor(((unixSeconds + WAT_OFFSET_SECONDS) % 86_400) / 60)
const nowWatMinute = () => watMinute(Math.floor(Date.now() / 1000))

async function fetchSnapshot(): Promise<MarketSnapshot> {
  const res = await fetch("/api/market", { cache: "no-store" })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? "Unable to load the market.")
  return body
}

function txLink(hash: string) {
  return createElement(
    "a",
    { href: explorerTx(hash), target: "_blank", rel: "noreferrer", className: "underline underline-offset-2" },
    "View on Blockscout",
  )
}

export function useChainMarket(): MarketModel {
  const config = useConfig()
  const queryClient = useQueryClient()
  const wallet = useWallet()
  const [paused, setPaused] = useState(false)
  const [minute, setMinute] = useState(nowWatMinute)
  const [pendingListings, setPendingListings] = useState<Set<string>>(new Set())
  const [optimisticTrades, setOptimisticTrades] = useState<MarketTrade[]>([])
  const [optimisticListings, setOptimisticListings] = useState<MarketListing[]>([])

  const query = useQuery({
    queryKey: ["market"],
    queryFn: fetchSnapshot,
    refetchInterval: paused ? false : POLL_MS,
  })

  useEffect(() => {
    const timer = window.setInterval(() => setMinute(nowWatMinute()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const snapshot = query.data
  // Announce the newest settled trade; recomputes only when it changes.
  const latest = snapshot?.trades[0]
  const announcement = latest
    ? `Trade settled: ${formatKwh(latest.wh / 1000)} kWh at ${formatPrice(latest.price)} ${CURRENCY} per kWh.`
    : ""

  const trades: MarketTrade[] = useMemo(() => {
    const settled: MarketTrade[] = (snapshot?.trades ?? []).map((t) => ({
      id: t.txHash,
      minute: watMinute(t.timestamp),
      sellerId: t.seller,
      buyerId: t.buyer,
      kwh: t.wh / 1000,
      price: t.price,
      readingId: t.readingId,
      status: "settled",
      txHash: t.txHash,
      timestamp: t.timestamp,
      certificateId: t.certificateId,
    }))
    const seen = new Set(settled.map((t) => t.readingId))
    return [...optimisticTrades.filter((t) => !seen.has(t.readingId)), ...settled]
  }, [snapshot, optimisticTrades])

  const listings: MarketListing[] = useMemo(() => {
    const live: MarketListing[] = (snapshot?.listings ?? []).map((l) => ({
      id: l.id,
      sellerId: l.seller,
      kwh: l.wh / 1000,
      price: l.price,
      priceWei: l.priceWei,
      listedAt: l.listedAt,
      readingId: l.readingId,
      pending: pendingListings.has(l.id),
    }))
    const seen = new Set(live.map((l) => l.readingId))
    return [...optimisticListings.filter((l) => !seen.has(l.readingId)), ...live]
  }, [snapshot, pendingListings, optimisticListings])

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["market"] }), [queryClient])

  const buy = useCallback(
    async (listing: MarketListing) => {
      if (listing.pending || !listing.priceWei) return
      const account = await wallet.ensureReady()
      if (!account) return
      if (account.toLowerCase() === listing.sellerId.toLowerCase()) {
        toast("This is your own listing", { description: "Buy from another household instead." })
        return
      }

      const price = BigInt(listing.priceWei)
      const total = (BigInt(Math.round(listing.kwh * 1000)) * price) / 1000n
      const pendingTrade: MarketTrade = {
        id: `pending-${listing.id}`,
        minute: nowWatMinute(),
        sellerId: listing.sellerId,
        buyerId: account,
        kwh: listing.kwh,
        price: listing.price,
        readingId: listing.readingId,
        status: "pending",
      }
      setPendingListings((s) => new Set(s).add(listing.id))
      setOptimisticTrades((t) => [pendingTrade, ...t])
      const toastId = toast.loading(`Checking your ${CURRENCY} balance…`)

      try {
        const balance = await readContract(config, {
          address: SUNPOOL_CONTRACTS.stablecoin,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [account],
        })
        if (balance < total) {
          throw Object.assign(new Error("insufficient-usdm"), { usdm: true })
        }

        const allowance = await readContract(config, {
          address: SUNPOOL_CONTRACTS.stablecoin,
          abi: erc20Abi,
          functionName: "allowance",
          args: [account, SUNPOOL_CONTRACTS.energyMarket],
        })
        if (allowance < total) {
          toast.loading(`Approve ${CURRENCY} in your wallet`, { id: toastId, description: "Step 1 of 2" })
          const approveHash = await writeContract(config, {
            address: SUNPOOL_CONTRACTS.stablecoin,
            abi: erc20Abi,
            functionName: "approve",
            args: [SUNPOOL_CONTRACTS.energyMarket, total],
          })
          toast.loading("Waiting for the approval to confirm…", { id: toastId, description: txLink(approveHash) })
          await waitForTransactionReceipt(config, { hash: approveHash })
          toast.loading("Approval confirmed. Syncing your wallet…", { id: toastId, description: txLink(approveHash) })
          await waitForWalletToCatchUp(config, account, approveHash)
        }

        toast.loading("Confirm the purchase in your wallet", {
          id: toastId,
          description: allowance < total ? "Step 2 of 2" : undefined,
        })
        const hash = await retryOnStaleNonce(() =>
          writeContract(config, {
            address: SUNPOOL_CONTRACTS.energyMarket,
            abi: marketAbiWithErrors,
            functionName: "buy",
            args: [BigInt(listing.id), price],
          }),
        )
        toast.loading("Settling on Celo Sepolia…", { id: toastId, description: txLink(hash) })
        const receipt = await waitForTransactionReceipt(config, { hash })
        if (receipt.status !== "success") throw new Error("The purchase transaction reverted.")

        toast.success(`Bought ${formatKwh(listing.kwh)} kWh from ${shortAddress(listing.sellerId)}`, {
          id: toastId,
          description: createElement(
            "span",
            null,
            `${formatCusd(Number(formatUnits(total, SETTLEMENT_TOKEN.decimals)))} ${CURRENCY} paid. Certificate minted to your wallet. `,
            txLink(hash),
          ),
        })
        await refresh()
      } catch (error) {
        const usdm = (error as { usdm?: boolean }).usdm
        const e = usdm
          ? {
              title: `Not enough ${CURRENCY}`,
              description: `Get free test ${CURRENCY} at faucet.circle.com (pick Celo Sepolia), then buy again.`,
            }
          : explainError(error)
        if (e.cancelled) toast(e.title, { id: toastId, description: e.description })
        else toast.error(e.title, { id: toastId, description: e.description })
      } finally {
        setPendingListings((s) => {
          const next = new Set(s)
          next.delete(listing.id)
          return next
        })
        setOptimisticTrades((t) => t.filter((x) => x.id !== pendingTrade.id))
      }
    },
    [config, refresh, wallet],
  )

  const listSurplus = useCallback(
    async ({ kwh, price, kWp }: ListSurplusInput) => {
      const account = await wallet.ensureReady()
      if (!account) throw new Error("no-wallet")
      const toastId = toast.loading("Verifying and signing the meter reading…", {
        description: "AI verification checks it against today's sun, then the simulated meter signs.",
      })
      let optimisticId: string | undefined
      try {
        const res = await fetch("/api/readings", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ seller: account, wh: Math.round(kwh * 1000), kWp }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error ?? "The meter could not issue a reading.")
        const signed: SignedReading = {
          reading: {
            ...body.reading,
            timestamp: BigInt(body.reading.timestamp),
            wh: BigInt(body.reading.wh),
          },
          signature: body.signature,
        }

        optimisticId = `pending-${signed.reading.readingId}`
        setOptimisticListings((l) => [
          {
            id: optimisticId!,
            sellerId: account,
            kwh,
            price,
            readingId: signed.reading.readingId,
            listedAt: Math.floor(Date.now() / 1000),
            pending: true,
          },
          ...l,
        ])

        toast.loading("Confirm the listing in your wallet", { id: toastId, description: undefined })
        const hash = await writeContract(config, {
          address: SUNPOOL_CONTRACTS.energyMarket,
          abi: marketAbiWithErrors,
          functionName: "list",
          args: [signed.reading, signed.signature, parseUnits(price.toFixed(SETTLEMENT_TOKEN.decimals), SETTLEMENT_TOKEN.decimals)],
        })
        toast.loading("Publishing on Celo Sepolia…", { id: toastId, description: txLink(hash) })
        const receipt = await waitForTransactionReceipt(config, { hash })
        if (receipt.status !== "success") throw new Error("The listing transaction reverted.")
        toast.success(`Listed ${formatKwh(kwh)} kWh at ${formatPrice(price)} ${CURRENCY}/kWh`, {
          id: toastId,
          description: createElement("span", null, "Reading consumed on-chain. ", txLink(hash)),
        })
        await refresh()
      } catch (error) {
        const e = error instanceof Error && !("shortMessage" in error) ? { title: error.message, description: "" } : explainError(error)
        if ("cancelled" in e && e.cancelled) toast(e.title, { id: toastId, description: e.description })
        else toast.error(e.title, { id: toastId, description: e.description || undefined })
        throw error
      } finally {
        if (optimisticId) setOptimisticListings((l) => l.filter((x) => x.id !== optimisticId))
      }
    },
    [config, refresh, wallet],
  )

  const togglePaused = useCallback(() => {
    const next = !paused
    setPaused(next)
    toast(next ? "Live updates paused" : "Live updates resumed", {
      description: next ? "The tape stops polling Celo Sepolia until you resume." : "Polling every 5 seconds.",
    })
  }, [paused])

  const settled = useMemo(() => trades.filter((t) => t.status === "settled"), [trades])
  const totals = useMemo(() => {
    const t = snapshot?.totals
    const kwh = (t?.wh ?? 0) / 1000
    return {
      kwh,
      cusd: t?.stablecoin ?? 0,
      certificates: t?.certificates ?? 0,
      co2Kg: kwh * EMISSION_FACTOR.kgPerKwh,
    }
  }, [snapshot])

  const generation = useMemo(() => buildGenerationSeries(minute), [minute])
  // Until enough real trades exist, anchor the price suggestion on the seeded Lagos price band.
  const suggestion = useMemo(
    () => suggestPrice(settled.length >= 5 ? settled : seedTrades(minute), minute),
    [settled, minute],
  )

  // Keep showing the last good snapshot if a background poll fails.
  const status = query.isPending ? "loading" : query.isError && !snapshot ? "error" : "ready"

  return {
    mode: "chain",
    account: wallet.address as Address | undefined,
    scenario: "live",
    changeScenario: () => {},
    status: query.isFetching && status === "error" ? "reconnecting" : status,
    minute,
    trades,
    listings,
    paused,
    togglePaused,
    buy: (l) => void buy(l),
    listSurplus,
    retry: () => void query.refetch(),
    totals,
    generation,
    suggestion,
    announcement,
  }
}
