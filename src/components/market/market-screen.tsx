"use client"

import { motion, useReducedMotion, type Variants } from "framer-motion"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
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
  const market = useMarket()
  const [listOpen, setListOpen] = useState(false)
  const reduced = useReducedMotion()

  const item: Variants = reduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 8 },
        show: { opacity: 1, y: 0, transition: { type: "spring", duration: 0.45, bounce: 0 } },
      }

  return (
    <motion.main
      id="main"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8"
    >
      <div className="flex flex-col gap-5">
        <motion.div variants={item} className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 tag">
              <span>
                {NEIGHBORHOOD.name}, {NEIGHBORHOOD.city}
              </span>
              <span aria-hidden>·</span>
              <span className="font-mono tabular">
                {minuteLabel(market.minute)} {NEIGHBORHOOD.timezone}
              </span>
              <Badge variant="outline" className="normal-case tracking-normal sm:hidden">
                Simulated data
              </Badge>
            </p>
            <h1 className="font-display text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">
              Your neighbor&rsquo;s rooftop is your power plant.
            </h1>
          </div>
          <ScenarioSwitch market={market} />
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <motion.div variants={item}>
              <Counters market={market} />
            </motion.div>
            <motion.div variants={item}>
              <GenerationChart market={market} />
            </motion.div>
          </div>
          <motion.div variants={item} className="lg:col-span-4">
            <TradeTape market={market} onListSurplus={() => setListOpen(true)} />
          </motion.div>
        </div>
      </div>

      <motion.div variants={item}>
        <Listings market={market} onListSurplus={() => setListOpen(true)} />
      </motion.div>

      <motion.div variants={item}>
        <VerifyStrip />
      </motion.div>

      <ListSurplusDialog market={market} open={listOpen} onOpenChange={setListOpen} />
    </motion.main>
  )
}
