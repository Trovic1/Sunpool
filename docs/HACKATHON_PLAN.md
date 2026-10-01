# Hackathon plan: from working prototype to a submission that shows real-world use

Status on 2026-10-01: the full loop works on Celo Sepolia. A real wallet bought 2.5 kWh from the demo rooftop, paid 0.32 USDC, and received certificate #1. The double-claim test rejects a reused reading on the live contract.

This file is the agenda for the next sessions. Facts marked **(verify)** still need a source before they go into the pitch or the Devpost write-up.

## 1. What judges score, and where we stand

| Criterion | What we have | What is missing |
| --- | --- | --- |
| Real-world impact | Lagos setting, sourced grid emission factor, honest CO₂ estimate | Concrete user stories, a pilot proposal, a clear adoption path |
| Technical soundness | Verified contracts, 20 tests, signed readings, one-time reading IDs, live indexer | Architecture doc, certificate ledger, matching/forecast as a server route |
| Clarity | Clean market screen, double-claim page | About/Impact page, demo video, a 60-second story |

Submission checklist (from CLAUDE.md): track statement, project description, 3–5 minute video, public repo with docs, working demo link. Repo and demo link are done.

## 2. Who uses this in the real world (sample usage)

Each scenario names a seller, a buyer and the pain Sunpool removes. These are proposed use cases, not existing customers.

1. **Estate or compound with mixed rooftops.** A few houses on a street have panels; their midday output exceeds what they use. Neighbours without panels buy that surplus during the day instead of running a generator. Sunpool records each sale, pays the seller in stablecoins and gives the buyer a certificate.
2. **Small businesses buying daytime power.** A barber, tailor or cold-room operator next to a solar home buys a few kWh at a price below generator fuel cost **(verify: typical Lagos generator cost per kWh)**. Payment from a phone wallet (MiniPay) suits informal businesses.
3. **Community buildings as sellers.** Schools, churches or mosques with large roofs and weekday-only use sell weekend and holiday surplus to the surrounding street.
4. **Certificates for companies with sustainability reporting.** A company buys the certificates (not the electrons) to back a renewable-energy claim. The one-time reading ID is what makes that claim auditable.
5. **Mini-grid operators.** An operator running a solar mini-grid uses Sunpool as the settlement and certificate layer instead of building its own billing.

Important honesty point for the pitch: Sunpool handles **metering, accounting, payment and certification**. The electricity itself flows over existing wiring, a shared mini-grid or the distribution network. Physical delivery and the regulatory side **(verify: Nigerian mini-grid / NERC rules for peer-to-peer sales)** belong in the "path to production" slide.

## 3. How it scales (the production path)

| Today (demo) | Production |
| --- | --- |
| Simulated meter, readings signed by a server key | Readings signed on the device by certified smart meters or by inverter cloud APIs **(verify: which inverter brands common in Nigeria expose an API)** |
| One registered meter key | One key per meter, registered and revocable by a meter operator role (already supported by `ReadingRegistry`) |
| Celo Sepolia, USDC | Celo mainnet, USDm (formerly cUSD) or USDC, both supported in MiniPay |
| One neighbourhood | One market per neighbourhood or mini-grid; the registry and certificates can stay shared so double counting is impossible across markets (already true for our two markets) |
| Manual listing | Auto-listing of forecast surplus with the suggested price; buyers set standing orders |
| Polling indexer in a route handler | Event indexer (The Graph, SubQuery or similar on Celo) |

## 4. Build list for the next sessions (in priority order)

1. **About / Impact page**: track alignment, the five user stories above, the production path, honest notes. Judges read this.
2. **Certificate Ledger page**: every certificate with meter ID, reading ID, Wh, owner and an explorer link; reading IDs marked "consumed".
3. **My Home page**: the connected wallet's listings, purchases and certificates; generation vs consumption; the price suggestion with its reasoning; cancel a listing.
4. **AI layer as a route handler** (per CLAUDE.md): `/api/forecast` and `/api/match` returning the forecast, price suggestion and a seller-to-buyer match, so the model is visible and testable.
5. **Polish found while testing**: names truncate in the trade tape ("Sunpool de…", "Y…"); the `?state=` parameter should be ignored or cleaned in on-chain mode; mobile and MiniPay test.
6. **Docs**: `docs/ARCHITECTURE.md` with a diagram, `docs/DEMO_SCRIPT.md`, finish `docs/SUBMISSION.md` (scalability and adoption section).
7. **Design pass** (last, as agreed).

## 5. How we present it

60-second story: a Lagos street at noon. One house has surplus solar, the neighbour is running a generator. Sunpool lets the neighbour buy that surplus from a phone, pays the owner instantly, and issues a certificate that can never be claimed twice. Then show it live.

Demo video outline (3–5 minutes):

1. Problem in Lagos (30 s): unreliable grid, generators, wasted rooftop surplus, untrustworthy green claims.
2. Live market (60 s): tape, generation chart with confidence band, counters with the emission factor visible.
3. Sell (45 s): connect wallet, list surplus, the reading is consumed on-chain.
4. Buy (45 s): second wallet buys, USDC moves, certificate minted, open it on Blockscout.
5. Double claim (30 s): replay a used reading, contract rejects it.
6. Scale and honesty (30 s): simulated meter today, signed device readings tomorrow; mainnet USDm via MiniPay; one market per neighbourhood.

## 6. Research to do before writing the pitch

- Lagos generator running cost per kWh and diesel/petrol price trend **(verify, with source)**
- Nigeria rooftop / mini-grid adoption figures **(verify, with source; do not invent numbers)**
- NERC rules on mini-grids and selling electricity between neighbours **(verify)**
- Inverter brands in Nigeria with cloud APIs for production data **(verify)**
- MiniPay availability and supported stablecoins in Nigeria **(verify)**
