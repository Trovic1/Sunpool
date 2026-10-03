import type { Metadata } from "next"
import { Suspense } from "react"

import { DoubleClaimPanel } from "@/components/double-claim/double-claim-panel"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Double-claim test · Sunpool",
  description: "Submit an already-claimed meter reading to the live contract and watch it get rejected.",
}

export default function DoubleClaimPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16 border-b border-border" />}>
        <Masthead />
      </Suspense>
      <main id="main" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="w-fit rounded-full bg-foreground px-2.5 py-0.5 text-xs font-medium text-background">
            Live on Celo Sepolia
          </span>
          <h1 className="font-display text-4xl leading-[1.02] font-bold text-balance sm:text-6xl">
            One reading, one certificate.
          </h1>
          <p className="text-pretty text-muted-foreground">
            Every kWh sold on Sunpool is backed by a meter reading with a unique ID. The registry records
            that ID the first time it is claimed. Try claiming the same reading again: the contract refuses,
            so the same energy can never be sold or certified twice.
          </p>
        </div>
        <DoubleClaimPanel />
      </main>
      <SiteFooter />
    </>
  )
}
