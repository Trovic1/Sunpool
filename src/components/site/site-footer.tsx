import Link from "next/link"

import { SUNPOOL_CONTRACTS, explorerAddress } from "@/lib/chain/contracts"
import { EMISSION_FACTOR } from "@/lib/seed"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p className="text-pretty">
          <strong className="font-medium text-foreground">Meter data is simulated.</strong> A server-side
          meter key signs each reading. Listings, USDm payments and certificates are real transactions on
          the Celo Sepolia testnet. In production, certified smart meters or inverter APIs sign readings
          on the device.
        </p>
        <p className="text-pretty">
          CO&#8322; figures are estimates: traded kWh × {EMISSION_FACTOR.kgPerKwh} kg CO&#8322;e/kWh (
          {EMISSION_FACTOR.label},{" "}
          <a
            href={EMISSION_FACTOR.url}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
          >
            {EMISSION_FACTOR.source}
          </a>
          ). Forecasts carry a confidence band and are not exact.
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <a
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            href={explorerAddress(SUNPOOL_CONTRACTS.energyMarket)}
            target="_blank"
            rel="noreferrer"
          >
            EnergyMarket contract
          </a>
          <a
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            href={explorerAddress(SUNPOOL_CONTRACTS.readingRegistry)}
            target="_blank"
            rel="noreferrer"
          >
            ReadingRegistry contract
          </a>
          <a
            className="underline decoration-dotted underline-offset-2 hover:text-foreground"
            href={explorerAddress(SUNPOOL_CONTRACTS.recToken)}
            target="_blank"
            rel="noreferrer"
          >
            RECToken contract
          </a>
          <Link className="underline decoration-dotted underline-offset-2 hover:text-foreground" href="/double-claim">
            Double-claim test
          </Link>
        </p>
        <p className="tag pt-2">Sunpool · IEEE ClimateChain Global Hackathon 2026 · Built on Celo</p>
      </div>
    </footer>
  )
}
