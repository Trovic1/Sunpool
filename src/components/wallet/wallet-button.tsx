"use client"

import { ArrowUpRight, LogOut, TriangleAlert, Wallet } from "lucide-react"
import { formatUnits } from "viem"
import { useBalance, useReadContract } from "wagmi"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-wallet"
import { CELO_SEPOLIA } from "@/lib/chain/celo"
import { SUNPOOL_CONTRACTS, erc20Abi, explorerAddress } from "@/lib/chain/contracts"
import { shortAddress } from "@/lib/format"

const fmt = (value: bigint | undefined, digits = 2) =>
  value === undefined
    ? "—"
    : Number(formatUnits(value, 18)).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

export function WalletButton() {
  const wallet = useWallet()
  const enabled = Boolean(wallet.address) && !wallet.wrongChain
  const celo = useBalance({ address: wallet.address, chainId: CELO_SEPOLIA.id, query: { enabled } })
  const usdm = useReadContract({
    address: SUNPOOL_CONTRACTS.stablecoin,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: wallet.address ? [wallet.address] : undefined,
    chainId: CELO_SEPOLIA.id,
    query: { enabled, refetchInterval: 10_000 },
  })

  if (!wallet.address) {
    return (
      <Button variant="outline" onClick={() => void wallet.connectWallet()} disabled={wallet.isConnecting}>
        {wallet.isConnecting ? <Spinner data-icon="inline-start" /> : <Wallet data-icon="inline-start" />}
        {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
      </Button>
    )
  }

  if (wallet.wrongChain) {
    return (
      <Button variant="outline" onClick={() => void wallet.ensureReady()}>
        <TriangleAlert data-icon="inline-start" />
        Switch to Celo Sepolia
      </Button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="font-mono">
          <span aria-hidden className="size-2 rounded-full bg-success" />
          {shortAddress(wallet.address)}
          <span className="sr-only">, wallet menu</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-1">
          <p className="tag">Connected on {CELO_SEPOLIA.name}</p>
          <p className="font-mono text-xs break-all">{wallet.address}</p>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <dt className="tag">USDm</dt>
            <dd className="font-mono text-lg tabular">{fmt(usdm.data)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="tag">CELO (gas)</dt>
            <dd className="font-mono text-lg tabular">{fmt(celo.data?.value, 3)}</dd>
          </div>
        </dl>
        <Separator />
        <ul className="flex flex-col gap-1.5 text-sm">
          <li>
            <a className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2" href={CELO_SEPOLIA.faucetUrl} target="_blank" rel="noreferrer">
              Get test CELO for gas <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </li>
          <li>
            <a className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2" href="https://app.mento.org" target="_blank" rel="noreferrer">
              Swap CELO for USDm on Mento <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </li>
          <li>
            <a className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2" href={explorerAddress(wallet.address)} target="_blank" rel="noreferrer">
              Your activity on Blockscout <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </li>
        </ul>
        <Button variant="outline" size="sm" className="w-fit" onClick={wallet.disconnect}>
          <LogOut data-icon="inline-start" />
          Disconnect
        </Button>
      </PopoverContent>
    </Popover>
  )
}
