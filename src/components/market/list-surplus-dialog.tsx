"use client"

import { Sparkles } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { useMediaQuery } from "@/hooks/use-media-query"
import type { Market } from "@/hooks/use-market"
import { CURRENCY, formatKwh, formatPrice, minuteLabel, shortAddress } from "@/lib/format"
import { DEMO_SELLER, NEIGHBORHOOD, TOTAL_PANEL_KW } from "@/lib/seed"

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
            <DialogTitle className="font-display text-2xl font-medium">{title}</DialogTitle>
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
          <DrawerTitle className="font-display text-2xl font-medium">{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          {open && <ListSurplusForm market={market} onDone={() => onOpenChange(false)} Footer={DrawerFooter} />}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

type Errors = { kwh?: string; price?: string }

function ListSurplusForm({
  market,
  onDone,
  Footer,
}: {
  market: Market
  onDone: () => void
  Footer: React.ComponentType<React.ComponentProps<"div">>
}) {
  const id = useId()
  const available = availableSurplus(market)
  const suggestion = market.suggestion
  const [kwh, setKwh] = useState(() => String(Math.min(2, available).toFixed(1)))
  const [price, setPrice] = useState(() => suggestion.price.toFixed(3))
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const kwhRef = useRef<HTMLInputElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const untilMinute = NEIGHBORHOOD.sunsetMinutes

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const kwhValue = Number(kwh)
    const priceValue = Number(price)
    const next: Errors = {}
    if (!Number.isFinite(kwhValue) || kwhValue < 0.1 || kwhValue > available) {
      next.kwh =
        available < 0.1
          ? "No surplus is forecast for the rest of today."
          : `Enter between 0.1 and ${formatKwh(available)} kWh.`
    }
    if (!Number.isFinite(priceValue) || priceValue < PRICE_MIN || priceValue > PRICE_MAX) {
      next.price = `Enter a price between ${formatPrice(PRICE_MIN)} and ${formatPrice(PRICE_MAX)} ${CURRENCY}/kWh.`
    }
    setErrors(next)
    if (next.kwh) return kwhRef.current?.focus()
    if (next.price) return priceRef.current?.focus()

    setSubmitting(true)
    try {
      await market.listSurplus({
        kwh: Math.round(kwhValue * 10) / 10,
        price: Math.round(priceValue * 1000) / 1000,
        untilMinute,
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
            onChange={(e) => setKwh(e.target.value)}
            aria-invalid={errors.kwh ? true : undefined}
            aria-describedby={`${id}-kwh-help`}
            className="h-10 font-mono tabular"
          />
          {errors.kwh ? (
            <FieldError id={`${id}-kwh-help`}>{errors.kwh}</FieldError>
          ) : (
            <FieldDescription id={`${id}-kwh-help`}>
              Up to <span className="font-mono tabular">{formatKwh(available)}</span> kWh forecast
              surplus before sunset ({minuteLabel(untilMinute)} WAT).
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
                {Number.isFinite(Number(kwh) * Number(price)) ? (Number(kwh) * Number(price)).toFixed(2) : "—"}
              </span>{" "}
              {CURRENCY} in total.
            </FieldDescription>
          )}
        </Field>
      </FieldGroup>

      <aside className="flex flex-col gap-2 rounded-md border border-rule bg-muted p-3 text-sm">
        <p className="flex items-center gap-1.5 font-medium">
          <Sparkles aria-hidden className="size-4 text-accent-text" />
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

      <Footer className="px-0 sm:px-0">
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting && <Spinner data-icon="inline-start" />}
          {submitting ? "Listing…" : "List surplus"}
        </Button>
      </Footer>
    </form>
  )
}
