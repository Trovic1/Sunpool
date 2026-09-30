"use client"

import { Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function Masthead() {
  return (
    <header className="border-b border-foreground">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-sm" aria-label="Sunpool, market home">
          <span className="flex size-7 items-center justify-center rounded-full border border-foreground bg-primary">
            <Sun aria-hidden className="size-4" strokeWidth={2} />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">Sunpool</span>
        </Link>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex">
            Simulated data
          </Badge>
          <Button
            variant="outline"
            onClick={() =>
              toast("Wallet connection is not live yet", {
                description:
                  "This demo runs on simulated data. Celo testnet settlement in cUSD arrives with the contracts.",
              })
            }
          >
            <Wallet data-icon="inline-start" />
            Connect wallet
          </Button>
        </div>
      </div>
    </header>
  )
}
