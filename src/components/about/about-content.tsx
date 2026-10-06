import {
  ArrowUpRight,
  Building2,
  CloudSun,
  Factory,
  Gauge,
  KeyRound,
  ShieldCheck,
  Store,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"

import { SectionShell, SectionTitle } from "@/components/site/section-shell"
import { SUNPOOL_CONTRACTS, explorerAddress } from "@/lib/chain/contracts"


type Source = { label: string; href: string }

const GENERATOR_SOURCE: Source = {
  label: "Minister of Power, via TheCable, Oct 2024",
  href: "https://thecable.ng/adelabu-electricity-produced-with-petrol-generator-now-costs-n750-kwh",
}
const GRID_SOURCE: Source = {
  label: "Business A.M.",
  href: "https://businessamlive.com/nerc-ups-tariffs-to-n225-kwh-for-band-a-electricity-consumers/",
}
const RENT_SOURCE: Source = {
  label: "Fortren & Company, via Nairametrics, Sep 2026",
  href: "https://nairametrics.com/2026/09/01/only-31-of-lagos-residents-own-homes-as-rents-surge-report/",
}

const COSTS = [
  { label: "Diesel generator", value: 950, grid: false },
  { label: "Petrol generator", value: 750, grid: false },
  { label: "Grid, Band A", value: 225, grid: true },
] as const

const FOR_WHO: { icon: LucideIcon; who: string; why: string }[] = [
  { icon: Users, who: "Renters", why: "No roof of your own, still on solar." },
  { icon: Store, who: "Shops", why: "Daytime power below generator cost." },
  { icon: Building2, who: "Estates", why: "One shared line, many rooftops." },
  { icon: Factory, who: "Companies", why: "Certificates that count each kWh once." },
]

const REAL = [
  ["Real on testnet", "Listings, USDC payments, certificates, double-claim rejection"],
  ["Simulated", "The smart meter and its readings, the Surulere solar curve on the chart"],
  ["Live data", "Sunlight forecast for Surulere from Open-Meteo, used to verify readings"],
  ["Estimated", "CO₂ avoided, at 0.456 kg per kWh"],
] as const

const REPO_URL = "https://github.com/Trovic1/Sunpool"

const TRUST: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "Counted once",
    body: "Each reading ID can be consumed once on-chain. A second claim reverts, so no kWh backs two certificates.",
  },
  {
    icon: CloudSun,
    title: "Checked against the sun",
    body: "Before the meter signs, an AI check compares the reading with today's sunlight in Surulere, the roof size and the seller's listings today. Impossible amounts are refused.",
  },
  {
    icon: KeyRound,
    title: "Keys that can be revoked",
    body: "Only registered meter keys can sign. A leaked or tampered meter is revoked on-chain; in production each meter keeps its key in a secure chip.",
  },
]

const TRACK = ["Peer-to-peer trading", "Certificate tracking", "Microgrid coordination", "Tokenised incentives"]

const card = "rounded-3xl border border-border bg-card p-6 sm:p-8"

