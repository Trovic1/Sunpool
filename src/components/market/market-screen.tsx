"use client"

import { useQueryState } from "nuqs"
import { useEffect } from "react"

import type { MarketModel } from "@/hooks/market-types"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useMarket } from "@/hooks/use-market"
import { Skeleton } from "@/components/ui/skeleton"
import { formatKwh, minuteLabel } from "@/lib/format"
import { NEIGHBORHOOD } from "@/lib/seed"

import { HowItWorks } from "./how-it-works"
import { ScenarioSwitch } from "./scenario-switch"
import { TradePanel } from "./trade-panel"

export function MarketScreen() {
  const source = useDataSource()
  return source === "chain" ? <ChainMarket /> : <SeededMarket />
}

function ChainMarket() {
  // ?state= only drives the seeded demo; drop it so on-chain URLs stay clean.
  const [state, setState] = useQueryState("state")
  useEffect(() => {
    if (state) void setState(null)
  }, [state, setState])
  return <MarketView market={useChainMarket()} />
}

function SeededMarket() {
  return <MarketView market={useMarket()} />
}

function MarketView({ market }: { market: MarketModel }) {
  const chain = market.mode === "chain"
  const { totals } = market
  const loading = market.status === "loading"

  return (
    <section
      id="market"
      aria-labelledby="market-heading"
      className="mx-auto flex w-full max-w-6xl scroll-mt-28 flex-col gap-20 px-4 py-8 sm:px-6 sm:py-14 md:scroll-mt-20"
    >
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="enter w-fit rounded-full border border-border px-3 py-1 text-sm text-muted-foreground" style={{ "--enter-i": 0 } as React.CSSProperties}>
            {NEIGHBORHOOD.name}, {NEIGHBORHOOD.city}
            <span className="ms-2 font-mono tabular">
              {minuteLabel(market.minute)} {NEIGHBORHOOD.timezone}
            </span>
          </p>
          <h1 id="market-heading" style={{ "--enter-i": 1 } as React.CSSProperties} className="enter font-display text-[2.75rem] leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
            Prepaid power from your <span className="text-accent-text">neighbour&rsquo;s roof.</span>
          </h1>
          <p className="enter max-w-md text-lg text-pretty text-muted-foreground" style={{ "--enter-i": 2 } as React.CSSProperties}>
            Load solar units from the house next door. Cheaper than a generator, paid from your phone.
          </p>
          <dl className="enter flex flex-wrap gap-x-8 gap-y-3 pt-2" style={{ "--enter-i": 3 } as React.CSSProperties}>
            <Stat label={chain ? "Traded on Celo" : "Traded today"} value={`${formatKwh(totals.kwh)} kWh`} loading={loading} />
            <Stat label="Certificates" value={String(totals.certificates)} loading={loading} />
            <Stat label="CO₂ avoided (est.)" value={`${formatKwh(totals.co2Kg)} kg`} loading={loading} />
          </dl>
        </div>
        <div className="enter" style={{ "--enter-i": 2 } as React.CSSProperties}>
          <TradePanel market={market} />
        </div>
      </div>

      <div className="reveal">
        <HowItWorks />
      </div>

      {!chain && (
        <div className="flex justify-center">
          <ScenarioSwitch market={market} />
        </div>
      )}
    </section>
  )
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xl font-semibold tabular">
        {loading ? <Skeleton className="mt-1 h-6 w-20 bg-foreground/10" aria-label="Loading" /> : value}
      </dd>
    </div>
  )
}
