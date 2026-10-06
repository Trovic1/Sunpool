# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Hackathon judges (primary).** IEEE ClimateChain Global Hackathon 2026 judges: IEEE academics and practitioners in blockchain and AI. They watch a 3–5 minute demo video and click the live demo, usually on a laptop, sometimes on a phone. They score climate impact, innovation, technical execution, practical usefulness and presentation. They are skeptical of crypto hype and fabricated numbers.
2. **Buyers (first in-product user).** Renters, small shops (tailors, barbers, cold rooms) and neighbours without panels in Lagos. Phone-first, often on modest connections, potentially inside MiniPay. Their job: load a few kWh of cheaper-than-generator solar from a nearby roof and get a receipt they can trust.
3. **Sellers.** Households with 3–10 kW rooftop arrays whose midday output exceeds what they use. Their job: list surplus at a fair price and get paid instantly.

## Product Purpose

Sunpool is a hackathon demo (IEEE ClimateChain Global Hackathon 2026, track: Renewable Energy & Energy Trading; submissions close 25 Oct 2026). It shows neighbourhood solar trading on Celo: rooftop owners sell surplus kWh to nearby buyers for a dollar stablecoin, each sale is backed by a meter-signed reading that can be consumed only once, and each sale mints one renewable energy certificate. Success means placing in the hackathon: judges understand the climate problem, see the full loop working live, and trust every number on screen. No post-hackathon pilot is planned.

## Positioning

"Prepaid power from your neighbour's roof." Lagos users already load prepaid units onto their DisCo meter; Sunpool borrows that mental model for solar surplus delivered over a shared line, without touching DisCo units. The trust mechanism is the differentiator: an AI verification check against live Lagos irradiance before the meter signs, and a reading ID that the contract consumes once, so certificates can't be double counted. The double-claim rejection is demonstrated live against the deployed contract.

## Operating Context

- Live demo: https://sunpool-gamma.vercel.app (Market, Activity, Certificates, Proof, About). Offline seeded fallback at `/?source=seeded`.
- Contracts deployed and verified on Celo Sepolia (chain 11142220); settlement in test USDC. Wallets: MetaMask or MiniPay.
- Judges evaluate through the demo video (`docs/DEMO_SCRIPT.md`) and the Devpost write-up (`docs/SUBMISSION.md`), then the public GitHub repo.
- Setting: Surulere, Lagos. Times are shown in WAT.

## Capabilities and Constraints

- Working today: list surplus (with AI verification), buy, stablecoin settlement, certificate minting, live trade tape, certificate ledger, double-claim proof, generation forecast with confidence band, sourced CO₂ estimate.
- Not built: My Home page, seller-to-buyer matching (`/api/match`).
- Meter data is simulated (a server-side key signs readings). Physical delivery of electricity is outside the app; the realistic first deployment is a shared line in an estate or mini-grid.
- Terminology: buyers "load" kWh; sellers "list surplus"; one reading → one sale → one certificate; "estimated CO₂ avoided".
- The demo must never break: keep the seeded fallback working.

## Brand Commitments

- Name: Sunpool. Concept: "Prepaid power from your neighbour's roof." (`docs/PRD.md`).
- Voice: plain and specific. Numbers carry units. No hype words, no exclamation marks in system copy. Errors are calm and say how to recover. Sentence case.
- Honesty rules are binding: label simulated data as simulated, show the emission factor and its source with any CO₂ figure, show forecasts with a confidence band, and never invent testimonials, partners, customers or user numbers.

## Evidence on Hand

- Live on-chain activity: 2 certificates, 7.3 kWh traded (as of 6 Oct 2026); verified contract addresses in `README.md`.
- Sourced facts in `docs/RESEARCH.md`: generator cost ₦750–950/kWh, Band A tariff ₦206.80–225/kWh, 51% of Lagos residents rent, LASERC licensing, MiniPay availability in Nigeria, Nigeria grid emission factor 0.456 kg CO₂e/kWh.
- Threat model: `docs/THREAT_MODEL.md`. 20 contract tests, 19 verification unit tests.
- Absent, never fabricate: real users, pilot partners, testimonials, adoption figures, Lagos rooftop-solar penetration numbers.

## Product Principles

1. **Every number is on-chain or sourced.** If it's simulated or estimated, the screen says so.
2. **Show the trust mechanism working.** Proof beats claims: the double-claim rejection and the AI verification run live.
3. **Buyers first.** After the judges, the phone-first buyer loading a few kWh is the path that must feel effortless.
4. **The demo never breaks.** A fallback exists for every live dependency.

## Accessibility & Inclusion

WCAG 2.2 AA. The buyer flow works at 360px width with no horizontal scroll at 320px. Keyboard and screen-reader paths for all interactive elements, including the chart; reduced-motion support.
