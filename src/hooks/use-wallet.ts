"use client"

import { useCallback, useEffect } from "react"
import { toast } from "sonner"
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi"

import { CELO_SEPOLIA } from "@/lib/chain/celo"
import { explainError } from "@/lib/chain/errors"

type EthereumWindow = Window & { ethereum?: { isMiniPay?: boolean } }

export const isMiniPay = () =>
  typeof window !== "undefined" && Boolean((window as EthereumWindow).ethereum?.isMiniPay)

export function useWallet() {
  const connection = useConnection()
  const connectors = useConnectors()
  const connect = useConnect()
  const disconnect = useDisconnect()
  const switchChain = useSwitchChain()

  const hasInjected = typeof window !== "undefined" && Boolean((window as EthereumWindow).ethereum)

  const connectWallet = useCallback(async () => {
    const connector = connectors[0]
    if (!connector || !hasInjected) {
      toast("No wallet found in this browser", {
        description: "Open Sunpool in MiniPay, or install MetaMask and add Celo Sepolia.",
      })
      return undefined
    }
    try {
      const result = await connect.mutateAsync({ connector, chainId: CELO_SEPOLIA.id })
      return result.accounts[0]
    } catch (error) {
      const e = explainError(error)
      toast.error(e.title, { description: e.description })
      return undefined
    }
  }, [connect, connectors, hasInjected])

  /** Makes sure the wallet is connected and on Celo Sepolia. Returns the address or undefined. */
  const ensureReady = useCallback(async () => {
    let address = connection.address
    if (!address) address = await connectWallet()
    if (!address) return undefined
    if (connection.chainId !== CELO_SEPOLIA.id) {
      try {
        await switchChain.mutateAsync({ chainId: CELO_SEPOLIA.id })
      } catch (error) {
        const e = explainError(error)
        toast.error("Switch your wallet to Celo Sepolia", { description: e.description })
        return undefined
      }
    }
    return address
  }, [connection.address, connection.chainId, connectWallet, switchChain])

  // MiniPay injects a connected wallet; connect without asking.
  useEffect(() => {
    if (isMiniPay() && !connection.address && connectors[0]) {
      connect.mutate({ connector: connectors[0] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectors])

  return {
    address: connection.address,
    chainId: connection.chainId,
    isConnected: connection.isConnected,
    isConnecting: connect.isPending,
    wrongChain: connection.isConnected && connection.chainId !== CELO_SEPOLIA.id,
    connectWallet,
    ensureReady,
    disconnect: () => disconnect.mutate(),
  }
}
