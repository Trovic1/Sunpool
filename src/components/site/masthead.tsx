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
  { href: "/activity", label: "Activity" },
  { href: "/certificates", label: "Certificates" },
  { href: "/double-claim", label: "Proof" },
  { href: "/about", label: "About" },
] as const

function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <ul className={cn("flex items-center gap-1 text-sm", className)}>
      {NAV.map((item) => {
        const active = pathname === item.href
        return (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-full px-3 font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active && "bg-accent text-foreground hover:bg-accent",
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
    <header className="bg-background">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:gap-6">
          <Link href="/" className="flex items-center gap-2 rounded-sm" aria-label="Sunpool, market home">
            <span className="flex size-8 items-center justify-center rounded-full bg-sun text-sun-foreground">
              <Sun aria-hidden className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="font-display text-xl font-bold">Sunpool</span>
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="hidden sm:inline-flex md:hidden lg:inline-flex">
            {source === "chain" ? "Testnet" : "Demo data"}
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
      <nav aria-label="Main" className="md:hidden">
        <NavLinks className="justify-between gap-0 overflow-x-auto px-1.5 pb-2 after:w-1.5 after:shrink-0 after:content-[''] [&_a]:px-2.5" />
      </nav>
    </header>
  )
}
