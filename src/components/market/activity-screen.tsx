"use client"

import { useRouter } from "next/navigation"

import type { MarketModel } from "@/hooks/market-types"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useMarket } from "@/hooks/use-market"

import { Counters } from "./counters"
import { GenerationChart } from "./generation-chart"
import { TradeTape } from "./trade-tape"

export function ActivityScreen() {
  const source = useDataSource()
  return source === "chain" ? <ChainActivity /> : <SeededActivity />
}

function ChainActivity() {
  return <ActivityView market={useChainMarket()} />
}

function SeededActivity() {
  return <ActivityView market={useMarket()} />
}

function ActivityView({ market }: { market: MarketModel }) {
  const router = useRouter()
  const toSell = () => router.push("/?tab=sell")

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-14">
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl">Activity</h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          {market.mode === "chain"
            ? "Every trade settled on Celo Sepolia, and today's solar output."
            : "Simulated trades and today's solar output in Surulere."}
        </p>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6">
        <Counters market={market} />
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GenerationChart market={market} />
        </div>
        <div className="lg:col-span-4">
          <TradeTape market={market} onListSurplus={toSell} />
        </div>
      </div>
    </main>
  )
}
