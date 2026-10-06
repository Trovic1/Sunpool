# Threat model

What Sunpool protects, who could attack it, what stops them today, and what is still demo-grade. Written 2026-10-06 against the contracts deployed on Celo Sepolia (see README) and the code in this repo.

The short version: **the chain makes every claim count once and every payment atomic; the weak link is whoever signs the meter reading.** In the demo that is a server key, guarded by a transparent verification check. In production it is a key inside each meter.

## Assets

| Asset | Where it lives | Why it matters |
| --- | --- | --- |
| Renewable energy certificates (RECs) | `RECToken` (ERC-721), minted to the buyer on each trade | Companies use them to back renewable-energy claims. A fake or double-counted certificate is greenwashing. |
| Payments | USDC moved buyer → seller inside `EnergyMarket.buy` | Real money on mainnet. |
| Reading IDs | `ReadingRegistry.consumedAt` | One reading backs at most one listing and one certificate. |
| Meter signing keys | Demo: `METER_SIGNER_PRIVATE_KEY` on the server. Production: one key per device | Whoever holds a registered key can create energy on paper. |
| Admin keys | `DEFAULT_ADMIN_ROLE`, `METER_ADMIN_ROLE`, `PAUSER_ROLE`, held by the deployer account | Can register meter keys, grant minting, pause the market. |
| Meter data | Reading Wh, timestamps and seller address, public on-chain | Household consumption patterns are personal data. |

## Trust boundaries

```
 seller's browser ──(seller, wh, kWp)──▶ /api/readings (server)          ← boundary 1: untrusted input
                                           │ verification check (src/lib/verify.ts)
                                           │   reads Open-Meteo                ← boundary 2: third-party data
                                           │   reads Listed events on Celo
                                           ▼
                                  meter key signs EIP-712 reading           ← boundary 3: the oracle
                                           │
 seller's wallet ──list(reading, sig)──▶ EnergyMarket ─▶ ReadingRegistry    ← boundary 4: on-chain rules
 buyer's wallet ──buy(id, maxPrice)───▶ EnergyMarket ─▶ USDC, RECToken
                                           ▲
                         admin account ────┘ roles, pause, meter keys       ← boundary 5: privileged keys
```

## Threats and mitigations

