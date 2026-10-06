"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, ArrowUpRight, BadgeCheck, CloudOff, Pause, Play, RotateCw, Sunrise } from "lucide-react"

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { explorerTx } from "@/lib/chain/contracts"
import { CURRENCY, formatCusd, formatKwh, formatPrice, minuteLabel, partyName } from "@/lib/format"
import { DEMO_BUYER, HOUSES, NEIGHBORHOOD } from "@/lib/seed"
import type { MarketTrade } from "@/hooks/market-types"
import type { Market } from "@/hooks/use-market"
import { cn } from "@/lib/utils"

const VISIBLE_ROWS = 30

export function TradeTape({ market, onListSurplus }: { market: Market; onListSurplus: () => void }) {
  const { trades, status, scenario, paused, togglePaused, retry, announcement, mode } = market
  const isLive = scenario === "live" && status === "ready"
  const chain = mode === "chain"

  return (
    <Card className="h-full min-h-0 gap-0 pb-0">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-xl font-bold">
          <h2>Trade tape</h2>
          <LiveIndicator live={isLive && !paused} paused={isLive && paused} />
        </CardTitle>
        <CardDescription>
          {chain ? "Settled on Celo Sepolia, newest first." : `Settled trades in ${NEIGHBORHOOD.name}, newest first.`}
        </CardDescription>
        {isLive && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={togglePaused} aria-pressed={paused}>
              {paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
              {paused ? "Resume" : "Pause"}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {/* Stable polite region: announces each new trade without moving focus. */}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <CardContent className="relative flex min-h-0 flex-1 flex-col px-0">
        {status === "loading" && <TapeSkeleton />}

        {(status === "error" || status === "reconnecting") && (
          <div className="p-4">
            <Alert variant="destructive">
              <CloudOff />
              <AlertTitle>Trade feed unavailable</AlertTitle>
              <AlertDescription>
                {chain
                  ? "Unable to reach Celo Sepolia. Check your connection, then retry."
                  : `No updates since ${minuteLabel(market.minute)} WAT. Check your connection, then retry.`}
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={retry} disabled={status === "reconnecting"}>
                  {status === "reconnecting" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <RotateCw data-icon="inline-start" />
                  )}
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          </div>
        )}

        {status === "ready" && trades.length === 0 && (
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Sunrise />
              </EmptyMedia>
              <EmptyTitle className="font-display text-lg font-bold">
                {chain ? "No trades settled yet" : "No trades yet today"}
              </EmptyTitle>
              <EmptyDescription>
                {chain
                  ? "Every purchase on the market lands here with its transaction. List surplus or buy a listing to make the first one."
                  : `Rooftops start producing around ${minuteLabel(NEIGHBORHOOD.sunriseMinutes)} WAT. You can schedule a listing from the forecast now.`}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onListSurplus}>
                {chain ? "List surplus" : "Schedule a listing"}
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {status === "ready" && trades.length > 0 && (
          <TapeList trades={trades.slice(0, VISIBLE_ROWS)} account={market.account} />
        )}

        {status === "ready" && trades.length > 0 && trades.length < VISIBLE_ROWS && (
          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border px-6 py-4 text-sm text-muted-foreground">
            <span>That&rsquo;s every trade so far.</span>
            <Button variant="link" size="sm" className="h-auto px-0" onClick={onListSurplus}>
              List surplus
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function LiveIndicator({ live, paused }: { live: boolean; paused: boolean }) {
  if (!live && !paused) return null
  return (
    <Badge variant={live ? "accent" : "outline"} className="font-sans">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          live ? "bg-foreground motion-safe:animate-pulse" : "bg-muted-foreground",
        )}
      />
      {live ? "Live" : "Paused"}
    </Badge>
  )
}

function TapeList({ trades, account }: { trades: MarketTrade[]; account?: string }) {
  const reduced = useReducedMotion()
  return (
    <div className="relative h-full">
      <ol
        className="flex max-h-[26rem] flex-col overflow-y-auto overscroll-contain lg:max-h-none lg:absolute lg:inset-0"
        aria-label="Recent trades"
        tabIndex={0}
      >
        <AnimatePresence initial={false}>
          {trades.map((trade) => (
            <motion.li
              key={trade.id}
              layout={reduced ? false : "position"}
              initial={
                reduced
                  ? { opacity: 0 }
                  : { opacity: 0, y: -12, backgroundColor: "rgba(200, 242, 90, 0.22)" }
              }
              animate={{ opacity: 1, y: 0, backgroundColor: "rgba(200, 242, 90, 0)" }}
              exit={{ opacity: 0, y: 4 }}
              transition={{
                type: "spring",
                duration: 0.35,
                bounce: 0,
                backgroundColor: { duration: 1.6, ease: "easeOut" },
              }}
              className="border-b border-rule last:border-b-0"
            >
              <TradeRow trade={trade} account={account} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
      />
    </div>
  )
}

const HOUSE_NAMES: Record<string, string> = Object.fromEntries(HOUSES.map((h) => [h.id, h.name]))

function TradeRow({ trade, account }: { trade: MarketTrade; account?: string }) {
  const seller = partyName(trade.sellerId, HOUSE_NAMES, account)
  const buyer = trade.buyerId === DEMO_BUYER.id ? "You" : partyName(trade.buyerId, HOUSE_NAMES, account)
  const mine = buyer === "You"
  const total = trade.kwh * trade.price
  const readingLabel =
    trade.readingId.length > 24 ? `${trade.readingId.slice(0, 10)}…${trade.readingId.slice(-6)}` : trade.readingId

  return (
    <article className="grid grid-cols-[3rem_1fr_auto] items-start gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
      <time
        className="pt-px font-mono text-xs text-muted-foreground tabular"
        dateTime={trade.timestamp ? new Date(trade.timestamp * 1000).toISOString() : undefined}
        title={trade.timestamp ? new Date(trade.timestamp * 1000).toLocaleString() : undefined}
      >
        {minuteLabel(trade.minute)}
      </time>

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-medium leading-snug">
          <span className="break-words">{seller}</span>
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">sold to</span>
          <span className={cn("break-words", mine && "text-accent-text")}>{buyer}</span>
        </p>
        <p className="font-mono text-[0.6875rem] text-muted-foreground" title={trade.readingId}>
          <span className="sr-only">Reading </span>
          {readingLabel}
        </p>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <p className="font-mono tabular">
          {formatKwh(trade.kwh)}
          <span className="text-muted-foreground"> kWh</span>
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular">
          {formatCusd(total)} {CURRENCY} <span className="hidden sm:inline">@ {formatPrice(trade.price)}</span>
        </p>
        {trade.status === "pending" ? (
          <Badge variant="outline" className="mt-0.5">
            <Spinner />
            Pending
          </Badge>
        ) : (
          <span className="sr-only">Settled, certificate minted.</span>
        )}
      </div>

      {trade.status === "settled" && (
        <p className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BadgeCheck aria-hidden className="size-3.5 text-success" />
            REC {trade.certificateId ? `#${trade.certificateId}` : "minted"}
          </span>
          {trade.txHash && (
            <a
              href={explorerTx(trade.txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Transaction
              <ArrowUpRight aria-hidden className="size-3" />
              <span className="sr-only"> (opens Blockscout in a new tab)</span>
            </a>
          )}
        </p>
      )}
    </article>
  )
}

function TapeSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading trades">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="grid grid-cols-[3rem_1fr_auto] gap-3 border-b border-rule px-4 py-3">
          <Skeleton className="h-3 w-10" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
