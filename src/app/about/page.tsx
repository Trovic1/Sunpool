import type { Metadata } from "next"
import { Suspense } from "react"

import { AboutContent } from "@/components/about/about-content"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "About · Sunpool",
  description:
    "Prepaid power from your neighbour's roof: how Sunpool works in Lagos, who it is for, and what is real in the demo.",
}

export default function AboutPage() {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <AboutContent />
      <SiteFooter />
    </>
  )
}
