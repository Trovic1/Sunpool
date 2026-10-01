import {
  ArrowUpRight,
  Building2,
  Cable,
  Factory,
  Gauge,
  House,
  Landmark,
  Network,
  School,
  Store,
  UtilityPole,
  type LucideIcon,
} from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"

import { Badge } from "@/components/ui/badge"
import { Masthead } from "@/components/site/masthead"
import { SiteFooter } from "@/components/site/site-footer"
import { SUNPOOL_CONTRACTS, explorerAddress } from "@/lib/chain/contracts"

export const metadata: Metadata = {
  title: "About & impact · Sunpool",
  description:
    "How neighbourhood solar trading works in Lagos: how the electricity reaches the buyer, who uses it, and the path from testnet to production.",
}

type Source = { label: string; href: string }

const STATS: { value: string; unit: string; label: string; source: Source }[] = [
  {
    value: "₦750",
    unit: "/kWh",
    label: "Electricity from a petrol generator. Diesel costs ₦950/kWh.",
    source: {
      label: "Minister of Power, via TheCable, Oct 2024",
      href: "https://thecable.ng/adelabu-electricity-produced-with-petrol-generator-now-costs-n750-kwh",
    },
  },
  {
    value: "₦225",
    unit: "/kWh",
    label: "Grid tariff for Band A customers (20+ hours of supply). Ikeja Electric charges ₦206.80.",
    source: {
      label: "Business A.M.",
      href: "https://businessamlive.com/nerc-ups-tariffs-to-n225-kwh-for-band-a-electricity-consumers/",
    },
  },
  {
    value: "51%",
    unit: "",
    label: "of Lagos residents rent, so they cannot put panels on the roof above them.",
    source: {
      label: "Fortren & Company, via Nairametrics, Sep 2026",
      href: "https://nairametrics.com/2026/09/01/only-31-of-lagos-residents-own-homes-as-rents-surge-report/",
    },
  },
]

type Path = {
  stage: string
  title: string
  body: string
  from: LucideIcon
  link: LucideIcon
  to: LucideIcon
  fromLabel: string
  toLabel: string
  emphasis?: boolean
}

const PATHS: Path[] = [
  {
    stage: "Possible today",
    title: "A direct cable to the next house or shop",
    body: "The seller's inverter feeds a metered line to the neighbour. It mirrors the familiar habit of sharing generator power for a fee, with measured kWh and instant payment instead of guesswork.",
    from: House,
    link: Cable,
    to: Store,
    fromLabel: "Solar home",
    toLabel: "Shop next door",
  },
  {
    stage: "First deployment",
    title: "A shared line in an estate or compound",
    body: "Houses export surplus into a mini-grid and every meter records what it draws. Sunpool matches sellers and buyers, settles payment and issues certificates. The wires and an operator already exist.",
    from: House,
    link: Network,
    to: Building2,
    fromLabel: "Rooftops",
    toLabel: "Estate homes",
    emphasis: true,
  },
  {
    stage: "Later, with the regulator",
    title: "Through the public grid",
    body: "The seller exports to the grid and the buyer imports from it, matched on paper. This needs the distribution company and LASERC to allow it; we found no rule that does so yet.",
    from: House,
    link: UtilityPole,
    to: House,
    fromLabel: "Seller",
    toLabel: "Buyer anywhere",
  },
]

const USE_CASES: { icon: LucideIcon; who: string; seller: string; buyer: string; why: string }[] = [
  {
    icon: Building2,
    who: "Estate or compound",
    seller: "Houses with rooftop panels",
    buyer: "Neighbours without panels",
    why: "Midday surplus replaces generator hours next door.",
  },
  {
    icon: Store,
    who: "Small business",
    seller: "The solar home beside the shop",
    buyer: "Barber, tailor, cold room",
    why: "Daytime power below generator cost, paid from a phone.",
  },
  {
    icon: School,
    who: "Community buildings",
    seller: "Schools, churches, mosques with big roofs",
    buyer: "The surrounding street",
    why: "Weekend and holiday surplus earns money instead of going to waste.",
  },
  {
    icon: Factory,
    who: "Companies reporting emissions",
    seller: "Any verified rooftop",
    buyer: "A firm buying certificates",
    why: "One-time reading IDs make the renewable claim auditable.",
  },
  {
    icon: Landmark,
    who: "Mini-grid operators",
    seller: "The operator's customers",
    buyer: "Other customers on the grid",
    why: "Settlement and certificates without building their own billing.",
  },
]

