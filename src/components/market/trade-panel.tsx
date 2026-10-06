"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, RotateCw, Sun } from "lucide-react"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { MarketListing, MarketModel } from "@/hooks/market-types"
import { CURRENCY, formatCusd, formatKwh, formatPrice, partyName } from "@/lib/format"
import { DEMO_SELLER, houseById } from "@/lib/seed"
import { cn } from "@/lib/utils"

import { AnimatedNumber } from "./animated-number"
import { ListSurplusForm } from "./list-surplus-dialog"
import { SunCurve } from "./sun-curve"

const TABS = ["buy", "sell"] as const

const fmtKwh = (n: number) => formatKwh(n)

function isOwn(listing: MarketListing, account?: string) {
  return account ? listing.sellerId.toLowerCase() === account.toLowerCase() : listing.sellerId === DEMO_SELLER.id
}

/** The app: buy units from a neighbour or sell your own surplus. */
export function TradePanel({ market }: { market: MarketModel }) {
  const [tab, setTab] = useQueryState("tab", parseAsStringLiteral(TABS).withDefault("buy"))

  return (
    <section aria-label="Trade" className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div role="tablist" aria-label="Buy or sell" className="grid grid-cols-2 rounded-full bg-background p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            onClick={() => void setTab(t === "buy" ? null : t)}
            className={cn(
              "relative h-11 rounded-full text-[0.9375rem] font-semibold transition-colors",
              tab === t ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                className="absolute inset-0 rounded-full bg-primary"
              />
            )}
            <span className="relative">{t === "buy" ? "Buy power" : "Sell surplus"}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "buy" ? <BuyPanel market={market} /> : <SellPanel market={market} />}
      </div>
    </section>
  )
}

function BuyPanel({ market }: { market: MarketModel }) {
  const { status, account } = market
  const offers = useMemo(() => market.listings.filter((l) => !isOwn(l, account)), [market.listings, account])
  const [picked, setPicked] = useState<string | null>(null)
  const selected = offers.find((l) => l.id === picked && !l.pending) ?? offers.find((l) => !l.pending)
  const available = offers.reduce((sum, l) => sum + l.kwh, 0)
  const cheapest = offers.length ? Math.min(...offers.map((l) => l.price)) : undefined
  const reduced = useReducedMotion()

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading offers">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <p className="font-display text-2xl font-bold">Can&rsquo;t reach the market</p>
        <p className="text-muted-foreground">Check your connection and try again.</p>
        <Button variant="outline" onClick={market.retry}>
          <RotateCw data-icon="inline-start" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Solar for sale near you now</p>
        <p className="font-mono text-6xl leading-none font-bold tracking-tight tabular">
          <AnimatedNumber value={available} format={fmtKwh} />
          <span className="ms-2 text-2xl font-medium text-muted-foreground">kWh</span>
        </p>
        {cheapest !== undefined && (
          <p className="text-sm text-muted-foreground">
            from <span className="font-mono font-semibold text-foreground tabular">{formatPrice(cheapest)}</span> {CURRENCY}{" "}
            per kWh, cheaper than a generator
          </p>
        )}
      </div>

      <SunCurve points={market.generation.points} label="Today's solar output in the neighbourhood: metered so far, forecast for the rest of the day" />

      {offers.length === 0 ? (
        <div className="flex flex-col items-start gap-1 rounded-2xl bg-background p-5">
          <p className="font-semibold">No solar for sale right now</p>
          <p className="text-sm text-muted-foreground">Neighbours list surplus when their panels make more than they use. Check back around midday.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Neighbours selling">
          <AnimatePresence initial={false}>
            {offers.map((listing) => (
              <motion.li
                key={listing.id}
                layout={reduced ? false : "position"}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
              >
                <Offer listing={listing} account={account} selected={selected?.id === listing.id} onSelect={() => setPicked(listing.id)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {selected && (
        <Button size="lg" className="h-14 w-full rounded-2xl font-display text-lg font-bold" onClick={() => market.buy(selected)}>
          Load {formatKwh(selected.kwh)} kWh for {formatCusd(selected.kwh * selected.price)} {CURRENCY}
        </Button>
      )}
    </div>
  )
}

function Offer({
  listing,
  account,
  selected,
  onSelect,
}: {
  listing: MarketListing
  account?: string
  selected: boolean
  onSelect: () => void
}) {
  const house = houseById(listing.sellerId)
  const name = house?.name ?? partyName(listing.sellerId, {}, account)
  const where = house ? house.street : "Signed meter reading"
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={listing.pending}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl border bg-background p-3 text-left transition-colors",
        selected ? "border-primary" : "border-transparent hover:border-input",
        listing.pending && "opacity-70",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full font-display font-bold",
          selected ? "bg-primary text-primary-foreground" : "bg-accent",
        )}
      >
        {selected ? <Check className="size-4" /> : name.startsWith("0x") ? <Sun className="size-4" /> : name[0]}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("truncate font-semibold", name.startsWith("0x") && "font-mono text-sm")}>{name}</span>
        <span className="truncate text-xs text-muted-foreground">{listing.pending ? "Settling…" : where}</span>
      </span>
      <span className="ms-auto flex shrink-0 flex-col items-end">
        <span className="font-mono font-semibold tabular">
          {listing.pending ? <Spinner className="inline" /> : null} {formatKwh(listing.kwh)} kWh
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular">{formatPrice(listing.price)} / kWh</span>
      </span>
    </button>
  )
}

function InlineFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex", className)} {...props} />
}

function SellPanel({ market }: { market: MarketModel }) {
  const mine = market.listings.filter((l) => isOwn(l, market.account))
  const [key, setKey] = useState(0)

  return (
    <div className="flex flex-col gap-5">
      <ListSurplusForm
        key={key}
        market={market}
        onDone={() => setKey((k) => k + 1)}
        Footer={InlineFooter}
        compact
      />

      {mine.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Your listings</p>
          <ul className="flex flex-col gap-2">
            {mine.map((l) => (
              <li key={l.id} className="flex items-center justify-between rounded-2xl bg-background px-4 py-3 text-sm">
                <span className="font-mono tabular">
                  {formatKwh(l.kwh)} kWh at {formatPrice(l.price)}
                </span>
                <span className="text-muted-foreground">{l.pending ? "Publishing…" : "Waiting for a buyer"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
