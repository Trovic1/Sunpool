"use client"

import { ArrowUpRight } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import type { MarketModel } from "@/hooks/market-types"
import { CURRENCY, formatCusd, formatKwh } from "@/lib/format"
import { EMISSION_FACTOR } from "@/lib/seed"

import { AnimatedNumber } from "./animated-number"

const fmtKwh = (n: number) => formatKwh(n)
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US")

/** Totals: energy traded, certificates and estimated CO₂. */
export function Counters({ market }: { market: MarketModel }) {
  const { totals, status, mode } = market
  const chain = mode === "chain"
  const loading = status === "loading"

  return (
    <section aria-labelledby="counters-heading" className="w-full">
      <h2 id="counters-heading" className="sr-only">
        {chain ? "Totals on Celo Sepolia" : "Today's totals"}
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-[1.6fr_1fr_1fr] lg:grid-cols-2">
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1 lg:col-span-2">
          <dt className="text-sm font-medium text-muted-foreground">{chain ? "Energy traded" : "Energy traded today"}</dt>
          <dd className="flex flex-col gap-1">
            {loading ? (
              <Skeleton className="h-16 w-48 bg-foreground/10" />
            ) : (
              <span className="font-mono text-6xl leading-none font-semibold tracking-tight tabular sm:text-7xl">
                <AnimatedNumber value={totals.kwh} format={fmtKwh} />
                <span className="ms-2 text-2xl font-medium">kWh</span>
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              <span className="font-mono font-medium text-foreground tabular">{formatCusd(totals.cusd)}</span>{" "}
              {CURRENCY} paid to rooftop owners
            </span>
          </dd>
        </div>

        <div className="flex flex-col gap-1 border-foreground/20 sm:border-s sm:ps-6 lg:border-s-0 lg:ps-0">
          <dt className="text-sm font-medium text-muted-foreground">Certificates</dt>
          <dd className="flex flex-col gap-1">
            {loading ? (
              <Skeleton className="h-10 w-16 bg-foreground/10" />
            ) : (
              <span className="font-mono text-4xl leading-none font-semibold tabular sm:text-5xl">
                <AnimatedNumber value={totals.certificates} format={fmtInt} />
              </span>
            )}
            <span className="text-sm text-muted-foreground">One per verified reading</span>
          </dd>
        </div>

        <div className="flex flex-col gap-1 border-foreground/20 sm:border-s sm:ps-6">
          <dt className="text-sm font-medium text-muted-foreground">CO&#8322; avoided, estimated</dt>
          <dd className="flex flex-col gap-1">
            {loading ? (
              <Skeleton className="h-10 w-24 bg-foreground/10" />
            ) : (
              <span className="font-mono text-4xl leading-none font-semibold tabular sm:text-5xl">
                <AnimatedNumber value={totals.co2Kg} format={fmtKwh} />
                <span className="ms-1.5 text-lg font-medium">kg</span>
              </span>
            )}
            <a
              href={EMISSION_FACTOR.url}
              target="_blank"
              rel="noreferrer"
              className="w-fit text-sm text-muted-foreground underline decoration-foreground/30 underline-offset-2 hover:text-foreground"
            >
              <span className="font-mono tabular">{EMISSION_FACTOR.kgPerKwh}</span> kg/kWh, Nigeria 2025
              <ArrowUpRight aria-hidden className="ms-0.5 inline size-3.5 align-[-2px]" />
              <span className="sr-only"> (source: {EMISSION_FACTOR.source}, opens in a new tab)</span>
            </a>
          </dd>
        </div>
      </dl>
    </section>
  )
}
