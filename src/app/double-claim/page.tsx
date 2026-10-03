import type { Metadata } from "next"
import { Suspense } from "react"

import { DoubleClaimPanel } from "@/components/double-claim/double-claim-panel"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Proof · Sunpool",
  description: "Submit an already-claimed meter reading to the live contract and watch it get rejected.",
}

export default function DoubleClaimPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-14">
        <div className="flex max-w-3xl flex-col gap-4">
          <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-7xl">
            One reading, <span className="text-accent-text">one sale.</span>
          </h1>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            Every kWh comes from a meter reading with its own ID. Try selling the same reading twice: the live
            contract refuses.
          </p>
        </div>
        <DoubleClaimPanel />
      </main>
      <SiteFooter />
    </>
  )
}
