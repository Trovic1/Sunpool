import { EMISSION_FACTOR } from "@/lib/seed"

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-6">
        <p className="text-pretty">
          <strong className="font-medium text-foreground">Meter data is simulated for this demo.</strong>{" "}
          In production, readings are signed by certified smart meters or inverter APIs before a
          certificate is minted.
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
        <p className="tag pt-2">Sunpool · IEEE ClimateChain Global Hackathon 2026 · Built on Celo</p>
      </div>
    </footer>
  )
}
