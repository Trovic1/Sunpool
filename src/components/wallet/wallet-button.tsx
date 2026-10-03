"use client"

import { ArrowUpRight, Coins, LogOut, TriangleAlert, Wallet } from "lucide-react"
import { toast } from "sonner"
import { formatUnits } from "viem"
import { useBalance, useReadContract, useWatchAsset } from "wagmi"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-wallet"
import { CELO_SEPOLIA, SETTLEMENT_TOKEN } from "@/lib/chain/celo"
import { SUNPOOL_CONTRACTS, erc20Abi, explorerAddress } from "@/lib/chain/contracts"
import { shortAddress } from "@/lib/format"

const fmt = (value: bigint | undefined, decimals: number, digits = 2) =>
  value === undefined
    ? "-"
    : Number(formatUnits(value, decimals)).toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })

export function WalletButton() {
  const wallet = useWallet()
  const watchAsset = useWatchAsset()
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
            <dt className="tag">{SETTLEMENT_TOKEN.symbol}</dt>
            <dd className="font-mono text-lg tabular">{fmt(usdm.data, SETTLEMENT_TOKEN.decimals)}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="tag">CELO (gas)</dt>
            <dd className="font-mono text-lg tabular">{fmt(celo.data?.value, 18, 3)}</dd>
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
            <a className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2" href={CELO_SEPOLIA.circleFaucetUrl} target="_blank" rel="noreferrer">
              Get test {SETTLEMENT_TOKEN.symbol} (pick Celo Sepolia) <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </li>
          <li>
            <a className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2" href={explorerAddress(wallet.address)} target="_blank" rel="noreferrer">
              Your activity on Blockscout <ArrowUpRight aria-hidden className="size-3" />
            </a>
          </li>
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              watchAsset.mutate(
                {
                  type: "ERC20",
                  options: {
                    address: SETTLEMENT_TOKEN.address,
                    symbol: SETTLEMENT_TOKEN.symbol,
                    decimals: SETTLEMENT_TOKEN.decimals,
                  },
                },
                {
                  onSuccess: () => toast.success(`${SETTLEMENT_TOKEN.symbol} added to your wallet`),
                  onError: () => toast(`Your wallet did not add ${SETTLEMENT_TOKEN.symbol}`, { description: "You can add it manually with the token address." }),
                },
              )
            }
          >
            <Coins data-icon="inline-start" />
            Add {SETTLEMENT_TOKEN.symbol} to wallet
          </Button>
        <Button variant="outline" size="sm" className="w-fit" onClick={wallet.disconnect}>
          <LogOut data-icon="inline-start" />
          Disconnect
        </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
