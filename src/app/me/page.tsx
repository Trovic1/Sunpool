import type { Metadata } from "next"
import { Suspense } from "react"

import { MyHome } from "@/components/me/my-home"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  title: "My Home · Sunpool",
  description: "The solar you've loaded, the surplus you've sold, your open listings and your certificates.",
}

export default function MyHomePage() {
  return (
    <>
      <Suspense fallback={<div className="h-16" />}>
        <Masthead />
      </Suspense>
      <Suspense>
        <MyHome />
      </Suspense>
      <SiteFooter />
    </>
  )
}
