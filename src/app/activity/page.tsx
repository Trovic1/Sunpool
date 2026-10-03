import type { Metadata } from "next"
import { Suspense } from "react"

import { ActivityScreen } from "@/components/market/activity-screen"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Activity · Sunpool",
  description: "Trades, certificates and today's solar output in the Sunpool neighbourhood market.",
}

export default function ActivityPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <Suspense>
        <ActivityScreen />
      </Suspense>
      <SiteFooter />
    </>
  )
}
