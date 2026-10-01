"use client"

import { Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/wallet/wallet-button"
import { useDataSource } from "@/hooks/use-data-source"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Market" },
  { href: "/double-claim", label: "Double-claim test" },
  { href: "/about", label: "About & impact" },
] as const

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <ul className={cn("flex items-center gap-4 text-sm", className)}>
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-sm underline-offset-4 hover:underline",
                active && "font-medium underline decoration-primary decoration-2",
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

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
            <NavLinks />
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
      <nav aria-label="Main" className="border-t border-rule md:hidden">
        <NavLinks className="overflow-x-auto px-4 py-2" />
      </nav>
    </header>
  )
}
