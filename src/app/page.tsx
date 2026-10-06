import { Suspense } from "react"

import { AboutContent } from "@/components/about/about-content"
import { CertificateLedger } from "@/components/certificates/certificate-ledger"
import { ProofSection } from "@/components/double-claim/proof-section"
import { ActivityScreen } from "@/components/market/activity-screen"
import { MarketScreen } from "@/components/market/market-screen"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

/**
 * The whole app on one scroll: Market, Activity, Certificates, Proof and About. The masthead
 * follows along and links to each section. Every section also has its own route for deep links.
 */
export default function HomePage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:border focus:border-foreground focus:bg-background focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <main id="main">
        <Suspense>
          <MarketScreen />
        </Suspense>
        <Suspense>
          <ActivityScreen embedded />
        </Suspense>
        <Suspense>
          <CertificateLedger embedded />
        </Suspense>
        <Suspense>
          <ProofSection embedded />
        </Suspense>
        <AboutContent embedded />
      </main>
      <SiteFooter />
    </>
  )
}
