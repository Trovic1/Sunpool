"use client"

import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, ArrowUpRight, BadgeCheck, CloudOff, FileBadge, RotateCw, Wallet } from "lucide-react"
import Link from "next/link"
import { parseAsStringLiteral, useQueryState } from "nuqs"
import { useMemo, type ReactNode } from "react"

import { AnimatedNumber } from "@/components/market/animated-number"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCertificates } from "@/hooks/use-certificates"
import { useWallet } from "@/hooks/use-wallet"
import type { CertificateRecord } from "@/lib/chain/certificates"
import { SUNPOOL_CONTRACTS, explorerAddress, explorerToken, explorerTx } from "@/lib/chain/contracts"
import { CURRENCY, formatCusd, formatKwh, formatPrice, partyName } from "@/lib/format"
import { EMISSION_FACTOR } from "@/lib/seed"
import { cn } from "@/lib/utils"

import { formatWat, isoTime, shortHex } from "./format"
import { VerifyReading } from "./verify-reading"

const VIEWS = ["all", "mine"] as const
const NO_NAMES: Record<string, string> = {}

const fmtKwh = (n: number) => formatKwh(n)
const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US")

const sameAddress = (a?: string, b?: string) => Boolean(a && b && a.toLowerCase() === b.toLowerCase())

