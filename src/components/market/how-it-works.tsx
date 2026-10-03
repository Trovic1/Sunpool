import { ArrowRight, Cable, ShieldCheck, Smartphone } from "lucide-react"
import Link from "next/link"

const STEPS = [
  {
    icon: Smartphone,
    title: "Load units",
    body: "Pick a neighbour with spare solar and pay from your phone, like topping up a prepaid meter.",
  },
  {
    icon: Cable,
    title: "Their roof powers your line",
    body: "A smart meter on the shared line counts every kWh until your units run out.",
  },
  {
    icon: ShieldCheck,
    title: "Counted once, paid instantly",
    body: "Each meter reading can be claimed only once. The seller is paid on the spot.",
  },
] as const

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id="how-heading" className="font-display text-3xl font-bold sm:text-4xl">
          How it works
        </h2>
        <Link
          href="/activity"
          className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent-text hover:underline"
        >
          See live activity
          <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Icon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-display text-xl font-bold">{title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
