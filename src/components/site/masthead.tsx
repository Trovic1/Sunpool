"use client"

import { Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/wallet/wallet-button"
import { useDataSource } from "@/hooks/use-data-source"

export function Masthead() {
  const source = useDataSource()
  return (
    <header className="border-b border-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 rounded-sm" aria-label="Sunpool, market home">
            <span className="flex size-7 items-center justify-center rounded-full border border-foreground bg-primary">
              <Sun aria-hidden className="size-4" strokeWidth={2} />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">Sunpool</span>
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-4 text-sm">
              <li>
                <Link href="/" className="rounded-sm hover:underline hover:underline-offset-4">
                  Market
                </Link>
              </li>
              <li>
                <Link href="/double-claim" className="rounded-sm hover:underline hover:underline-offset-4">
                  Double-claim test
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            {source === "chain" ? "Celo Sepolia testnet" : "Simulated data"}
          </Badge>
          {source === "chain" ? (
            <WalletButton />
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                toast("You are viewing the offline demo", {
                  description: "Remove ?source=seeded from the address to trade on Celo Sepolia.",
                })
              }
            >
              <Wallet data-icon="inline-start" />
              Connect wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
