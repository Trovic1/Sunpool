"use client"

import { ArrowUpRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { CURRENCY, formatCusd, formatKwh } from "@/lib/format"
import { EMISSION_FACTOR } from "@/lib/seed"
import type { Market } from "@/hooks/use-market"

import { AnimatedNumber } from "./animated-number"

const fmtKwh = (n: number) => formatKwh(n)
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US")
const fmtKg = (n: number) => formatKwh(n)

export function Counters({ market }: { market: Market }) {
  const { totals, status, mode } = market
  const chain = mode === "chain"
  const loading = status === "loading"

  return (
    <section
      aria-labelledby="counters-heading"
      className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-foreground bg-foreground sm:grid-cols-[1.5fr_1fr_1fr]"
    >
      <h2 id="counters-heading" className="sr-only">
        Today&rsquo;s totals
      </h2>

      <div className="col-span-2 flex flex-col gap-1 bg-background p-4 sm:col-span-1 sm:p-5">
        <p className="tag">{chain ? "Energy traded on-chain" : "Energy traded today"}</p>
        {loading ? (
          <Skeleton className="h-12 w-40" />
        ) : (
          <p className="font-mono text-5xl leading-none font-medium tracking-tight text-primary tabular sm:text-6xl">
            <AnimatedNumber value={totals.kwh} format={fmtKwh} />
            <span className="ms-1.5 text-xl font-normal text-muted-foreground sm:text-2xl">kWh</span>
          </p>
        )}
        {loading ? (
          <Skeleton className="h-5 w-48" />
        ) : (
          <p className="text-sm text-muted-foreground">
            <span className="font-mono tabular text-foreground">{formatCusd(totals.cusd)}</span> {CURRENCY}{" "}
            {chain ? "settled on Celo Sepolia" : "settled between neighbors"}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1 bg-background p-4 sm:p-5">
        <p className="tag">Certificates minted</p>
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <p className="font-mono text-3xl leading-none font-medium tabular sm:text-4xl">
            <AnimatedNumber value={totals.certificates} format={fmtInt} />
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          {chain ? "ERC-721, one per verified reading" : "One per verified reading"}
        </p>
      </div>

      <div className="flex flex-col gap-1 bg-background p-4 sm:p-5">
        <p className="tag">CO&#8322; avoided (est.)</p>
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="font-mono text-3xl leading-none font-medium tabular sm:text-4xl">
            <AnimatedNumber value={totals.co2Kg} format={fmtKg} />
            <span className="ms-1 text-base text-muted-foreground">kg</span>
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          <span className="font-mono tabular">× {EMISSION_FACTOR.kgPerKwh}</span> kg CO&#8322;e/kWh,{" "}
          <a
            href={EMISSION_FACTOR.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {EMISSION_FACTOR.label}
            <ArrowUpRight aria-hidden className="size-3" />
            <span className="sr-only"> (source: {EMISSION_FACTOR.source}, opens in a new tab)</span>
          </a>
        </p>
      </div>
    </section>
  )
}
