"use client"

import { Plus } from "lucide-react"
import { useQueryState } from "nuqs"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import type { MarketModel } from "@/hooks/market-types"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useMarket } from "@/hooks/use-market"
import { minuteLabel } from "@/lib/format"
import { NEIGHBORHOOD } from "@/lib/seed"

import { Counters } from "./counters"
import { GenerationChart } from "./generation-chart"
import { ListSurplusDialog } from "./list-surplus-dialog"
import { Listings } from "./listings"
import { ScenarioSwitch } from "./scenario-switch"
import { TradeTape } from "./trade-tape"
import { VerifyStrip } from "./verify-strip"

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
  const [listOpen, setListOpen] = useState(false)

  return (
    <main id="main" className="flex w-full flex-col">
      {/* Sun band: the one coloured field. Everything on it is ink. */}
      <section aria-labelledby="market-heading" className="bg-sun text-sun-foreground">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-sun-muted">
              <span>
                {NEIGHBORHOOD.name}, {NEIGHBORHOOD.city}
              </span>
              <span className="font-mono tabular">
                {minuteLabel(market.minute)} {NEIGHBORHOOD.timezone}
              </span>
              <span className="rounded-full bg-foreground px-2 py-0.5 text-xs text-background sm:hidden">
                {chain ? "Celo Sepolia testnet" : "Simulated data"}
              </span>
            </p>
            <h1
              id="market-heading"
              className="font-display text-4xl leading-[1.02] font-bold text-balance sm:text-5xl xl:text-6xl"
            >
              Your neighbor&rsquo;s rooftop is your power plant.
            </h1>
            <p className="max-w-md text-pretty text-sun-muted">
              Buy surplus solar from the house next door. Every kWh is backed by one meter reading, certified
              once.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button variant="ink" size="lg" onClick={() => setListOpen(true)}>
                <Plus data-icon="inline-start" />
                List surplus
              </Button>
              <Button asChild variant="ghost" size="lg" className="hover:bg-foreground/10">
                <a href="#listings">Browse listings</a>
              </Button>
            </div>
          </div>
          <div className="lg:col-span-5">
            <Counters market={market} />
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-14 px-4 py-8 sm:px-6 sm:py-10">
        {!chain && (
          <div className="-mb-8 flex justify-end">
            <ScenarioSwitch market={market} />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <GenerationChart market={market} />
          </div>
          <div className="lg:col-span-4">
            <TradeTape market={market} onListSurplus={() => setListOpen(true)} />
          </div>
        </div>

        <Listings market={market} onListSurplus={() => setListOpen(true)} />

        <VerifyStrip />
      </div>

      <ListSurplusDialog market={market} open={listOpen} onOpenChange={setListOpen} />
    </main>
  )
}
