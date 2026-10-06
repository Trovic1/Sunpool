import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * One screen of the app. Standalone routes render it as the page's <main>; the home page
 * stacks every screen as a <section> with an id the masthead scroll-spies and links to.
 */
export function SectionShell({
  id,
  embedded = false,
  className,
  children,
}: {
  id: string
  embedded?: boolean
  className?: string
  children: ReactNode
}) {
  const base = "mx-auto flex w-full max-w-6xl flex-col px-4 sm:px-6"
  if (embedded) {
    return (
      <section id={id} aria-labelledby={`${id}-heading`} className={cn(base, "scroll-mt-28 py-16 sm:py-24 md:scroll-mt-20", className)}>
        {children}
      </section>
    )
  }
  return (
    <main id="main" className={cn(base, "py-8 sm:py-14", className)}>
      {children}
    </main>
  )
}

/** The screen's title: the page h1 on its own route, an h2 inside the home page. */
export function SectionTitle({
  id,
  embedded = false,
  className,
  children,
}: {
  id: string
  embedded?: boolean
  className?: string
  children: ReactNode
}) {
  const Tag = embedded ? "h2" : "h1"
  return (
    <Tag id={`${id}-heading`} className={cn("font-display leading-[0.95] font-extrabold", className)}>
      {children}
    </Tag>
  )
}
