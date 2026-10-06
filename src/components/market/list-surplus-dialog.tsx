"use client"

import { Scale } from "lucide-react"
import { useId, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Market } from "@/hooks/use-market"
import { useVerification } from "@/hooks/use-verification"
import { CURRENCY, formatKwh, formatPrice, minuteLabel, shortAddress } from "@/lib/format"
import { DEMO_SELLER, NEIGHBORHOOD, TOTAL_PANEL_KW } from "@/lib/seed"
import { KWP_DEFAULT, KWP_MAX, KWP_MIN } from "@/lib/verify"

import { AnimatedNumber } from "./animated-number"
import { VerificationPanel } from "./verification-panel"

const PRICE_MIN = 0.05
const PRICE_MAX = 0.3

/** Surplus the demo home can still sell today: its share of forecast output minus its own load. */
export function availableSurplus(market: Market) {
  const share = DEMO_SELLER.panelKw / TOTAL_PANEL_KW
  const start = Math.max(market.minute, NEIGHBORHOOD.sunriseMinutes)
  const hoursLeft = Math.max(0, (NEIGHBORHOOD.sunsetMinutes - start) / 60)
  const surplus = share * market.generation.remainingKwh - DEMO_SELLER.loadKw * hoursLeft * 0.6
  // The simulated meter signs at most 10 kWh per reading (see /api/readings).
  const cap = market.mode === "chain" ? 10 : Infinity
  return Math.max(0, Math.min(cap, Math.floor(surplus * 10) / 10))
}

