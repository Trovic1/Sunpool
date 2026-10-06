# Sunpool

**Prepaid power from your neighbour's roof.** Load solar units from the house next door, the way you load a prepaid meter. Sunpool makes the trade trustworthy.

Neighborhood solar trading on Celo. Households with rooftop solar sell surplus kWh to nearby buyers, paid in a dollar stablecoin: USDC on the Celo Sepolia testnet, USDm (Mento Dollar, formerly cUSD) on mainnet. Every verified kWh batch mints a renewable energy certificate (REC), and a meter reading ID can be consumed only once, so certificates cannot be double counted. A transparent forecasting layer predicts generation, suggests a fair price and matches sellers to buyers.

IEEE ClimateChain Global Hackathon 2026 · Track: Renewable Energy & Energy Trading.

**Live demo:** https://sunpool-gamma.vercel.app · **Activity:** https://sunpool-gamma.vercel.app/activity · **Double-claim proof:** https://sunpool-gamma.vercel.app/double-claim

> **Meter data is simulated.** A server-side meter key signs each reading (`/api/readings`), and only after the reading passes a verification check against live sunlight data for Surulere (Open-Meteo) and the seller's listings on Celo. Listings, USDC payments and certificates are real transactions on the Celo Sepolia testnet. In production, certified smart meters or inverter APIs sign readings on the device. The generation chart for Surulere, Lagos is modeled, not metered. Security assumptions and open risks: [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## How power reaches the buyer

In Lagos, most homes load prepaid units onto their DisCo meter. Those units are locked to that meter number and cannot be resold, and Sunpool never touches them. Sunpool sells **solar surplus**: midday output that a rooftop makes beyond what its home uses. That power travels over a shared line (a compound, an estate or a mini-grid) to the buyer's socket. A small smart meter on that line counts the loaded kWh down like prepaid units and signs each reading. In this demo the meter is simulated.

## Deployed contracts (Celo Sepolia, chain ID 11142220)

