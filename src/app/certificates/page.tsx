import type { Metadata } from "next"
import { Suspense } from "react"

import { CertificateLedger } from "@/components/certificates/certificate-ledger"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "Certificates · Sunpool",
  description:
    "Every renewable energy certificate minted on Celo Sepolia, with its meter reading consumed on-chain so it can't be double counted.",
}

export default function CertificatesPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <Suspense>
        <CertificateLedger />
      </Suspense>
      <SiteFooter />
    </>
  )
}
