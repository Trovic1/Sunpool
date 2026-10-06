import type { Metadata } from "next"
import { Suspense } from "react"

import { ProofSection } from "@/components/double-claim/proof-section"
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
      <Suspense>
        <ProofSection />
      </Suspense>
      <SiteFooter />
    </>
  )
}
