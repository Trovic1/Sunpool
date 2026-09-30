"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowRight, BadgeCheck, CloudOff, Pause, Play, RotateCw, Sunrise } from "lucide-react"

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
import { formatCusd, formatKwh, formatPrice, minuteLabel } from "@/lib/format"
import { DEMO_BUYER, NEIGHBORHOOD, houseById, type Trade } from "@/lib/seed"
import type { Market } from "@/hooks/use-market"
import { cn } from "@/lib/utils"

const VISIBLE_ROWS = 30

export function TradeTape({ market, onListSurplus }: { market: Market; onListSurplus: () => void }) {
  const { trades, status, scenario, paused, togglePaused, retry, announcement } = market
  const isLive = scenario === "live" && status === "ready"

  return (
    <Card className="h-full min-h-0 gap-0 pb-0">
      <CardHeader className="border-b border-foreground pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-xl font-medium">
          <h2>Trade tape</h2>
          <LiveIndicator live={isLive && !paused} paused={isLive && paused} />
        </CardTitle>
        <CardDescription>Settled trades in {NEIGHBORHOOD.name}, newest first.</CardDescription>
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

      <CardContent className="relative min-h-0 flex-1 px-0">
        {status === "loading" && <TapeSkeleton />}

        {(status === "error" || status === "reconnecting") && (
          <div className="p-4">
            <Alert variant="destructive">
              <CloudOff />
              <AlertTitle>Trade feed unavailable</AlertTitle>
              <AlertDescription>
                No updates since {minuteLabel(market.minute)} WAT. Check your connection, then retry.
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
              <EmptyTitle className="font-display text-lg">No trades yet today</EmptyTitle>
              <EmptyDescription>
                Rooftops start producing around {minuteLabel(NEIGHBORHOOD.sunriseMinutes)} WAT. You
                can schedule a listing from the forecast now.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onListSurplus}>
                Schedule a listing
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {status === "ready" && trades.length > 0 && (
          <TapeList trades={trades.slice(0, VISIBLE_ROWS)} />
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
          live ? "bg-primary motion-safe:animate-pulse" : "bg-muted-foreground",
        )}
      />
      {live ? "Live" : "Paused"}
    </Badge>
  )
}

function TapeList({ trades }: { trades: Trade[] }) {
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
                  : { opacity: 0, y: -12, backgroundColor: "rgba(253, 238, 228, 1)" }
              }
              animate={{ opacity: 1, y: 0, backgroundColor: "rgba(253, 238, 228, 0)" }}
              exit={{ opacity: 0, y: 4 }}
              transition={{
                type: "spring",
                duration: 0.35,
                bounce: 0,
                backgroundColor: { duration: 1.6, ease: "easeOut" },
              }}
              className="border-b border-rule last:border-b-0"
            >
              <TradeRow trade={trade} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent"
      />
    </div>
  )
}

function TradeRow({ trade }: { trade: Trade }) {
  const seller = houseById(trade.sellerId)
  const buyer = houseById(trade.buyerId)
  const mine = trade.buyerId === DEMO_BUYER.id
  const total = trade.kwh * trade.price

  return (
    <article className="grid grid-cols-[3rem_1fr_auto] items-start gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
      <time className="pt-px font-mono text-xs text-muted-foreground tabular">{minuteLabel(trade.minute)}</time>

      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="flex min-w-0 items-center gap-1.5 font-medium">
          <span className="truncate">{seller?.name}</span>
          <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="sr-only">sold to</span>
          <span className={cn("truncate", mine && "text-accent-text")}>{buyer?.name}</span>
        </p>
        <p className="font-mono text-[0.6875rem] break-all text-muted-foreground">{trade.readingId}</p>
      </div>

      <div className="flex flex-col items-end gap-0.5">
        <p className="font-mono tabular">
          {formatKwh(trade.kwh)}
          <span className="text-muted-foreground"> kWh</span>
        </p>
        <p className="font-mono text-xs text-muted-foreground tabular">
          {formatCusd(total)} cUSD <span className="hidden sm:inline">@ {formatPrice(trade.price)}</span>
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
        <p className="col-start-2 flex items-center gap-1 text-xs text-muted-foreground">
          <BadgeCheck aria-hidden className="size-3.5 text-success" />
          REC minted
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