| # | Threat | Mitigation today | Status |
| --- | --- | --- | --- |
| T1 | **Fake readings**: a seller asks the meter for energy their roof never produced | `/api/readings` signs only after `verifyReading` passes: daylight only; requested Wh plus everything the seller already claimed today must fit under kWp × today's irradiation (Open-Meteo) × 0.8 performance ratio minus a 300 W self-consumption floor; risk score with peer comparison ([`src/lib/verify.ts`](../src/lib/verify.ts)). Hard cap 10 kWh per reading, 25 readings per seller per day. | Partly mitigated. The seller **declares** kWp (clamped 1–15), so a liar gets a 15 kWp bound. Production: kWp comes from the meter's registration, and the device measures energy instead of the seller asking for it. |
| T2 | **Oracle compromise**: the meter key leaks and an attacker signs arbitrary readings | Key is a server env var, never in the repo or the browser. `ReadingRegistry.revokeMeter` (`METER_ADMIN_ROLE`) disables a key at once; every listing after that reverts with `UnregisteredMeter`. `EnergyMarket.pause` (`PAUSER_ROLE`) stops trading. | Demo-grade: one key for all sellers, so a leak affects every listing. Production: one key per device in a secure element (below). |
| T3 | **Replay / double claim**: list the same reading twice, or reuse a reading in a second market | `ReadingRegistry.consume` records `consumedAt[readingId]` and reverts with `ReadingAlreadyConsumed` on reuse. The registry is shared by both deployed markets, so a reading cannot be claimed once per market. EIP-712 domain binds signatures to this chain and contract. Shown live on `/double-claim`; covered by contract tests. | Mitigated. |
| T4 | **Reading theft**: someone else lists a reading issued to a seller | The reading names the seller and is signed with it; `EnergyMarket.list` reverts with `NotSeller` unless `msg.sender == reading.seller`. | Mitigated. |
| T5 | **Hoarding readings**: request many readings quickly, list them later | The verification counts the seller's on-chain `Listed` Wh since WAT midnight ([`src/lib/chain/listings.ts`](../src/lib/chain/listings.ts)), so it survives restarts and is the same on every instance. The meter also reserves issued-but-unlisted Wh in memory before it awaits the check, so a burst of parallel requests cannot all pass. | Partly mitigated. The in-memory reservation is per server instance, and the contract does not check reading freshness, so unlisted readings from several instances could be listed on another day. Production: device-signed readings with a monotonic counter and a freshness window in the contract. |
| T6 | **Sybil wallets**: split one roof across many wallets to multiply the per-seller bound | Peer comparison raises risk for outsized listings; 10 kWh cap per reading. | **Not mitigated in the demo**: a new wallet is a new seller. Production: the bound attaches to the meter ID, not the wallet, and one meter is registered per physical installation by a meter operator. |
| T7 | **Bad weather data**: Open-Meteo is down, slow or returns junk | 3 s timeout, schema and range checks, then fallback to a clear-sky model labelled "modeled", which only loosens the bound. Responses are cached 30 minutes. | Mitigated for availability. A poisoned weather feed could loosen the bound up to clear sky, not beyond. |
| T8 | **Chain read failure** during verification | `/api/readings` fails closed: if today's listings cannot be read from Celo, the meter does not sign (HTTP 503). | Mitigated. |
| T9 | **Price manipulation**: wash trades to move the suggested price | The suggestion is advisory; each seller sets their own price and each buyer passes `maxPricePerKwh`. It uses the median of the last 20 trades (robust to a few outliers) and moves it at most ±5%; it falls back to a seeded price band below 5 trades. | Partly mitigated. Wash trades between two wallets cost only gas on testnet. Production: weight by distinct counterparties, ignore self-loops. |
| T10 | **Front-running / price change** before a buy lands | `buy(listingId, maxPricePerKwh)` reverts with `PriceChanged` if the price is above what the buyer saw; listings are bought whole and `nonReentrant`; payment and certificate mint happen in one transaction. | Mitigated for price. A faster buyer can still take a listing first, which is ordinary first-come behaviour. |
| T11 | **Admin key risk**: the single deployer account holds all roles | Roles are split in code (`METER_ADMIN_ROLE`, `PAUSER_ROLE`, `MINTER_ROLE`, `CONSUMER_ROLE`) using OpenZeppelin `AccessControl`; only `EnergyMarket` holds `CONSUMER_ROLE` and `MINTER_ROLE`. | Demo-grade: one externally owned account holds every admin role. Production: a multi-sig (for example Safe on Celo) holds `DEFAULT_ADMIN_ROLE`; a separate operator multi-sig holds `METER_ADMIN_ROLE`; a hot pauser key can only pause. |
| T12 | **Meter data privacy**: per-household Wh and timestamps are public on-chain | Readings carry a wallet address and a meter ID hash, no name or street. The demo's seeded houses are fictional. | Open. Production: post batched or aggregated readings (for example per hour), keep raw interval data off-chain with the operator, and let households rotate wallets. Nigeria's Data Protection Act 2023 applies to the operator. |

## What is real, what is demo-only

**Real (enforced on Celo Sepolia):** one-time reading IDs, meter signature checks, seller binding, price-protected atomic settlement, certificate minting only by the market, revocable meter keys, pause.

**Real (enforced by the server):** the verification check on every reading the demo meter signs, using live Open-Meteo irradiance when reachable and the seller's on-chain listings.

**Demo-only:** the meter itself (simulated; energy figures are requested, not measured), the single shared meter key, the declared rooftop size, the in-memory reading counter, and a single admin account.

## Production path

1. **Per-device keys in a secure element.** Each smart meter or inverter gateway generates its key inside a secure element (for example an ATECC608-class chip or a TPM) and never exports it. The meter signs the same EIP-712 `Reading` the contract already verifies, so the contracts do not change.
2. **Registration and revocation by a meter operator.** A licensed installer or mini-grid operator registers each device's public key with `registerMeter(meterId, signer)` under `METER_ADMIN_ROLE`, records the installation's kWp with it, and calls `revokeMeter` when a device is tampered with, replaced or decommissioned.
3. **Inverter API attestation.** Where meters are not yet installed, pull production from the inverter vendor's cloud API (Growatt and others publish one; see `docs/RESEARCH.md`) and sign server-side only figures the API reports, still passed through the same verification check.
4. **Multi-sig admin.** Move `DEFAULT_ADMIN_ROLE` and `METER_ADMIN_ROLE` to multi-sig wallets; keep a single-purpose pauser key for emergencies.
5. **Freshness and counters in the contract.** Add a maximum reading age and a per-meter monotonic counter in a future `ReadingRegistry` version, so a hoarded or out-of-order reading reverts on-chain rather than relying on the server.
6. **Keep the verification check as a second line.** With device-signed readings the check moves from "gate" to "monitor": it flags meters whose output does not match the weather or their neighbours, which is how a tampered meter gets caught.