const WHY_NOT_PANELS = [
  ["Upfront cost", "A solar and battery system is a large one-time purchase. Buying kWh is pay as you go."],
  ["Renting", "Half of Lagos rents, and you cannot install on a roof you do not own."],
  ["No usable roof", "Flats, shops in plazas and shaded buildings generate little."],
  ["Small needs", "A barber needs power in working hours. A full system is overkill."],
  ["The seller wins too", "Midday output exceeds home use. Selling it pays the system back sooner."],
] as const

const PRODUCTION = [
  ["Meter readings", "Simulated meter, signed by a server key", "Signed on the device by certified smart meters, or read from inverter cloud APIs (Growatt publishes one)"],
  ["Meter keys", "One registered demo key", "One key per meter, registered and revoked by a licensed metering operator"],
  ["Network and money", "Celo Sepolia testnet, test USDC", "Celo mainnet, USDm (formerly cUSD) or USDC, both in MiniPay"],
  ["Markets", "One neighbourhood market", "One market per estate or mini-grid, sharing one registry so nothing is certified twice"],
  ["Regulation", "Not needed for a testnet demo", "Partner with LASERC-licensed mini-grid and metering operators"],
] as const

const TRACK = [
  ["Peer-to-peer energy trading", "Households list surplus and neighbours buy it, settled in stablecoins on Celo."],
  ["Renewable certificate tracking", "Every purchase mints an ERC-721 certificate carrying meter ID, reading ID, time and Wh."],
  ["Microgrid coordination", "Forecast and price suggestion help match supply to demand on a shared line."],
  ["Tokenised incentives", "Sellers are paid instantly for surplus that would otherwise be wasted."],
] as const

function SourceLink({ source }: { source: Source }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
    >
      {source.label}
      <ArrowUpRight aria-hidden className="size-3" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

function SectionHeading({ tag, title, id, children }: { tag: string; title: string; id: string; children?: React.ReactNode }) {
  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <p className="tag">{tag}</p>
      <h2 id={id} className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
        {title}
      </h2>
      {children && <div className="text-pretty text-muted-foreground">{children}</div>}
    </div>
  )
}

