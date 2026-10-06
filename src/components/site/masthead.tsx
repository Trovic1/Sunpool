"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Sun, Wallet } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WalletButton } from "@/components/wallet/wallet-button"
import { useActiveSection } from "@/hooks/use-active-section"
import { useDataSource } from "@/hooks/use-data-source"
import { cn } from "@/lib/utils"

/** Each item is a section of the one-page home and also its own route for deep links. */
const NAV = [
  { id: "market", route: "/", label: "Market" },
  { id: "activity", route: "/activity", label: "Activity" },
  { id: "certificates", route: "/certificates", label: "Certificates" },
  { id: "proof", route: "/double-claim", label: "Proof" },
  { id: "about", route: "/about", label: "About" },
] as const

const SECTION_IDS = NAV.map((item) => item.id)

function NavLinks({
  active,
  current: kind,
  pill,
  className,
}: {
  active?: string
  current: "page" | "location"
  pill: string
  className?: string
}) {
  const reduced = useReducedMotion()
  return (
    <ul className={cn("flex items-center gap-1 text-sm", className)}>
      {NAV.map((item) => {
        const current = active === item.id
        return (
          <li key={item.id} className="shrink-0">
            <Link
              href={`/#${item.id}`}
              aria-current={current ? kind : undefined}
              className={cn(
                "relative inline-flex h-9 items-center rounded-full px-3 font-medium text-muted-foreground transition-colors hover:text-foreground",
                current && "text-foreground",
              )}
            >
              {current && (
                <motion.span
                  layoutId={pill}
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">{item.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export function Masthead() {
  const source = useDataSource()
  const pathname = usePathname()
  const home = pathname === "/"
  const { active: spied, scrolled } = useActiveSection(SECTION_IDS, home)
  const active = home ? spied : NAV.find((item) => item.route === pathname)?.id
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-background transition-colors duration-300",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 lg:gap-6">
          <Link href="/#market" className="flex items-center gap-2 rounded-sm" aria-label="Sunpool, back to the top">
            <span className="flex size-8 items-center justify-center rounded-full bg-sun text-sun-foreground">
              <Sun aria-hidden className="size-[18px]" strokeWidth={2.25} />
            </span>
            <span className="font-display text-xl font-bold">Sunpool</span>
          </Link>
          <nav aria-label="Main" className="hidden md:block">
            <NavLinks active={active} current={home ? "location" : "page"} pill="nav-pill-wide" />
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
        <NavLinks
          active={active}
          current={home ? "location" : "page"}
          pill="nav-pill-narrow" className="justify-between gap-0 overflow-x-auto px-1.5 pb-2 after:w-1.5 after:shrink-0 after:content-[''] [&_a]:px-2.5" />
      </nav>
    </header>
  )
}