export function CertificateLedger() {
  const query = useCertificates()
  const wallet = useWallet()
  const [view, setView] = useQueryState("view", parseAsStringLiteral(VIEWS).withDefault("all"))

  const ledger = query.data
  const all = useMemo(() => ledger?.certificates ?? [], [ledger])
  const shown = useMemo(
    () =>
      view === "mine"
        ? all.filter((c) => sameAddress(c.owner, wallet.address) || sameAddress(c.producer, wallet.address))
        : all,
    [all, view, wallet.address],
  )

  // Keep the last good ledger on screen if a background refresh fails.
  const status = query.isPending ? "loading" : query.isError && !ledger ? "error" : "ready"

  return (
    <main id="main" className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-14">
      <div className="flex max-w-3xl flex-col gap-4">
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold sm:text-6xl">
          Every kWh, <span className="text-accent-text">certified once.</span>
        </h1>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Each purchase mints a certificate on Celo Sepolia. Its meter reading is consumed on-chain, so the same
          energy can&rsquo;t be claimed twice.
        </p>
      </div>

      <Summary status={status} certificates={ledger?.totals.certificates ?? 0} wh={ledger?.totals.wh ?? 0} />

      <section aria-labelledby="ledger-heading" className="flex flex-col rounded-3xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-end sm:justify-between sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="ledger-heading" className="font-display text-2xl font-bold">
              Certificate ledger
            </h2>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {status === "ready"
                ? view === "mine" && !wallet.address
                  ? "Connect a wallet to filter to your certificates."
                  : view === "mine"
                  ? `${shown.length} of ${all.length} ${all.length === 1 ? "certificate" : "certificates"} involve your wallet.`
                  : `${all.length} ${all.length === 1 ? "certificate" : "certificates"} on the RECToken contract, newest first.`
                : status === "loading"
                  ? "Reading the contracts…"
                  : ""}
            </p>
          </div>
          <ToggleGroup
            type="single"
            spacing={0}
            value={view}
            onValueChange={(value) => value && void setView(value === "all" ? null : (value as "mine"))}
            aria-label="Show certificates"
            className="w-full rounded-full bg-background p-1 sm:w-fit"
          >
            {VIEWS.map((v) => (
              <ToggleGroupItem
                key={v}
                value={v}
                className="h-9 flex-1 rounded-full px-4 text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-foreground sm:flex-none"
              >
                {v === "all" ? "All" : "Mine"}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {status === "loading" && <LedgerSkeleton />}

        {status === "error" && (
          <div className="p-4 sm:p-6">
            <Alert variant="destructive">
              <CloudOff />
              <AlertTitle>Certificates unavailable</AlertTitle>
              <AlertDescription>
                {query.error?.message ?? "Unable to reach Celo Sepolia."} Check your connection, then retry.
              </AlertDescription>
              <AlertAction>
                <Button size="sm" variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
                  {query.isFetching ? <Spinner data-icon="inline-start" /> : <RotateCw data-icon="inline-start" />}
                  Retry
                </Button>
              </AlertAction>
            </Alert>
          </div>
        )}

        {status === "ready" && view === "mine" && !wallet.address && (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wallet />
              </EmptyMedia>
              <EmptyTitle className="font-display text-lg font-bold">Connect a wallet to see yours</EmptyTitle>
              <EmptyDescription>
                Mine shows certificates your wallet owns or produced as a seller.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => void wallet.connectWallet()} disabled={wallet.isConnecting}>
                {wallet.isConnecting ? <Spinner data-icon="inline-start" /> : <Wallet data-icon="inline-start" />}
                Connect wallet
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {status === "ready" && shown.length === 0 && !(view === "mine" && !wallet.address) && (
          <Empty className="py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileBadge />
              </EmptyMedia>
              <EmptyTitle className="font-display text-lg font-bold">
                {view === "mine" ? "No certificates for this wallet yet" : "No certificates minted yet"}
              </EmptyTitle>
              <EmptyDescription>
                A certificate is minted to the buyer each time a listing is bought. Load some solar to get your first.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/">Buy solar</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}

        {status === "ready" && shown.length > 0 && (
          <>
            <LedgerTable certificates={shown} account={wallet.address} />
            <LedgerList certificates={shown} account={wallet.address} />
          </>
        )}
      </section>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <ContractLink href={explorerAddress(SUNPOOL_CONTRACTS.recToken)}>RECToken contract</ContractLink>
        <ContractLink href={explorerAddress(SUNPOOL_CONTRACTS.readingRegistry)}>ReadingRegistry contract</ContractLink>
        <Link href="/double-claim" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
          Try a double claim
        </Link>
      </p>
    </main>
  )
}

function Summary({ status, certificates, wh }: { status: string; certificates: number; wh: number }) {
  const loading = status === "loading"
  const kwh = wh / 1000
  const value = (node: ReactNode, skeleton: string) =>
    loading ? <Skeleton className={cn(skeleton, "bg-foreground/10")} /> : status === "error" ? "–" : node

  return (
    <section aria-labelledby="summary-heading" className="rounded-3xl border border-border bg-card p-6">
      <h2 id="summary-heading" className="sr-only">
        Certificate totals
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-[1.6fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <dt className="text-sm font-medium text-muted-foreground">Energy certified</dt>
          <dd className="font-mono text-6xl leading-none font-semibold tracking-tight tabular sm:text-7xl">
            {value(
              <>
                <AnimatedNumber value={kwh} format={fmtKwh} />
                <span className="ms-2 text-2xl font-medium">kWh</span>
              </>,
              "h-16 w-48",
            )}
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-foreground/20 sm:border-s sm:ps-6">
          <dt className="text-sm font-medium text-muted-foreground">Certificates</dt>
          <dd className="flex flex-col gap-1">
            <span className="font-mono text-4xl leading-none font-semibold tabular sm:text-5xl">
              {value(<AnimatedNumber value={certificates} format={fmtInt} />, "h-10 w-16")}
            </span>
            <span className="text-sm text-muted-foreground">One per consumed reading</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 border-foreground/20 sm:border-s sm:ps-6">
          <dt className="text-sm font-medium text-muted-foreground">CO&#8322; avoided, estimated</dt>
          <dd className="flex flex-col gap-1">
            <span className="font-mono text-4xl leading-none font-semibold tabular sm:text-5xl">
              {value(
                <>
                  <AnimatedNumber value={kwh * EMISSION_FACTOR.kgPerKwh} format={fmtKwh} />
                  <span className="ms-1.5 text-lg font-medium">kg</span>
                </>,
                "h-10 w-24",
              )}
            </span>
            <a
              href={EMISSION_FACTOR.url}
              target="_blank"
              rel="noreferrer"
              className="w-fit text-sm text-muted-foreground underline decoration-foreground/30 underline-offset-2 hover:text-foreground"
            >
              <span className="font-mono tabular">{EMISSION_FACTOR.kgPerKwh}</span> kg/kWh, Nigeria 2025
              <ArrowUpRight aria-hidden className="ms-0.5 inline size-3.5 align-[-2px]" />
              <span className="sr-only"> (source: {EMISSION_FACTOR.source}, opens in a new tab)</span>
            </a>
          </dd>
        </div>
      </dl>
    </section>
  )
}

/** Row enter: a short staggered slide, opacity only under reduced motion. */
function useRowMotion() {
  const reduced = useReducedMotion()
  return (i: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, duration: 0.35, bounce: 0, delay: Math.min(i, 12) * 0.03 },
  })
}

function LedgerTable({ certificates, account }: { certificates: CertificateRecord[]; account?: string }) {
  const rowMotion = useRowMotion()
  return (
    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Renewable energy certificates on Celo Sepolia, newest first. Each reading is consumed in the ReadingRegistry.
        </caption>
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border">
            <th scope="col" className="py-3 ps-6 pe-3 font-medium">Certificate</th>
            <th scope="col" className="px-3 py-3 text-end font-medium">Energy</th>
            <th scope="col" className="px-3 py-3 font-medium">Producer → owner</th>
            <th scope="col" className="px-3 py-3 font-medium">Meter and reading</th>
            <th scope="col" className="px-3 py-3 font-medium">Minted (WAT)</th>
            <th scope="col" className="px-3 py-3 text-end font-medium">Paid</th>
            <th scope="col" className="py-3 ps-3 pe-6 text-end font-medium">
              <span className="sr-only">Proof and links</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {certificates.map((c, i) => (
            <motion.tr key={c.id} {...rowMotion(i)} className="border-b border-rule align-top last:border-b-0">
              <th scope="row" className="py-4 ps-6 pe-3 font-normal">
                <TokenLink cert={c} className="font-display text-base font-bold" />
              </th>
              <td className="px-3 py-4 text-end font-mono whitespace-nowrap tabular">
                {formatKwh(c.wh / 1000, 2)}
                <span className="text-muted-foreground"> kWh</span>
              </td>
              <td className="px-3 py-4">
                <Parties cert={c} account={account} />
              </td>
              <td className="px-3 py-4">
                <ReadingCell cert={c} />
              </td>
              <td className="px-3 py-4 font-mono text-xs whitespace-nowrap text-muted-foreground tabular">
                <MintedTime cert={c} />
              </td>
              <td className="px-3 py-4 text-end font-mono whitespace-nowrap tabular">
                <Paid cert={c} />
              </td>
              <td className="py-4 ps-3 pe-6">
                <div className="flex flex-col items-end gap-2">
                  <VerifyReading certificateId={c.id} readingId={c.readingId} />
                  <TxLink cert={c} />
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LedgerList({ certificates, account }: { certificates: CertificateRecord[]; account?: string }) {
  const rowMotion = useRowMotion()
  return (
    <ol className="flex flex-col lg:hidden" aria-label="Certificates, newest first">
      {certificates.map((c, i) => (
        <motion.li key={c.id} {...rowMotion(i)} className="border-b border-rule last:border-b-0">
          <article aria-labelledby={`cert-${c.id}`} className="flex flex-col gap-3 p-4 sm:px-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`cert-${c.id}`}>
                <TokenLink cert={c} className="font-display text-lg font-bold" />
              </h3>
              <p className="font-mono text-lg font-semibold tabular">
                {formatKwh(c.wh / 1000, 2)}
                <span className="text-sm font-normal text-muted-foreground"> kWh</span>
              </p>
            </div>
            <Parties cert={c} account={account} />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Reading</dt>
              <dd>
                <ReadingCell cert={c} />
              </dd>
              <dt className="text-muted-foreground">Minted</dt>
              <dd className="font-mono text-xs text-muted-foreground tabular">
                <MintedTime cert={c} />
              </dd>
              <dt className="text-muted-foreground">Paid</dt>
              <dd className="font-mono tabular">
                <Paid cert={c} />
              </dd>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VerifyReading certificateId={c.id} readingId={c.readingId} />
              <TxLink cert={c} />
            </div>
          </article>
        </motion.li>
      ))}
    </ol>
  )
}

function TokenLink({ cert, className }: { cert: CertificateRecord; className?: string }) {
  return (
    <a
      href={explorerToken(SUNPOOL_CONTRACTS.recToken, BigInt(cert.id))}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex items-center gap-1 rounded-sm whitespace-nowrap underline-offset-4 hover:underline", className)}
    >
      REC #{cert.id}
      <ArrowUpRight aria-hidden className="size-4 text-muted-foreground" />
      <span className="sr-only"> (certificate on Blockscout, opens in a new tab)</span>
    </a>
  )
}

function Parties({ cert, account }: { cert: CertificateRecord; account?: string }) {
  const producer = partyName(cert.producer, NO_NAMES, account)
  const owner = partyName(cert.owner, NO_NAMES, account)
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-medium leading-snug">
      <span className="sr-only">Produced by </span>
      <span title={cert.producer} className={cn("break-words", producer === "You" && "text-accent-text")}>
        {producer}
      </span>
      <ArrowRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="sr-only">, owned by </span>
      <span title={cert.owner} className={cn("break-words", owner === "You" && "text-accent-text")}>
        {owner}
      </span>
    </p>
  )
}

function ReadingCell({ cert }: { cert: CertificateRecord }) {
  const consumed = cert.consumedAt > 0
  return (
    <div className="flex flex-col gap-1 font-mono text-xs">
      <span className="text-muted-foreground" title={cert.meterId}>
        <span className="font-sans">Meter </span>
        {shortHex(cert.meterId)}
      </span>
      <span className="flex flex-wrap items-center gap-1.5" title={cert.readingId}>
        <span className="sr-only">Reading </span>
        {shortHex(cert.readingId)}
        {consumed ? (
          <Badge
            variant="outline"
            className="border-success/40 font-sans text-success"
            title={`Consumed ${formatWat(cert.consumedAt)}`}
          >
            <BadgeCheck aria-hidden />
            Consumed
          </Badge>
        ) : (
          <Badge variant="destructive" className="font-sans">
            Not consumed
          </Badge>
        )}
      </span>
    </div>
  )
}

function MintedTime({ cert }: { cert: CertificateRecord }) {
  // Settlement time when the trade is indexed, otherwise the meter reading time.
  const ts = cert.trade?.timestamp ?? cert.readingTimestamp
  return <time dateTime={isoTime(ts)}>{formatWat(ts)}</time>
}

function Paid({ cert }: { cert: CertificateRecord }) {
  if (!cert.trade) return <span className="text-muted-foreground">–</span>
  return (
    <span className="inline-flex flex-col items-end max-lg:items-start">
      <span>
        {formatCusd(cert.trade.total)} <span className="text-muted-foreground">{CURRENCY}</span>
      </span>
      <span className="text-xs text-muted-foreground">@ {formatPrice(cert.trade.price)}/kWh</span>
    </span>
  )
}

function TxLink({ cert }: { cert: CertificateRecord }) {
  if (!cert.trade) return null
  return (
    <a
      href={explorerTx(cert.trade.txHash)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs whitespace-nowrap text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
    >
      Tx <span className="font-mono">{shortHex(cert.trade.txHash)}</span>
      <ArrowUpRight aria-hidden className="size-3" />
      <span className="sr-only"> (settlement transaction for certificate {cert.id}, opens Blockscout in a new tab)</span>
    </a>
  )
}

function ContractLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-dotted underline-offset-2 hover:text-foreground">
      {children}
      <span className="sr-only"> (opens Blockscout in a new tab)</span>
    </a>
  )
}

function LedgerSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true" aria-label="Loading certificates">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 border-b border-rule p-4 last:border-b-0 sm:px-6 lg:flex-row lg:items-center lg:gap-6">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-28 lg:ms-auto" />
        </div>
      ))}
    </div>
  )
}