| Contract | Address |
| --- | --- |
| `ReadingRegistry` | [`0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10`](https://celo-sepolia.blockscout.com/address/0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10#code) |
| `RECToken` (ERC-721) | [`0xC92552b83C094E8052d9b8B4EDba34A3E1bA4ec6`](https://celo-sepolia.blockscout.com/address/0xC92552b83C094E8052d9b8B4EDba34A3E1bA4ec6#code) |
| `EnergyMarket` (USDC, live) | [`0xAd7dF1530410e4eA9a6CAcb0C9C993958Aef0A29`](https://celo-sepolia.blockscout.com/address/0xAd7dF1530410e4eA9a6CAcb0C9C993958Aef0A29#code) |
| `EnergyMarket` (USDm, paused) | [`0xEc37879ac09BE6C49539de1B3CE29eb9f220f602`](https://celo-sepolia.blockscout.com/address/0xEc37879ac09BE6C49539de1B3CE29eb9f220f602#code) |
| USDC (settlement token) | [`0x01C5C0122039549AD1493B8220cABEdD739BC44E`](https://celo-sepolia.blockscout.com/address/0x01C5C0122039549AD1493B8220cABEdD739BC44E) |

Source is verified on Blockscout. Network details live in `src/lib/chain/celo.ts` with their sources.

**Why USDC on testnet:** the contracts settle in any ERC-20 stablecoin. The first market used USDm (formerly cUSD), but test USDm is practically unobtainable on Celo Sepolia: on 2026-10-01 the Mento USDC/USDm pool held 0.0014 USDm and there is no CELO/USDm pool. Test USDC is free from Circle's faucet, so the live market settles in USDC and the USDm market is paused. On mainnet, Sunpool would settle in USDm, which MiniPay supports alongside USDC.

## How it works

```
 simulated meter ──signs EIP-712 reading──▶ seller's wallet
                                               │ list(reading, signature, price)
                                               ▼
                      ┌──────────────── EnergyMarket ────────────────┐
                      │ consume(reading) ─▶ ReadingRegistry          │
                      │   verifies meter signature, marks ID used    │
                      │   (second claim ⇒ ReadingAlreadyConsumed)    │
                      │ buy(listing) ─▶ USDC buyer ⇒ seller          │
                      │             ─▶ RECToken.mint(buyer, data)    │
                      └──────────────── emits TradeSettled ──────────┘
                                               │
                         /api/market indexes events ▶ live trade tape
```

## Try it

1. Use your own wallet (MetaMask or MiniPay). The app adds the Celo Sepolia network when you connect.
2. Get test CELO for gas: https://faucet.celo.org/celo-sepolia
3. Get test USDC to buy with: https://faucet.circle.com, pick **Celo Sepolia**. In the app's wallet menu, "Add USDC to wallet" makes it show up in MetaMask.
4. Buy a listing from the Sunpool demo rooftop, or list your own surplus (needs only CELO for gas). To test both sides, use two wallet accounts.
5. Open `/double-claim` and press "Claim it again" to watch the contract reject a reading that was already used. No wallet needed.

## Status

| Piece | State |
| --- | --- |
| Contracts + 20 tests (double claim, signatures, settlement math, access control) | Done, deployed |
| Market screen on Celo Sepolia: wallet, buy, list, live tape, counters | Done |
| Double-claim test page (live contract) | Done |
| Seeded offline demo (`?source=seeded`) | Done |
| About & impact page (delivery paths, use cases, sourced numbers, production path, security & trust) | Done |
| AI verification of meter readings (live irradiance bound, on-chain per-seller accounting, anomaly score) + 19 unit tests | Done |
| `/api/forecast` and `/api/verify` route handlers | Done |
| Threat model ([`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md)) | Done |
| My Home, Certificate Ledger | Planned |

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Copy `.env.example` to `.env.local`. `METER_SIGNER_PRIVATE_KEY` must be the key registered in `ReadingRegistry` for listing to work.

The offline demo stays available at `/?source=seeded` (or `NEXT_PUBLIC_DATA_SOURCE=seeded`), with URL-driven states for recording:

- `/?source=seeded&state=live`: simulated clock, trades stream into the tape
- `/?source=seeded&state=empty`: pre-dawn, no trades yet
- `/?source=seeded&state=error`: trade feed offline, with retry

Checks: `npm run lint`, `npm run typecheck`, `npm run test:unit` (verification and forecast logic, `node:test` via tsx), `npm run contracts:test`, `npm run build`.

Contracts: `npm run contracts:test`, `npm run contracts:deploy` (needs `DEPLOYER_PRIVATE_KEY`), `npm run contracts:abis` after any contract change.

## How the numbers are made

- **Seed data** (`src/lib/seed.ts`): 14 named households, 8 with rooftop arrays (2.8–8.4 kW). Deterministic PRNG, so every run looks the same.
- **Solar curve:** half-sine between Lagos sunrise and sunset (06:45–18:45 WAT, early October), scaled to a specific yield of 5.0 kWh/kWp/day (Lagos is typically 4.5–5.4).
- **Forecast chart** (`src/lib/forecast.ts`): clear-sky curve × forecast weather factor, corrected by an exponentially smoothed (α = 0.3) ratio of metered to forecast output. The confidence band widens with the horizon. No ML dependency.
- **Sunlight data** (`src/lib/irradiance.ts`): hourly global horizontal irradiance (GHI, W/m²) and cloud cover for Surulere (6.50° N, 3.35° E) from the free [Open-Meteo forecast API](https://open-meteo.com/en/docs), cached 30 minutes. This is weather-model irradiance, not a pyranometer. If the API fails or takes over 3 s, a clear-sky curve (1000 W/m² at noon) is used and labelled "modeled".
- **AI verification of readings** (`src/lib/verify.ts`, `POST /api/verify`, enforced in `/api/readings`): a transparent rule-based anomaly check, not a trained model.
  - *Time of day:* no new surplus reading before sunrise or after sunset (hard reject); low sun near the edges adds risk.
  - *Physical limit:* most a roof could spare so far today = kWp × irradiation since midnight ÷ 1 kW/m² × 0.8 performance ratio − 300 W self-consumption × daylight hours. The new reading plus the seller's `Listed` Wh since WAT midnight (read from Celo, so it survives restarts) must fit (hard reject).
  - *Neighbours:* z-score of the request against recent listings by other sellers (needs at least 5).
  - *Risk* = 0.60 × share of the limit used + 0.25 × outlier score + 0.15 × low sun. Reject on a hard rule or risk ≥ 0.70; 0.40–0.70 is signed but flagged for review. The Sell form shows the verdict, risk, reasons and data source before signing. Rooftop size is declared by the seller (1–15 kWp) in the demo.
- **Forecast API** (`GET /api/forecast?kWp=5`): hourly kWh for a rooftop = kWp × GHI/1000 × 0.8, with a band of ±(10% + 3% per hour ahead + up to 25% for cloud cover); on the modeled sky, 75% of clear sky with a 30–100% band.
- **Price suggestion:** median of the last 20 trades, adjusted up to ±5% for next-hour supply vs buyer demand. `/api/forecast` uses live-irradiance supply for the neighbourhood's 42 kWp; the market panel still uses the modeled curve.
- **Estimated CO₂ avoided:** traded kWh × 0.456 kg CO₂e/kWh (Nigeria grid 2025, lifecycle, [Ember via Our World in Data](https://ourworldindata.org/grapher/carbon-intensity-electricity)). This is an estimate; it assumes each traded kWh displaces an average grid kWh.

## Stack

Next.js (App Router) · TypeScript · Hardhat 3 + viem · OpenZeppelin 5 · Tailwind CSS v4 · shadcn/ui (Radix) · Lucide · Framer Motion · Sonner · Nuqs · Recharts · wagmi + viem (Celo Sepolia).

## Docs

- [`docs/PRD.md`](docs/PRD.md): design PRD, concept and Deep forest brand; [`DESIGN.md`](DESIGN.md): tokens and components
- [`docs/SUBMISSION.md`](docs/SUBMISSION.md): running Devpost write-up
- [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md): assets, trust boundaries, threats and mitigations, production path
