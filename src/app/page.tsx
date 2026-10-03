import { Suspense } from "react"

import { MarketScreen } from "@/components/market/market-screen"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export default function MarketPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-foreground focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Suspense fallback={<div className="h-16 border-b border-border" />}>
        <Masthead />
      </Suspense>
      <Suspense>
        <MarketScreen />
      </Suspense>
      <SiteFooter />
    </>
  )
}