type Props = {
  market: Market
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ListSurplusDialog({ market, open, onOpenChange }: Props) {
  const desktop = useMediaQuery("(min-width: 640px)")
  const title = "List surplus"
  const description =
    market.mode === "chain"
      ? market.account
        ? `Selling from ${shortAddress(market.account)} on Celo Sepolia. A simulated meter signs the reading; the listing is a real transaction.`
        : "Your wallet will open to connect. A simulated meter signs the reading; the listing is a real transaction on Celo Sepolia."
      : `Selling as ${DEMO_SELLER.name}, ${DEMO_SELLER.street} (${DEMO_SELLER.panelKw} kW rooftop, simulated).`

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {open && <ListSurplusForm market={market} onDone={() => onOpenChange(false)} Footer={DialogFooter} />}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-2xl font-bold">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          {open && <ListSurplusForm market={market} onDone={() => onOpenChange(false)} Footer={DrawerFooter} />}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type Errors = { kwh?: string; kWp?: string; price?: string }

export function ListSurplusForm({
  market,
  onDone,
  Footer,
  compact = false,
}: {
  market: Market
  onDone: () => void
  Footer: React.ComponentType<React.ComponentProps<"div">>
  /** Inline on the Sell tab: one-line price hint, full-width submit. */
  compact?: boolean
}) {
  const id = useId()
  const available = availableSurplus(market)
  const suggestion = market.suggestion
  const [kwh, setKwh] = useState(() => String(Math.min(2, available).toFixed(1)))
  const [price, setPrice] = useState(() => suggestion.price.toFixed(3))
  const [kWp, setKwp] = useState(() => String(market.mode === "seeded" ? DEMO_SELLER.panelKw : KWP_DEFAULT))
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const kwhRef = useRef<HTMLInputElement>(null)
  const kWpRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const untilMinute = NEIGHBORHOOD.sunsetMinutes
  const kWpValid = Number(kWp) >= KWP_MIN && Number(kWp) <= KWP_MAX
  const verification = useVerification(market, Math.round(Number(kwh) * 10) * 100, kWpValid ? Number(kWp) : NaN)
  const verdict = verification.status === "ready" ? verification.result : undefined
  // What the meter will sign right now: the verified headroom, never more than the sunset forecast.
  const latest = verification.status === "ready" || verification.status === "checking" ? verification.result : undefined
  const readyNow = latest ? Math.min(available, Math.floor(latest.headroomWh / 100) / 10) : undefined
  // Until the seller types an amount, keep the default inside what can be signed now.
  const [touched, setTouched] = useState(false)
  const [fittedTo, setFittedTo] = useState<number>()
  if (!touched && readyNow !== undefined && readyNow !== fittedTo) {
    setFittedTo(readyNow)
    if (readyNow >= 0.1 && Number(kwh) > readyNow) setKwh(readyNow.toFixed(1))
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const kwhValue = Number(kwh)
    const kWpValue = Number(kWp)
    const priceValue = Number(price)
    const next: Errors = {}
    if (!Number.isFinite(kwhValue) || kwhValue < 0.1 || kwhValue > available) {
      next.kwh =
        available < 0.1
          ? "No surplus is forecast for the rest of today."
          : `Enter between 0.1 and ${formatKwh(available)} kWh.`
    } else if (verdict?.verdict === "reject") {
      next.kwh = verdict.reasons[0]
    }
    if (!Number.isFinite(kWpValue) || kWpValue < KWP_MIN || kWpValue > KWP_MAX) {
      next.kWp = `Enter a rooftop size between ${KWP_MIN} and ${KWP_MAX} kWp.`
    }
    if (!Number.isFinite(priceValue) || priceValue < PRICE_MIN || priceValue > PRICE_MAX) {
      next.price = `Enter a price between ${formatPrice(PRICE_MIN)} and ${formatPrice(PRICE_MAX)} ${CURRENCY}/kWh.`
    }
    setErrors(next)
    if (next.kwh) return kwhRef.current?.focus()
    if (next.kWp) return kWpRef.current?.focus()
    if (next.price) return priceRef.current?.focus()

    setSubmitting(true)
    try {
      await market.listSurplus({
        kwh: Math.round(kwhValue * 10) / 10,
        price: Math.round(priceValue * 1000) / 1000,
        untilMinute,
        kWp: kWpValue,
      })
      onDone()
    } catch {
      // The hook already showed an error toast; keep the form open to retry.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {compact && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Ready to sell now (simulated meter)</p>
          <p className="font-mono text-6xl leading-none font-bold tracking-tight tabular">
            {readyNow === undefined ? (
              <Skeleton className="inline-block h-14 w-40 bg-foreground/10 align-bottom" aria-label="Checking your roof" />
            ) : (
              <AnimatedNumber value={readyNow} format={formatKwh} />
            )}
            <span className="ms-2 text-2xl font-medium text-muted-foreground">kWh</span>
          </p>
          <p className="text-sm text-muted-foreground">
            What your roof has made so far today, minus home use.{" "}
            <span className="font-mono tabular">{formatKwh(available)}</span> kWh expected by sunset.
          </p>
        </div>
      )}
      <FieldGroup>
        <Field data-invalid={errors.kwh ? true : undefined}>
          <FieldLabel htmlFor={`${id}-kwh`}>Energy to sell (kWh)</FieldLabel>
          <Input
            ref={kwhRef}
            id={`${id}-kwh`}
            name="kwh"
            inputMode="decimal"
            autoComplete="off"
            value={kwh}
            onChange={(e) => {
              setTouched(true)
              setKwh(e.target.value)
            }}
            aria-invalid={errors.kwh ? true : undefined}
            aria-describedby={`${id}-kwh-help`}
            className="h-10 font-mono tabular"
          />
          {errors.kwh ? (
            <FieldError id={`${id}-kwh-help`}>{errors.kwh}</FieldError>
          ) : (
            <FieldDescription id={`${id}-kwh-help`}>
              {readyNow === undefined ? (
                <>
                  Up to <span className="font-mono tabular">{formatKwh(available)}</span> kWh forecast surplus before sunset (
                  {minuteLabel(untilMinute)} WAT).
                </>
              ) : (
                <>
                  Up to <span className="font-mono tabular">{formatKwh(readyNow)}</span> kWh now; more becomes available as
                  the sun rises, until {minuteLabel(untilMinute)} WAT.
                </>
              )}
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.kWp ? true : undefined}>
          <FieldLabel htmlFor={`${id}-kwp`}>Rooftop size (kWp)</FieldLabel>
          <Input
            ref={kWpRef}
            id={`${id}-kwp`}
            name="kwp"
            inputMode="decimal"
            autoComplete="off"
            value={kWp}
            onChange={(e) => setKwp(e.target.value)}
            aria-invalid={errors.kWp ? true : undefined}
            aria-describedby={`${id}-kwp-help`}
            className="h-10 font-mono tabular"
          />
          {errors.kWp ? (
            <FieldError id={`${id}-kwp-help`}>{errors.kWp}</FieldError>
          ) : (
            <FieldDescription id={`${id}-kwp-help`}>
              Your panels&rsquo; rated size, {KWP_MIN}–{KWP_MAX} kWp. It sets the most your roof could have made today.
            </FieldDescription>
          )}
        </Field>

        <Field data-invalid={errors.price ? true : undefined}>
          <FieldLabel htmlFor={`${id}-price`}>Price ({CURRENCY} per kWh)</FieldLabel>
          <Input
            ref={priceRef}
            id={`${id}-price`}
            name="price"
            inputMode="decimal"
            autoComplete="off"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            aria-invalid={errors.price ? true : undefined}
            aria-describedby={`${id}-price-help`}
            className="h-10 font-mono tabular"
          />
          {errors.price ? (
            <FieldError id={`${id}-price-help`}>{errors.price}</FieldError>
          ) : (
            <FieldDescription id={`${id}-price-help`}>
              Buyers pay{" "}
              <span className="font-mono tabular">
                {Number.isFinite(Number(kwh) * Number(price)) ? (Number(kwh) * Number(price)).toFixed(2) : "-"}
              </span>{" "}
              {CURRENCY} in total.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <VerificationPanel
        state={verification}
        onUseMax={(max) => {
          setTouched(true)
          setKwh(Math.min(max, available).toFixed(1))
          setErrors((e) => ({ ...e, kwh: undefined }))
        }}
      />

      {compact ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <Scale aria-hidden className="size-4 text-accent-text" />
          Fair price now <span className="font-mono text-foreground tabular">{formatPrice(suggestion.price)}</span>
          {Number(price) !== suggestion.price && (
            <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={() => setPrice(suggestion.price.toFixed(3))}>
              Use it
            </Button>
          )}
        </p>
      ) : (
        <aside className="flex flex-col gap-2 rounded-md border border-rule bg-muted p-3 text-sm">
          <p className="flex items-center gap-1.5 font-medium">
            <Scale aria-hidden className="size-4 text-accent-text" />
            Suggested price:{" "}
            <span className="font-mono tabular">{formatPrice(suggestion.price)}</span> {CURRENCY}/kWh
          </p>
          <p className="text-muted-foreground">{suggestion.reason}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => setPrice(suggestion.price.toFixed(3))}
            disabled={Number(price) === suggestion.price}
          >
            {Number(price) === suggestion.price ? "Suggestion applied" : "Use suggested price"}
          </Button>
        </aside>
      )}

      <Footer className="px-0 sm:px-0">
        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className={compact ? "h-14 w-full rounded-2xl font-display text-lg font-bold" : "w-full sm:w-auto"}
        >
          {submitting && <Spinner data-icon="inline-start" />}
          {submitting ? "Listing…" : compact ? "List for sale" : "List surplus"}
        </Button>
      </Footer>
    </form>
  )
}
