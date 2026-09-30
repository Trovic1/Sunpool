# Sunpool

**Your neighbor's rooftop is your power plant. Sunpool makes the trade trustworthy.**

Neighborhood solar trading on Celo. Households with rooftop solar sell surplus kWh to nearby buyers, paid in cUSD. Every verified kWh batch mints a renewable energy certificate (REC), and a meter reading ID can be consumed only once, so certificates cannot be double counted. A transparent forecasting layer predicts generation, suggests a fair price and matches sellers to buyers.

IEEE ClimateChain Global Hackathon 2026 · Track: Renewable Energy & Energy Trading.

> **Meter data in this demo is simulated.** The seeded neighborhood is Surulere, Lagos, Nigeria. In production, readings are signed by certified smart meters or inverter APIs before a certificate is minted.

## Status

| Piece | State |
| --- | --- |
| Market screen (seeded): trade tape, generation + forecast chart, counters, listings, list surplus | Done |
| My Home, Certificate Ledger, Double-claim demo, About / Impact | Planned |
| Contracts (`ReadingRegistry`, `RECToken`, `EnergyMarket`) + tests | Planned |
| Wallet + real cUSD settlement on Celo testnet | Planned |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Demo states are URL-driven so every state can be shown on camera:

- `/?state=live` (default): simulated clock, trades stream into the tape
- `/?state=empty`: pre-dawn, no trades yet
- `/?state=error`: trade feed offline, with retry

Checks: `npm run lint`, `npx tsc --noEmit`, `npm run build`.

## How the numbers are made

- **Seed data** (`src/lib/seed.ts`): 14 named households, 8 with rooftop arrays (2.8–8.4 kW). Deterministic PRNG, so every run looks the same.
- **Solar curve:** half-sine between Lagos sunrise and sunset (06:45–18:45 WAT, early October), scaled to a specific yield of 5.0 kWh/kWp/day (Lagos is typically 4.5–5.4).
- **Forecast** (`src/lib/forecast.ts`): clear-sky curve × forecast weather factor, corrected by an exponentially smoothed (α = 0.3) ratio of metered to forecast output. The confidence band widens with the horizon. No ML dependency.
- **Price suggestion:** median of the last 20 trades, adjusted up to ±5% for next-hour supply vs buyer demand.
- **Estimated CO₂ avoided:** traded kWh × 0.456 kg CO₂e/kWh (Nigeria grid 2025, lifecycle, [Ember via Our World in Data](https://ourworldindata.org/grapher/carbon-intensity-electricity)). This is an estimate; it assumes each traded kWh displaces an average grid kWh.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide · Framer Motion · Sonner · Nuqs · Recharts · wagmi + viem (Celo) · Hardhat + OpenZeppelin.

## Docs

- [`docs/PRD.md`](docs/PRD.md): design PRD and Warm Editorial brand
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md): running Devpost write-up
