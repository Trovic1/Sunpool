"use client"

import { useQueryClient } from "@tanstack/react-query"
import { createElement, useCallback, useState } from "react"
import { toast } from "sonner"
import { useConfig } from "wagmi"
import { waitForTransactionReceipt, writeContract } from "wagmi/actions"

import { SUNPOOL_CONTRACTS, explorerTx, marketAbiWithErrors } from "@/lib/chain/contracts"
import { explainError } from "@/lib/chain/errors"
import { retryOnStaleNonce } from "@/lib/chain/wallet-sync"
import { formatKwh } from "@/lib/format"

import type { MarketListing } from "./market-types"
import { useWallet } from "./use-wallet"

/** Cancel one of your own listings on the live market. The reading stays consumed, so it can't be relisted. */
export function useCancelListing() {
  const config = useConfig()
  const wallet = useWallet()
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState<string>()

  const cancel = useCallback(
    async (listing: MarketListing) => {
      const toastId = toast.loading("Confirm the cancellation in your wallet")
      setCancelling(listing.id)
      try {
        const account = await wallet.ensureReady()
        if (!account) {
          toast.dismiss(toastId)
          return
        }
        const hash = await retryOnStaleNonce(() =>
          writeContract(config, {
            address: SUNPOOL_CONTRACTS.energyMarket,
            abi: marketAbiWithErrors,
            functionName: "cancel",
            args: [BigInt(listing.id)],
          }),
        )
        toast.loading("Cancelling on Celo Sepolia…", { id: toastId, description: link(hash) })
        const receipt = await waitForTransactionReceipt(config, { hash })
        if (receipt.status !== "success") throw new Error("The cancellation reverted.")
        toast.success(`Listing for ${formatKwh(listing.kwh)} kWh cancelled`, { id: toastId, description: link(hash) })
        await queryClient.invalidateQueries({ queryKey: ["market"] })
      } catch (error) {
        const e = explainError(error)
        if (e.cancelled) toast(e.title, { id: toastId, description: e.description })
        else toast.error(e.title, { id: toastId, description: e.description })
      } finally {
        setCancelling(undefined)
      }
    },
    [config, queryClient, wallet],
  )

  return { cancel, cancelling }
}

function link(hash: string) {
  return createElement(
    "a",
    { href: explorerTx(hash), target: "_blank", rel: "noreferrer", className: "underline underline-offset-2" },
    "View on Blockscout",
  )
}
