"use client"

import { useRouter } from "next/navigation"

import type { MarketModel } from "@/hooks/market-types"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useMarket } from "@/hooks/use-market"
import { SectionShell, SectionTitle } from "@/components/site/section-shell"

import { Counters } from "./counters"
import { GenerationChart } from "./generation-chart"
import { TradeTape } from "./trade-tape"

export function ActivityScreen({ embedded = false }: { embedded?: boolean }) {
  const source = useDataSource()
  return source === "chain" ? <ChainActivity embedded={embedded} /> : <SeededActivity embedded={embedded} />
}

function ChainActivity({ embedded }: { embedded: boolean }) {
  return <ActivityView market={useChainMarket()} embedded={embedded} />
}

function SeededActivity({ embedded }: { embedded: boolean }) {
  return <ActivityView market={useMarket()} embedded={embedded} />
}

function ActivityView({ market, embedded }: { market: MarketModel; embedded: boolean }) {
  const router = useRouter()
  const toSell = () => router.push("/?tab=sell#market")

  return (
    <SectionShell id="activity" embedded={embedded} className="gap-10">
      <div className="reveal flex flex-col gap-3">
        <SectionTitle id="activity" embedded={embedded} className="text-5xl sm:text-6xl">
          Activity
        </SectionTitle>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          {market.mode === "chain"
            ? "Every trade settled on Celo Sepolia, and today's solar output."
            : "Simulated trades and today's solar output in Surulere."}
        </p>
      </div>
      {/* On the home page the hero already shows these totals. */}
      {!embedded && (
        <div className="reveal rounded-3xl border border-border bg-card p-6">
          <Counters market={market} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="reveal lg:col-span-8">
          <GenerationChart market={market} />
        </div>
        <div className="reveal lg:col-span-4">
          <TradeTape market={market} onListSurplus={toSell} />
        </div>
      </div>
    </SectionShell>
  )
}
