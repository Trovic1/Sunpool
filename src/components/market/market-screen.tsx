"use client"

import { useQueryState } from "nuqs"
import { useEffect } from "react"

import type { MarketModel } from "@/hooks/market-types"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useMarket } from "@/hooks/use-market"
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

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 py-8 sm:px-6 sm:py-14">
      <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div className="flex flex-col gap-6">
          <p className="w-fit rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
            {NEIGHBORHOOD.name}, {NEIGHBORHOOD.city}
            <span className="ms-2 font-mono tabular">
              {minuteLabel(market.minute)} {NEIGHBORHOOD.timezone}
            </span>
          </p>
          <h1 id="market-heading" className="font-display text-[2.75rem] leading-[0.95] font-extrabold sm:text-6xl lg:text-7xl">
            Prepaid power from your <span className="text-accent-text">neighbour&rsquo;s roof.</span>
          </h1>
          <p className="max-w-md text-lg text-pretty text-muted-foreground">
            Load solar units from the house next door. Cheaper than a generator, paid from your phone.
          </p>
          <dl className="flex flex-wrap gap-x-8 gap-y-3 pt-2">
            <Stat label={chain ? "Traded on Celo" : "Traded today"} value={`${formatKwh(totals.kwh)} kWh`} />
            <Stat label="Certificates" value={String(totals.certificates)} />
            <Stat label="CO₂ avoided (est.)" value={`${formatKwh(totals.co2Kg)} kg`} />
          </dl>
        </div>
        <TradePanel market={market} />
      </div>

      <HowItWorks />

      {!chain && (
        <div className="flex justify-center">
          <ScenarioSwitch market={market} />
        </div>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xl font-semibold tabular">{value}</dd>
    </div>
  )
}
