# Sunpool: submission draft

Living draft for the Devpost write-up. Updated as features land.

## Track alignment

Renewable Energy & Energy Trading. Sunpool covers peer-to-peer energy trading, renewable certificate tracking, microgrid coordination and tokenized incentives.

## Problem

In Lagos, grid supply is unreliable and many homes run diesel generators, while rooftop solar owners often produce more than they use at midday with no way to sell it to the people next door. Where local trading does exist, buyers have to trust the seller's numbers, and green claims can be counted twice.

## Solution

**Prepaid power from your neighbour's roof.** Lagos users already load prepaid units on their DisCo meter. Those units are locked to the meter, so Sunpool never resells them. Instead, neighbours load kWh of solar surplus from a nearby roof, delivered over a shared line (compound, estate or mini-grid). A small smart meter counts the units down and signs each reading. A neighborhood market where rooftop owners list surplus kWh and neighbors buy it with a dollar stablecoin on Celo (USDm, formerly cUSD, on mainnet; USDC on the testnet demo). Each sale is backed by a signed meter reading whose ID can be consumed once, which mints exactly one renewable energy certificate. A transparent forecast and price suggestion help sellers list a fair amount at a fair price.

## Target users

- Households with 3–10 kW rooftop arrays (sellers)
- Neighbors without panels, often phone-first and potentially in MiniPay (buyers)
- Community energy / microgrid coordinators

## Links

- Live demo: https://sunpool-gamma.vercel.app
- Activity: https://sunpool-gamma.vercel.app/activity
- Double-claim proof: https://sunpool-gamma.vercel.app/double-claim
- Contracts (Celo Sepolia, verified on Blockscout): ReadingRegistry `0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10`, RECToken `0xC92552b83C094E8052d9b8B4EDba34A3E1bA4ec6`, EnergyMarket (USDC) `0xAd7dF1530410e4eA9a6CAcb0C9C993958Aef0A29`

## What works today

- Contracts live on Celo Sepolia: signed meter readings verified on-chain (EIP-712), each reading ID consumable once (`ReadingAlreadyConsumed`), stablecoin settlement (USDC on testnet; USDm, formerly cUSD, on mainnet), ERC-721 certificates with meter ID, reading ID, timestamp and Wh. 20 tests cover double claims, bad signatures, settlement math and access control.
- The Market reads real listings and settled trades from the chain; wallets (MetaMask, MiniPay) can list surplus and buy.
- Double-claim page replays an already-consumed reading against the live contract and shows the rejection, no wallet needed.

- AI verification before the meter signs: each reading is checked against live Lagos irradiance from Open-Meteo (falls back to a modeled clear sky), the seller's energy already listed today (read from the chain, so it survives restarts), the time of day and neighbouring sellers. It returns accept, review or reject with a risk score and plain-language reasons. Shown in the Sell flow; exposed at `POST /api/verify`. 19 unit tests.
- `GET /api/forecast`: hourly generation forecast with a confidence band and a suggested price with its reasoning, driven by live irradiance.
- Certificate Ledger (`/certificates`): every certificate with producer, owner, meter and reading IDs, price paid and Blockscout links. "Verify reading" checks the registry from the browser.
- Threat model (`docs/THREAT_MODEL.md`), summarized on the About page: fake readings, replay, key theft, sybil wallets, admin risk, and what's demo-only versus mitigated.
- Offline seeded mode (`?source=seeded`) for Surulere, Lagos, clearly labeled as simulated
- Minimal app home: one Buy power / Sell surplus panel, "Load X kWh" in one tap, AI fair price on the Sell tab
- Live trade tape (on /activity) with pause/resume, optimistic "Pending" rows and screen-reader announcements
- Generation chart: metered (simulated) vs forecast with a confidence band, keyboard steppable, with a data table
- Counters: kWh traded, certificates minted, estimated CO₂ avoided with the emission factor and its source visible
- Buy a listing (pending → settled toast) and list surplus with a suggested price and inline validation
- Loading, empty (pre-dawn) and error (feed offline + retry) states, desktop and 360px phone width, reduced-motion support

## Scalability and adoption

**Who adopts first.** Estates, compounds and solar mini-grid operators, because a shared line between sellers and buyers already exists there and one operator can onboard a whole street. Lagos now licenses these operators directly: in May 2026 LASERC approved 14 licences and permits covering off-grid and embedded generation, independent distribution, metering services and interconnected mini-grids (see `docs/RESEARCH.md`). Sunpool is the settlement and certificate layer such an operator would otherwise build itself.

