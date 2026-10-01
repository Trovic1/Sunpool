"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Plus, Store } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { Market, MarketListing } from "@/hooks/use-market"
import { formatCusd, formatKwh, formatPrice, minuteLabel, partyName } from "@/lib/format"
import { DEMO_SELLER, houseById } from "@/lib/seed"
import { cn } from "@/lib/utils"

export function Listings({ market, onListSurplus }: { market: Market; onListSurplus: () => void }) {
  const { listings, status, suggestion } = market
  const reduced = useReducedMotion()

  return (
    <section aria-labelledby="listings-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="tag">Buy from a neighbor</p>
          <h2 id="listings-heading" className="font-display text-3xl font-medium tracking-tight">
            Open listings
          </h2>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            Each listing is backed by a meter reading that can be claimed once. The suggested fair
            price right now is{" "}
            <span className="font-mono text-foreground tabular">{formatPrice(suggestion.price)}</span>{" "}
            USDm/kWh.
          </p>
        </div>
        <Button size="lg" onClick={onListSurplus}>
          <Plus data-icon="inline-start" />
          List surplus
        </Button>
      </div>

      {status === "loading" ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading listings">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Empty className="border border-dashed border-foreground/40">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Store />
            </EmptyMedia>
            <EmptyTitle className="font-display text-lg">No open listings</EmptyTitle>
            <EmptyDescription>
              Listings appear when rooftops report surplus. If you have panels, you can list first.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={onListSurplus}>
              List surplus
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-foreground">
          <AnimatePresence initial={false}>
            {listings.map((listing) => (
              <motion.li
                key={listing.id}
                layout={reduced ? false : "position"}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                className="border-b border-rule bg-background last:border-b-0"
              >
                <ListingRow listing={listing} account={market.account} onBuy={() => market.buy(listing)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  )
}

function ListingRow({
  listing,
  account,
  onBuy,
}: {
  listing: MarketListing
  account?: string
  onBuy: () => void
}) {
  const house = houseById(listing.sellerId)
  const own = account
    ? listing.sellerId.toLowerCase() === account.toLowerCase()
    : listing.sellerId === DEMO_SELLER.id
  const sellerName = house?.name ?? partyName(listing.sellerId, {}, account)
  const total = listing.kwh * listing.price
  const listedAt =
    listing.listedAt !== undefined
      ? new Date(listing.listedAt * 1000).toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Lagos",
        })
      : undefined

  return (
    <article className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 p-4 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex items-center gap-2 font-medium">
          <span className={cn("truncate", sellerName.startsWith("0x") && "font-mono text-[0.9375rem]")} title={listing.sellerId}>
            {sellerName}
          </span>
          {own && <Badge variant="outline">Your listing</Badge>}
          {listing.pending && (
            <Badge variant="accent">
              <Spinner />
              Pending
            </Badge>
          )}
        </p>
        <p className="text-xs text-pretty text-muted-foreground">
          {house ? (
            <>
              {house.street} · {house.panelKw} kW rooftop
              {listing.untilMinute !== undefined && (
                <>
                  {" "}
                  · until <span className="font-mono tabular">{minuteLabel(listing.untilMinute)}</span>
                </>
              )}
            </>
          ) : (
            <>
              Signed meter reading
              {listedAt && (
                <>
                  {" "}
                  · listed <span className="font-mono tabular">{listedAt}</span> WAT
                </>
              )}
            </>
          )}
        </p>
      </div>

      <dl className="col-span-2 row-start-2 grid grid-cols-3 gap-4 text-sm sm:col-span-3 sm:col-start-2 sm:row-start-1">
        <div className="flex flex-col">
          <dt className="tag">Energy</dt>
          <dd className="font-mono tabular">{formatKwh(listing.kwh)} kWh</dd>
        </div>
        <div className="flex flex-col">
          <dt className="tag">Price</dt>
          <dd className="font-mono tabular">
            {formatPrice(listing.price)}
            <span className="text-muted-foreground">/kWh</span>
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="tag">Total</dt>
          <dd className="font-mono tabular">{formatCusd(total)} USDm</dd>
        </div>
      </dl>

      <div className="col-start-2 row-start-1 sm:col-start-5">
        <Button
          variant="outline"
          onClick={onBuy}
          disabled={listing.pending || own}
          aria-label={
            !listing.pending && !own
              ? `Buy ${formatKwh(listing.kwh)} kWh from ${sellerName} for ${formatCusd(total)} USDm`
              : undefined
          }
          className="min-w-24"
        >
          {listing.pending ? <Spinner data-icon="inline-start" /> : null}
          {listing.pending ? (own ? "Publishing" : "Settling") : own ? "Listed" : "Buy"}
        </Button>
      </div>
    </article>
  )
}