function SourceLink({ source, className }: { source: Source; className?: string }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className={
        className ??
        "inline-flex items-center gap-0.5 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
      }
    >
      {source.label}
      <ArrowUpRight aria-hidden className="size-3" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

/** The About story: its own route at /about, and the closing section of the home page. */
export function AboutContent({ embedded = false }: { embedded?: boolean }) {
  const Sub = embedded ? "h3" : "h2"
  const max = Math.max(...COSTS.map((c) => c.value))

  return (
    <SectionShell id="about" embedded={embedded} className="gap-20">
        <div className="reveal flex max-w-3xl flex-col gap-5">
          <SectionTitle id="about" embedded={embedded} className="text-5xl sm:text-7xl">
            Spare solar shouldn&rsquo;t go to <span className="text-accent-text">waste.</span>
          </SectionTitle>
          <p className="max-w-xl text-lg text-pretty text-muted-foreground">
            At noon in Lagos, one roof makes more power than the house can use, while the shop next door runs a
            generator. Sunpool lets the shop buy it.
          </p>
        </div>

        <section aria-labelledby="cost-heading" className="reveal grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className={`${card} flex flex-col gap-6`}>
            <Sub id="cost-heading" className="font-display text-2xl font-bold sm:text-3xl">
              Generator power costs 3 to 4 times the grid
            </Sub>
            <ul className="flex flex-col gap-4">
              {COSTS.map((c) => (
                <li key={c.label} className="grid grid-cols-[7.5rem_1fr] items-center gap-3 sm:grid-cols-[9rem_1fr]">
                  <span className="text-sm text-muted-foreground">{c.label}</span>
                  <span className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={c.grid ? "h-8 rounded-lg bg-muted" : "h-8 rounded-lg bg-primary"}
                      style={{ width: `${(c.value / max) * 70}%` }}
                    />
                    <span className="font-mono text-sm font-semibold tabular">₦{c.value}/kWh</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="flex flex-wrap gap-x-4 gap-y-1">
              <SourceLink source={GENERATOR_SOURCE} />
              <SourceLink source={GRID_SOURCE} />
            </p>
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-primary p-6 text-primary-foreground sm:p-8">
            <p className="font-mono text-7xl leading-none font-bold tabular">51%</p>
            <div className="flex flex-col gap-2">
              <p className="text-lg font-semibold text-pretty">
                of Lagos residents rent. They can&rsquo;t put panels on the roof.
              </p>
              <SourceLink source={RENT_SOURCE} className="inline-flex w-fit items-center gap-0.5 text-xs underline decoration-dotted underline-offset-2" />
            </div>
          </div>
        </section>

        <section aria-labelledby="meter-heading" className="reveal flex flex-col gap-6">
          <div className="flex max-w-2xl flex-col gap-2">
            <Sub id="meter-heading" className="font-display text-3xl font-bold sm:text-4xl">
              Your prepaid meter stays yours
            </Sub>
            <p className="text-pretty text-muted-foreground">
              Grid units can&rsquo;t be resold, and Sunpool never touches them. It sells solar from a
              neighbour&rsquo;s roof, on its own line.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className={`${card} flex flex-col gap-4`}>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
                <KeyRound aria-hidden className="size-5" />
              </span>
              <h3 className="font-display text-xl font-bold">Grid units</h3>
              <p className="text-pretty text-muted-foreground">
                Bought from your DisCo and locked to your meter number. Nothing changes.
              </p>
            </div>
            <div className={`${card} flex flex-col gap-4 border-primary`}>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sun aria-hidden className="size-5" />
              </span>
              <h3 className="font-display text-xl font-bold">Neighbour&rsquo;s solar</h3>
              <p className="text-pretty text-muted-foreground">
                A shared line from their roof to your socket, with a small smart meter. You load kWh in Sunpool and
                it counts them down, like prepaid units.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="who-heading" className="reveal flex flex-col gap-6">
          <Sub id="who-heading" className="font-display text-3xl font-bold sm:text-4xl">
            Who it&rsquo;s for
          </Sub>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {FOR_WHO.map(({ icon: Icon, who, why }) => (
              <li key={who} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
                <Icon aria-hidden className="size-6 text-accent-text" />
                <p className="font-display text-lg font-bold">{who}</p>
                <p className="text-sm text-pretty text-muted-foreground">{why}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">Proposed users for a Lagos pilot, not existing customers.</p>
        </section>

        <section aria-labelledby="real-heading" className="reveal grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col gap-3">
            <Sub id="real-heading" className="font-display text-3xl font-bold sm:text-4xl">
              What&rsquo;s real
            </Sub>
            <p className="text-pretty text-muted-foreground">
              In production, certified smart meters sign readings on the device, on Celo mainnet inside MiniPay.
            </p>
            <p className="flex flex-wrap gap-x-5 gap-y-1 pt-2 text-sm">
              <Link href={embedded ? "#market" : "/"} className="font-medium text-accent-text hover:underline">
                Try the market
              </Link>
              <Link href={embedded ? "#proof" : "/double-claim"} className="font-medium text-accent-text hover:underline">
                Try a double claim
              </Link>
              <a
                href={explorerAddress(SUNPOOL_CONTRACTS.energyMarket)}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-accent-text hover:underline"
              >
                Verified contracts
              </a>
            </p>
          </div>
          <dl className="flex flex-col divide-y divide-border rounded-3xl border border-border bg-card">
            {REAL.map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1 p-5 sm:flex-row sm:gap-6">
                <dt className="flex w-40 shrink-0 items-center gap-2 font-semibold">
                  <Gauge aria-hidden className="size-4 text-accent-text" />
                  {k}
                </dt>
                <dd className="text-pretty text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="trust-heading" className="reveal flex flex-col gap-6">
          <div className="flex max-w-2xl flex-col gap-2">
            <Sub id="trust-heading" className="font-display text-3xl font-bold sm:text-4xl">
              Security &amp; trust
            </Sub>
            <p className="text-pretty text-muted-foreground">
              The chain makes every claim count once. The weak link is whoever signs the meter reading, so that step
              is checked too.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {TRUST.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-5">
                <Icon aria-hidden className="size-6 text-accent-text" />
                <p className="font-display text-lg font-bold">{title}</p>
                <p className="text-sm text-pretty text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Demo limits: one shared meter key, rooftop size declared by the seller, one admin account.{" "}
            <a
              href={`${REPO_URL}/blob/main/docs/THREAT_MODEL.md`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent-text hover:underline"
            >
              Read the threat model
            </a>
          </p>
        </section>

        <section aria-label="Hackathon track" className="reveal flex flex-wrap items-center gap-2">
          <span className="me-2 text-sm text-muted-foreground">
            IEEE ClimateChain 2026, Renewable Energy &amp; Energy Trading:
          </span>
          {TRACK.map((t) => (
            <span key={t} className="rounded-full border border-border px-3 py-1 text-sm">
              {t}
            </span>
          ))}
        </section>
    </SectionShell>
  )
}