**Why buyers come.** Generator power costs ₦750/kWh (petrol) to ₦950/kWh (diesel) according to Nigeria's Minister of Power, against a ₦206.80–₦225/kWh Band A grid tariff. 51% of Lagos residents rent (Fortren & Company, 2026) and cannot put panels on their roof. Daytime-only users such as tailors, barbers and cold rooms need a few kWh, not a whole system.

**Why it's easy to adopt.**
- Phone-first: buyers pay from MiniPay, which is available in Nigeria and supports USDC and USDm, or from any EVM wallet. No new app or bank account.
- Familiar mental model: "load units" like a prepaid meter. Sunpool never touches DisCo prepaid units.
- Sellers list in one step; the price suggestion and the verification check run automatically.

**How it scales technically.**

| Today (demo) | Production |
| --- | --- |
| One simulated meter key, server-side, screened by the verification model | One key per certified smart meter or inverter, held on the device; registered and revoked through `METER_ADMIN_ROLE` |
| Celo Sepolia, test USDC | Celo mainnet, USDm or USDC, both supported in MiniPay |
| One neighbourhood market | One `EnergyMarket` per estate or mini-grid, sharing one `ReadingRegistry` and `RECToken`, so a reading can't be double counted across markets (already true for our two deployed markets) |
| Polling indexer in a route handler | Event indexer (The Graph, SubQuery or similar) |
| Manual listing | Auto-listing of forecast surplus at the suggested price; standing buy orders |

Celo fees are a fraction of a cent, so a 0.5 kWh purchase stays economical.

**Policy fit.** Certificates carry meter ID, reading ID, timestamp and Wh on-chain, giving companies and policymakers an auditable record of local renewable generation that can't be double counted. This supports transparent reporting toward COP 31 goals.

## Devpost sections

### Inspiration

Midday on a Lagos street: one roof has panels producing more than the house uses, and the shop next door is running a petrol generator. The power is right there; what's missing is a trustworthy way to meter it, pay for it and prove it was green.

### What it does

Rooftop owners list solar surplus backed by a meter-signed reading. A verification model checks each reading against real Lagos irradiance before it's signed. Neighbours buy it from a phone in a dollar stablecoin. Each sale pays the owner instantly and mints one renewable energy certificate. A reading can be consumed only once, so certificates can't be double counted, and the app proves this live against the contract.

### How we built it

Solidity contracts (`ReadingRegistry`, `EnergyMarket`, `RECToken`) on OpenZeppelin 5 with Hardhat 3 and 20 tests, deployed and verified on Celo Sepolia. EIP-712 signed meter readings. A Next.js App Router front end with wagmi and viem, plus server route handlers for the simulated meter, market indexing, forecasting and reading verification. Weather data comes from Open-Meteo.

### Challenges we ran into

- Test USDm was practically unobtainable on Celo Sepolia, so the live market settles in USDC from Circle's faucet and the USDm market is paused. The contracts take any ERC-20 stablecoin.
- Public RPC nodes prune old blocks, so the indexer derives timestamps for old events instead of fetching the blocks.
- Being honest about physical delivery: electricity can't travel through an app. We documented the three delivery paths and built for the realistic one first: a shared line in an estate or mini-grid.

### Accomplishments that we're proud of

- The full loop works on a public testnet with real wallets: list, buy, pay, certificate.
- The double-claim proof runs against the live contract with no wallet needed.
- Every number on screen is either on-chain or sourced, and simulated data is labelled as simulated.

### What we learned

Most of the trust problem in energy trading sits at the meter, not on the chain. A smart contract can guarantee "once", but only the meter can attest "real". That's why the verification model and the threat model matter as much as the contracts.

### What's next for Sunpool

A pilot proposal with one Lagos estate or mini-grid operator. Device-signed readings through an inverter cloud API, starting with Growatt's published Open API. Mainnet launch inside MiniPay. Auto-listing and standing buy orders.

## Demo video

_Link goes here after recording. Script: `docs/DEMO_SCRIPT.md`._

## Honesty notes

- Meter data is simulated: a server-side meter key signs readings. Trades, payments and certificates are real testnet transactions. Labeled in the UI footer and README.
- CO₂ avoided is an estimate using 0.456 kg CO₂e/kWh (Nigeria grid 2025, Ember via Our World in Data).
- Forecasts are shown with a confidence band.
