import Link from "next/link"

import { SUNPOOL_CONTRACTS, explorerAddress } from "@/lib/chain/contracts"
import { EMISSION_FACTOR } from "@/lib/seed"

const link = "underline decoration-dotted underline-offset-2 hover:text-foreground"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p className="max-w-3xl text-pretty">
          <strong className="font-medium text-foreground">Meter data is simulated.</strong> Payments and
          certificates are real transactions on the Celo Sepolia testnet. CO&#8322; is an estimate at{" "}
          {EMISSION_FACTOR.kgPerKwh} kg/kWh ({EMISSION_FACTOR.label},{" "}
          <a href={EMISSION_FACTOR.url} target="_blank" rel="noreferrer" className={link}>
            source
          </a>
          ); forecasts are not exact.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a className={link} href={explorerAddress(SUNPOOL_CONTRACTS.energyMarket)} target="_blank" rel="noreferrer">
            Market contract
          </a>
          <a className={link} href={explorerAddress(SUNPOOL_CONTRACTS.readingRegistry)} target="_blank" rel="noreferrer">
            Registry contract
          </a>
          <a className={link} href={explorerAddress(SUNPOOL_CONTRACTS.recToken)} target="_blank" rel="noreferrer">
            Certificate contract
          </a>
          <Link className={link} href="/double-claim">
            Double-claim proof
          </Link>
        </p>
        <p className="text-xs">Sunpool, IEEE ClimateChain Global Hackathon 2026. Built on Celo.</p>
      </div>
    </footer>
  )
}
