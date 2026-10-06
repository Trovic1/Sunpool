"use client"

import { CloudSun, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import type { VerificationState } from "@/hooks/use-verification"
import { formatKwh } from "@/lib/format"
import { PERFORMANCE_RATIO, SELF_CONSUMPTION_FLOOR_W, type Verdict } from "@/lib/verify"
import { cn } from "@/lib/utils"

const VERDICT: Record<Verdict, { title: string; icon: typeof ShieldCheck; tone: string }> = {
  accept: { title: "Looks right", icon: ShieldCheck, tone: "text-accent-text" },
  review: { title: "Unusual, flagged for review", icon: ShieldAlert, tone: "text-foreground" },
  reject: { title: "Meter won't sign this", icon: ShieldX, tone: "text-destructive" },
}

/** The AI verification result for a reading, shown before the meter signs. */
export function VerificationPanel({
  state,
  onUseMax,
}: {
  state: VerificationState
  /** Set the amount to what the roof can still spare. */
  onUseMax?: (kwh: number) => void
}) {
  if (state.status === "idle") return null

  if (state.status === "error") {
    return (
      <aside aria-live="polite" className="flex flex-col gap-1 rounded-2xl bg-background p-4 text-sm">
        <p className="flex items-center gap-2 font-semibold">
          <ShieldAlert aria-hidden className="size-4 text-muted-foreground" />
          AI verification unavailable
        </p>
        <p className="text-muted-foreground">{state.message} The meter still checks again before it signs.</p>
      </aside>
    )
  }

  const result = state.result
  if (!result) {
    return (
      <aside aria-live="polite" aria-busy="true" className="flex items-center gap-2 rounded-2xl bg-background p-4 text-sm text-muted-foreground">
        <Spinner />
        Checking the reading against today&rsquo;s sun…
      </aside>
    )
  }

  const v = VERDICT[result.verdict]
  const Icon = v.icon
  const maxKwh = Math.floor(result.headroomWh / 100) / 10
  const canUseMax = result.verdict === "reject" && maxKwh >= 0.1 && result.wh > result.headroomWh && onUseMax

  return (
    <aside
      aria-live="polite"
      aria-busy={state.status === "checking" ? true : undefined}
      aria-label="AI verification"
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-background p-4 text-sm transition-opacity",
        result.verdict === "reject" ? "border-destructive/40" : "border-transparent",
        state.status === "checking" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", v.tone)} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-xs text-muted-foreground">AI verification</p>
          <p className={cn("font-semibold", result.verdict === "reject" && "text-destructive")}>{v.title}</p>
        </div>
        <p className="flex shrink-0 flex-col items-end">
          <span className="text-xs text-muted-foreground">risk</span>
          <span className="font-mono font-semibold tabular">
            {state.status === "checking" ? <Spinner className="inline size-3" /> : result.risk.toFixed(2)}
          </span>
        </p>
      </div>

      <ul className="flex flex-col gap-1 text-muted-foreground">
        {result.reasons.map((r) => (
          <li key={r} className="text-pretty">
            {r}
          </li>
        ))}
      </ul>

      {canUseMax && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onUseMax(maxKwh)}>
          Use {formatKwh(maxKwh)} kWh
        </Button>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CloudSun aria-hidden className="size-3.5" />
          {result.source === "Open-Meteo" ? "Sun: Open-Meteo forecast for Surulere" : "Sun: modeled clear sky"}
        </span>
        <span className="font-mono tabular">
          limit {formatKwh(result.boundWh / 1000)} kWh · {result.kWp} kWp
        </span>
      </div>

      <details className="group text-xs text-muted-foreground">
        <summary className="cursor-pointer rounded-sm font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          How it decides
        </summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 ps-4 text-pretty">
          <li>Daylight only: no new surplus before sunrise or after sunset.</li>
          <li>
            Physical limit: your kWp × today&rsquo;s sunlight so far × {PERFORMANCE_RATIO} (typical system losses), minus
            at least {SELF_CONSUMPTION_FLOOR_W} W your home uses, minus what you already listed today on Celo.
          </li>
          <li>Neighbours: how far the amount sits from recent listings by other sellers.</li>
          <li>
            Risk = 0.60 × share of the limit used + 0.25 × outlier vs neighbours + 0.15 × low sun. Above 0.70, or
            any hard rule broken, the meter refuses to sign; 0.40–0.70 is flagged for review.
          </li>
          <li>A transparent rule-based check, not a trained model. Meter data is simulated.</li>
        </ul>
      </details>
    </aside>
  )
}