export default function AboutPage() {
  return (
    <>
      <Suspense fallback={<div className="h-14 border-b border-foreground" />}>
        <Masthead />
      </Suspense>
      <main id="main" className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 sm:py-12">
        {/* Intro */}
        <section aria-labelledby="about-heading" className="flex max-w-4xl flex-col gap-4">
          <p className="tag">About & impact · IEEE ClimateChain 2026 · Renewable Energy & Energy Trading</p>
          <h1 id="about-heading" className="font-display text-4xl leading-[1.05] font-medium tracking-tight text-balance sm:text-6xl">
            The trust layer for neighbourhood solar.
          </h1>
          <p className="max-w-prose text-lg text-pretty text-muted-foreground">
            At noon in Lagos, one house has more solar power than it can use while the shop next door runs a
            generator. Sunpool lets the shop buy that surplus from a phone, pays the owner instantly, and issues a
            certificate for those exact kWh that can never be claimed twice.
          </p>
        </section>

        {/* Numbers */}
        <section aria-labelledby="numbers-heading" className="flex flex-col gap-6">
          <SectionHeading tag="Why it matters" title="Generator power costs three to four times the grid" id="numbers-heading" />
          <ul className="grid gap-px overflow-hidden rounded-lg border border-foreground bg-foreground md:grid-cols-3">
            {STATS.map((stat) => (
              <li key={stat.value} className="flex flex-col gap-2 bg-background p-5">
                <p className="font-mono text-5xl leading-none font-medium tracking-tight text-primary tabular">
                  {stat.value}
                  <span className="text-xl text-muted-foreground">{stat.unit}</span>
                </p>
                <p className="text-pretty">{stat.label}</p>
                <SourceLink source={stat.source} />
              </li>
            ))}
          </ul>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            A neighbour&rsquo;s daytime solar can be priced well below the generator and still pay the seller more
            than the grid would. Nigerians spent an estimated ₦16.5 trillion on fuel and generators for
            self-generated power in 2023.{" "}
            <SourceLink
              source={{
                label: "Minister of Power, via Prime Business Africa",
                href: "https://primebusiness.africa/nigerians-spend-n16-5trn-on-diesel-petrol-generators-for-self-generated-power-report",
              }}
            />
          </p>
        </section>

        {/* Delivery */}
        <section aria-labelledby="delivery-heading" className="flex flex-col gap-6">
          <SectionHeading tag="The first question" title="How does the electricity reach the buyer?" id="delivery-heading">
            <p>
              Electricity cannot travel through an app. A wire delivers it. Sunpool is the layer on top: metering,
              matching, payment and certificates that cannot be claimed twice.
            </p>
          </SectionHeading>
          <ol className="grid gap-4 lg:grid-cols-3">
            {PATHS.map((path, i) => (
              <li
                key={path.title}
                className={
                  path.emphasis
                    ? "flex flex-col gap-4 rounded-lg border-2 border-primary bg-accent/40 p-5"
                    : "flex flex-col gap-4 rounded-lg border border-foreground p-5"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-muted-foreground tabular">0{i + 1}</span>
                  <Badge variant={path.emphasis ? "accent" : "outline"}>{path.stage}</Badge>
                </div>
                <figure className="flex items-center gap-2" aria-label={`${path.fromLabel} to ${path.toLabel}`}>
                  <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                    <span className="flex size-11 items-center justify-center rounded-md border border-foreground bg-background">
                      <path.from aria-hidden className="size-5 text-foreground" />
                    </span>
                    {path.fromLabel}
                  </span>
                  <span className="flex flex-1 flex-col items-center gap-1 pb-5">
                    <span className="flex w-full items-center gap-1">
                      <span className="h-px flex-1 bg-foreground" />
                      <path.link aria-hidden className="size-4 shrink-0 text-accent-text" />
                      <span className="h-px flex-1 bg-foreground" />
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge aria-hidden className="size-3" /> metered
                    </span>
                  </span>
                  <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                    <span className="flex size-11 items-center justify-center rounded-md border border-foreground bg-background">
                      <path.to aria-hidden className="size-5 text-foreground" />
                    </span>
                    {path.toLabel}
                  </span>
                </figure>
                <h3 className="font-display text-xl font-medium text-balance">{path.title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{path.body}</p>
              </li>
            ))}
          </ol>
          <p className="max-w-prose text-sm text-pretty text-muted-foreground">
            Lagos regulates its own electricity market. Since December 2024 the Lagos State Electricity Regulatory
            Commission (LASERC) has overseen it, and in May 2026 it approved 14 licences and permits including
            interconnected mini-grids and metering services. Sunpool&rsquo;s route to market is as the settlement
            and certificate layer for licensed operators, not as an unlicensed electricity seller.{" "}
            <SourceLink
              source={{
                label: "Nairametrics, May 2026",
                href: "https://nairametrics.com/2026/05/09/lagos-approves-14-electricity-operators-across-off-grid-metering-distribution-markets/",
              }}
            />
          </p>
        </section>

        {/* Use cases */}
        <section aria-labelledby="usecases-heading" className="flex flex-col gap-6">
          <SectionHeading tag="Sample usage" title="Who uses Sunpool" id="usecases-heading">
            <p>Proposed use cases for a Lagos pilot. These are not existing customers.</p>
          </SectionHeading>
          <div className="overflow-x-auto rounded-lg border border-foreground">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">Sellers, buyers and the reason each would use Sunpool</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Setting</th>
                  <th scope="col" className="px-4 py-2 font-medium">Seller</th>
                  <th scope="col" className="px-4 py-2 font-medium">Buyer</th>
                  <th scope="col" className="px-4 py-2 font-medium">Why it works</th>
                </tr>
              </thead>
              <tbody>
                {USE_CASES.map((u) => (
                  <tr key={u.who} className="border-t border-rule align-top">
                    <th scope="row" className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <u.icon aria-hidden className="size-4 shrink-0 text-accent-text" />
                        {u.who}
                      </span>
                    </th>
                    <td className="px-4 py-3">{u.seller}</td>
                    <td className="px-4 py-3">{u.buyer}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Why not panels */}
        <section aria-labelledby="panels-heading" className="flex flex-col gap-6">
          <SectionHeading tag="The second question" title="Why not just install your own panels?" id="panels-heading" />
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_NOT_PANELS.map(([term, detail]) => (
              <div key={term} className="flex flex-col gap-1 border-t border-foreground pt-3">
                <dt className="font-medium">{term}</dt>
                <dd className="text-sm text-pretty text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Production path */}
        <section aria-labelledby="production-heading" className="flex flex-col gap-6">
          <SectionHeading tag="Scaling" title="From testnet demo to production" id="production-heading">
            <p>
              The trading, settlement and double-claim protection already run on-chain. What changes for production
              is where readings come from and who operates the meters.
            </p>
          </SectionHeading>
          <div className="overflow-x-auto rounded-lg border border-foreground">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <caption className="sr-only">What runs today and what replaces it in production</caption>
              <thead className="bg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Piece</th>
                  <th scope="col" className="px-4 py-2 font-medium">Today</th>
                  <th scope="col" className="px-4 py-2 font-medium">Production</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTION.map(([piece, today, prod]) => (
                  <tr key={piece} className="border-t border-rule align-top">
                    <th scope="row" className="px-4 py-3 font-medium">{piece}</th>
                    <td className="px-4 py-3 text-muted-foreground">{today}</td>
                    <td className="px-4 py-3">{prod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Track alignment */}
        <section aria-labelledby="track-heading" className="flex flex-col gap-6">
          <SectionHeading tag="Track alignment" title="Renewable Energy & Energy Trading" id="track-heading" />
          <dl className="grid gap-px overflow-hidden rounded-lg border border-foreground bg-foreground sm:grid-cols-2">
            {TRACK.map(([term, detail]) => (
              <div key={term} className="flex flex-col gap-1 bg-background p-5">
                <dt className="font-medium">{term}</dt>
                <dd className="text-sm text-pretty text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Honesty */}
        <section aria-labelledby="honesty-heading" className="flex flex-col gap-4 rounded-lg border border-foreground bg-muted p-5 sm:p-6">
          <h2 id="honesty-heading" className="font-display text-2xl font-medium">What is real and what is simulated</h2>
          <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-pretty">
            <li>
              <strong className="font-medium">Real, on Celo Sepolia testnet:</strong> listings, USDC payments,
              certificates and the double-claim rejection. Contracts are{" "}
              <a className="underline underline-offset-2" href={explorerAddress(SUNPOOL_CONTRACTS.energyMarket)} target="_blank" rel="noreferrer">
                verified on Blockscout
              </a>
              .
            </li>
            <li>
              <strong className="font-medium">Simulated:</strong> meter readings (signed by a server-side meter key)
              and the Surulere generation curve.
            </li>
            <li>
              <strong className="font-medium">Estimated:</strong> CO&#8322; avoided, using Nigeria&rsquo;s 2025 grid
              factor of 0.456 kg CO&#8322;e/kWh. The forecast is shown with a confidence band.
            </li>
            <li>
              <strong className="font-medium">Not claimed:</strong> users, partners or pilots. The use cases above are
              proposals.
            </li>
          </ul>
          <p className="text-sm">
            <Link href="/" className="text-accent-text underline underline-offset-2">Try the live market</Link>
            {" · "}
            <Link href="/double-claim" className="text-accent-text underline underline-offset-2">Try a double claim</Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}
