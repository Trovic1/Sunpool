"use client"

import { ArrowDownLeft, ArrowUpRight, FileBadge, Sun, Wallet, X } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { AnimatedNumber } from "@/components/market/animated-number"
import { SectionShell, SectionTitle } from "@/components/site/section-shell"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { MarketListing, MarketTrade } from "@/hooks/market-types"
import { useCancelListing } from "@/hooks/use-cancel-listing"
import { useCertificates } from "@/hooks/use-certificates"
import { useChainMarket } from "@/hooks/use-chain-market"
import { useDataSource } from "@/hooks/use-data-source"
import { useWallet } from "@/hooks/use-wallet"
import { KNOWN_PARTIES, SUNPOOL_CONTRACTS, explorerToken, explorerTx } from "@/lib/chain/contracts"
import { CURRENCY, formatCusd, formatKwh, formatPrice, shortAddress } from "@/lib/format"
import { EMISSION_FACTOR } from "@/lib/seed"
import { cn } from "@/lib/utils"

const card = "rounded-3xl border border-border bg-card"
const party = (address: string) => KNOWN_PARTIES[address.toLowerCase()] ?? shortAddress(address)
const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase()
const watDate = (unix?: number) =>
  unix
    ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" }).format(
        unix * 1000,
      ) + " WAT"
    : "Pending"

/** My Home: the connected wallet's power loaded, surplus sold, open listings and certificates. */
export function MyHome() {
  const source = useDataSource()
  return (
    <SectionShell id="me" className="gap-10">
      <div className="enter flex max-w-3xl flex-col gap-4">
        <SectionTitle id="me" className="text-5xl sm:text-6xl">
          My <span className="text-accent-text">home.</span>
        </SectionTitle>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          The power you&rsquo;ve loaded, the surplus you&rsquo;ve sold, and the certificates in your wallet.
        </p>
      </div>
      {source === "chain" ? (
        <ChainHome />
      ) : (
        <Notice
          title="My Home reads your wallet on Celo Sepolia"
          body="You're viewing the offline demo. Remove ?source=seeded from the address to see your own trades."
        />
      )}
    </SectionShell>
  )
}

