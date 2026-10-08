"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { Check, ChevronDown, RotateCw, Sparkles } from "lucide-react"
import { useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { MatchResponse } from "@/hooks/use-match"
import { formatCusd, formatKwh, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
  plan: MatchResponse | undefined
  loading: boolean
  error: boolean
  onRetry: () => void
  applied: boolean
  onApply: () => void
  nameOf: (sellerId: string) => string
}

/** One line with the best fill for the request, reasons behind a disclosure, one tap to select it. */
export function BestMatch({ plan, loading, error, onRetry, applied, onApply, nameOf }: Props) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()
  const panelId = useId()

  if (loading) return <Skeleton className="h-14 w-full rounded-2xl" aria-label="Ranking offers" />

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3 text-sm">
        <span className="text-muted-foreground">Couldn&rsquo;t rank offers just now.</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw data-icon="inline-start" />
          Retry
        </Button>
      </div>
    )
  }

  if (!plan || plan.status === "none") return null
  const n = plan.picks.length
  const currency = plan.currency

  return (
    <div className="rounded-2xl border border-primary/30 bg-background">
      <div className="flex items-center gap-3 p-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">
              Best match: {n} {n === 1 ? "offer" : "offers"}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground tabular">
              {formatKwh(plan.filledKwh)} kWh for {formatCusd(plan.totalCost)} {currency}
              {plan.status === "partial" ? ", all that is left" : ""}
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn("ms-auto size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          />
          <span className="sr-only">{open ? "Hide reasons" : "Show reasons"}</span>
        </button>
        <Button size="sm" variant={applied ? "secondary" : "default"} onClick={onApply} disabled={applied} className="shrink-0">
          {applied ? <Check data-icon="inline-start" /> : null}
          {applied ? "Selected" : "Select"}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-4 border-t border-border p-4 text-sm">
              <p>{plan.summary}</p>
              <ol className="flex flex-col gap-3">
                {plan.picks.map((p, i) => (
                  <li key={p.listingId} className="flex flex-col gap-1">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">
                        {i + 1}. {nameOf(p.sellerId)}
                      </span>
                      <span className="font-mono text-xs tabular">
                        {formatKwh(p.kwh)} kWh at {formatPrice(p.price)}
                      </span>
                    </p>
                    <ul className="list-disc ps-5 text-muted-foreground">
                      {p.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
              <p className="text-muted-foreground">
                Averages{" "}
                <span className="font-mono text-foreground tabular">
                  {plan.avgPrice === null ? "n/a" : formatPrice(plan.avgPrice)} {currency}/kWh
                </span>
                . A petrol generator costs about{" "}
                <span className="font-mono text-foreground tabular">₦{plan.generator.ngnPerKwh}/kWh</span> ({plan.generator.source}).
                {plan.savingVsAverageAsk !== null && plan.savingVsAverageAsk > 0.005
                  ? ` That is ${formatCusd(plan.savingVsAverageAsk)} ${currency} less than paying the average ask.`
                  : ""}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