function ChainHome() {
  const wallet = useWallet()
  const market = useChainMarket()
  const ledger = useCertificates()
  const { cancel, cancelling } = useCancelListing()
  const account = wallet.address

  const mine = useMemo(() => {
    const settled = market.trades.filter((t) => t.status === "settled")
    const bought = settled.filter((t) => same(t.buyerId, account))
    const sold = settled.filter((t) => same(t.sellerId, account))
    const sum = (rows: MarketTrade[], f: (t: MarketTrade) => number) => rows.reduce((n, t) => n + f(t), 0)
    return {
      bought,
      sold,
      trades: [...bought, ...sold].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)),
      listings: market.listings.filter((l) => same(l.sellerId, account)),
      certificates: (ledger.data?.certificates ?? []).filter((c) => same(c.owner, account)),
      kwhIn: sum(bought, (t) => t.kwh),
      spent: sum(bought, (t) => t.kwh * t.price),
      kwhOut: sum(sold, (t) => t.kwh),
      earned: sum(sold, (t) => t.kwh * t.price),
    }
  }, [market.trades, market.listings, ledger.data, account])

  if (!account) {
    return (
      <div className={cn(card, "reveal flex flex-col items-start gap-4 p-6 sm:p-8")}>
        <span className="grid size-11 place-items-center rounded-full bg-accent">
          <Wallet aria-hidden className="size-5" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl font-bold">Connect a wallet to see your home</h2>
          <p className="max-w-md text-muted-foreground">
            MetaMask or MiniPay on Celo Sepolia. Nothing is sent until you confirm a trade.
          </p>
        </div>
        <Button size="lg" onClick={() => void wallet.connectWallet()} disabled={wallet.isConnecting}>
          <Wallet data-icon="inline-start" />
          {wallet.isConnecting ? "Connecting…" : "Connect wallet"}
        </Button>
      </div>
    )
  }

  const loading = market.status === "loading"
  if (market.status === "error") {
    return <Notice title="Celo Sepolia is not responding" body="Your trades are safe on-chain. Try again in a moment." />
  }

  return (
    <>
      <section aria-labelledby="totals-heading" className={cn(card, "reveal grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.4fr_1fr]")}>
        <h2 id="totals-heading" className="sr-only">
          Your totals for {shortAddress(account)}
        </h2>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">Solar you&rsquo;ve loaded</p>
          {loading ? (
            <Skeleton className="h-16 w-48 bg-foreground/10" />
          ) : (
            <p className="font-mono text-6xl leading-none font-bold tracking-tight tabular sm:text-7xl">
              <AnimatedNumber value={mine.kwhIn} format={(n) => formatKwh(n)} />
              <span className="ms-2 text-2xl font-medium text-muted-foreground">kWh</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            <span className="font-mono text-foreground tabular">{formatCusd(mine.spent)}</span> {CURRENCY} paid to
            neighbours, about{" "}
            <span className="font-mono text-foreground tabular">{formatKwh(mine.kwhIn * EMISSION_FACTOR.kgPerKwh)}</span> kg
            CO&#8322; avoided (est.)
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button asChild size="lg">
              <Link href="/#market">
                <Sun data-icon="inline-start" />
                Load more power
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/?tab=sell#market">Sell surplus</Link>
            </Button>
          </div>
        </div>
        <dl className="grid grid-cols-2 content-center gap-6 border-border lg:border-s lg:ps-8">
          <Stat label="Surplus sold" value={`${formatKwh(mine.kwhOut)} kWh`} loading={loading} />
          <Stat label="Earned" value={`${formatCusd(mine.earned)} ${CURRENCY}`} loading={loading} />
          <Stat label="Certificates held" value={String(mine.certificates.length)} loading={ledger.isPending} />
          <Stat label="Open listings" value={String(mine.listings.length)} loading={loading} />
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-labelledby="listings-heading" className={cn(card, "reveal flex flex-col")}>
          <Header id="listings-heading" title="Your listings" note="Waiting for a buyer on the live market." />
          {mine.listings.length === 0 ? (
            <Empty>
              No open listings.{" "}
              <Link href="/?tab=sell#market" className="font-medium text-accent-text hover:underline">
                List your surplus
              </Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {mine.listings.map((l) => (
                <ListingRow key={l.id} listing={l} busy={cancelling === l.id} onCancel={() => void cancel(l)} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="trades-heading" className={cn(card, "reveal flex flex-col")}>
          <Header id="trades-heading" title="Your trades" note="Settled on Celo Sepolia, newest first." />
          {mine.trades.length === 0 ? (
            <Empty>
              No trades yet.{" "}
              <Link href="/#market" className="font-medium text-accent-text hover:underline">
                Load your first kWh
              </Link>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {mine.trades.map((t) => (
                <TradeRow key={t.id} trade={t} bought={same(t.buyerId, account)} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <section aria-labelledby="certs-heading" className={cn(card, "reveal flex flex-col")}>
        <Header
          id="certs-heading"
          title="Your certificates"
          note="One per kWh batch you bought, each backed by a reading that can't be claimed twice."
          action={
            mine.certificates.length > 0 && (
              <Link href="/certificates?view=mine" className="text-sm font-medium text-accent-text hover:underline">
                Open in the ledger
              </Link>
            )
          }
        />
        {mine.certificates.length === 0 ? (
          <Empty>Buy a listing and its certificate lands here.</Empty>
        ) : (
          <ul className="grid gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {mine.certificates.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl bg-background p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <FileBadge aria-hidden className="size-5" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <a
                    href={explorerToken(SUNPOOL_CONTRACTS.recToken, BigInt(c.id))}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium hover:underline"
                  >
                    REC #{c.id}
                    <span className="sr-only"> on Blockscout (opens in a new tab)</span>
                  </a>
                  <span className="text-sm text-muted-foreground">{watDate(c.readingTimestamp)}</span>
                </div>
                <span className="font-mono text-sm tabular">{formatKwh(c.wh / 1000, 2)} kWh</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function ListingRow({ listing, busy, onCancel }: { listing: MarketListing; busy: boolean; onCancel: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex flex-col">
        <span className="font-mono font-semibold tabular">
          {formatKwh(listing.kwh)} kWh at {formatPrice(listing.price)}
        </span>
        <span className="text-sm text-muted-foreground">
          {listing.pending ? "Publishing…" : `Listed ${watDate(listing.listedAt)}`}
        </span>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">The reading can&rsquo;t be relisted.</span>
          <Button size="sm" variant="destructive" disabled={busy} onClick={onCancel}>
            {busy ? "Cancelling…" : "Cancel listing"}
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" disabled={listing.pending} onClick={() => setConfirming(true)}>
          <X data-icon="inline-start" />
          Cancel
        </Button>
      )}
    </li>
  )
}

function TradeRow({ trade, bought }: { trade: MarketTrade; bought: boolean }) {
  const Icon = bought ? ArrowDownLeft : ArrowUpRight
  return (
    <li className="flex items-center gap-3 px-4 py-4 sm:px-6">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", bought ? "bg-primary text-primary-foreground" : "bg-accent")}>
        <Icon aria-hidden className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">
          {bought ? "Loaded from" : "Sold to"} {party(bought ? trade.sellerId : trade.buyerId)}
        </span>
        <span className="text-sm text-muted-foreground">
          {watDate(trade.timestamp)}
          {trade.txHash && (
            <>
              {" · "}
              <a href={explorerTx(trade.txHash)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
                Transaction<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </>
          )}
        </span>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-mono font-semibold tabular">{formatKwh(trade.kwh)} kWh</span>
        <span className="font-mono text-sm text-muted-foreground tabular">
          {bought ? "−" : "+"}
          {formatCusd(trade.kwh * trade.price)} {CURRENCY}
        </span>
      </div>
    </li>
  )
}

function Stat({ label, value, loading }: { label: string; value: string; loading: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-mono text-2xl font-semibold tabular">
        {loading ? <Skeleton className="mt-1 h-7 w-20 bg-foreground/10" aria-label="Loading" /> : value}
      </dd>
    </div>
  )
}

function Header({ id, title, note, action }: { id: string; title: string; note: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-4 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-2xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      {action}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">{children}</p>
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className={cn(card, "flex flex-col gap-1 p-6")} role="status">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{body}</p>
    </div>
  )
}
