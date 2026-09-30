# CLAUDE.md — Sunpool (IEEE ClimateChain Global Hackathon 2026)

Working name: **Sunpool** (rename freely). Solo build, student entry, online hackathon.
Hackathon window: **Oct 5 – Oct 25, 2026**. Submit early; do not build up to the deadline.

## What we're building

Neighborhood solar trading on Celo. Households with rooftop solar sell surplus kWh to nearby buyers, paid in cUSD. Every verified kWh mints a renewable energy certificate (REC). A reading ID can be consumed exactly once, so certificates cannot be double counted. An AI layer forecasts generation and demand, suggests a fair clearing price, and matches sellers to buyers.

- **Track:** Renewable Energy & Energy Trading
- **Builds covered:** peer-to-peer energy trading, renewable certificate tracking, microgrid coordination, tokenized incentives
- **Chain:** Celo (testnet for the demo). Stablecoin: cUSD. Mobile-first story via MiniPay compatibility.
- **One-line pitch:** "Your neighbor's rooftop is your power plant. Sunpool makes the trade trustworthy."

## Submission requirements (everything we build serves these)

1. Track alignment statement
2. Project description: problem, solution, target users, scalability, ease of adoption
3. Demo video, 3–5 minutes
4. Public GitHub repo with source and documentation
5. Working prototype / demo link

Judges weigh real-world impact, technical soundness, and clarity. Prioritize a demo that never breaks over extra features.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- shadcn/ui primitives on Radix UI
- Icons: **Lucide React only** (one set, no mixing)
- Motion: Framer Motion (spring transitions, staggered enters, respect `prefers-reduced-motion`)
- Feedback: Sonner toasts. URL state: Nuqs.
- Charts: Recharts (or a hand-rolled SVG if styling requires it)
- Wallet/chain: wagmi + viem, Celo chain config
- Contracts: Solidity with **Hardhat** (works cleanly on Windows), OpenZeppelin, tests in TypeScript
- AI layer: TypeScript, server-side in Next.js route handlers. Start with a transparent model (solar curve + weather factor + exponential smoothing). Do not add a heavy ML dependency unless the simple model is finished and the demo is otherwise done.

## Setup commands (run once, PowerShell-compatible)

```bash
npx create-next-app@latest sunpool --typescript --tailwind --app --eslint
cd sunpool
npx shadcn@latest init
npm i framer-motion sonner nuqs lucide-react recharts wagmi viem @tanstack/react-query
npm i -D hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
npx skills add jakubkrehel/skills
npx skills add shadcn/ui
```

Design skills come from the `designb` workflow. Before any UI work, read the installed skills' SKILL.md files and follow them for component choices, spacing, typography, and motion.

## Repo layout

```
/contracts        Solidity (EnergyMarket, RECToken, ReadingRegistry)
/test             Hardhat tests
/scripts          deploy + seed scripts
/src/app          Next.js routes
/src/components   UI (shadcn-based, brand-tokened)
/src/lib          chain config, contract ABIs, forecast + matching logic, seeded data
/docs             PRD.md, ARCHITECTURE.md, DEMO_SCRIPT.md, SUBMISSION.md
```

## Smart contract rules

- `ReadingRegistry`: stores consumed reading IDs. A reading ID can be consumed once; a second attempt must revert with a clear custom error.
- Readings are signed by a registered meter/oracle key. The contract verifies the signature before minting.
- `RECToken`: one certificate per verified kWh batch, carrying meter ID, timestamp, and kWh in its data.
- `EnergyMarket`: list surplus, buy, settle in cUSD, emit events the UI streams into the trade tape.
- Use OpenZeppelin for access control, ERC standards, and reentrancy protection. Do not hand-roll these.
- Write tests first for: double-claim rejection, bad signature rejection, settlement math, and access control.
- **Verify Celo chain IDs, RPC URLs, and cUSD addresses against current Celo docs before hardcoding.** Testnets change. Put them in one config file with a source comment.
- Never commit private keys. Use `.env.local` and `.env.example`.

## Honesty rules for the demo (important for credibility)

- Meter data in the demo is **simulated**. Label it as simulated in the UI footer and in the README. Explain the production path: signed readings from certified smart meters or inverter APIs.
- Do not claim real CO2 savings. Show "estimated CO2 avoided" with the emission factor visible.
- The forecast chart shows a confidence band. Do not present it as exact.
- Do not invent testimonials, partners, or user numbers.

## Design direction: Warm Editorial

Brand: calm, trustworthy, sunlit, civic. Not crypto-bro. Personality: warm, precise, quietly confident.

- **Background:** warm off-white `#faf9f6`. Text: ink `#1a1714`.
- **Accent (only one):** Warm Terracotta `#ea580c` for primary actions, live states, and key numbers.
- **Borders:** sharp 1px dark ink borders, small radius, restrained card depth (flat with a subtle offset shadow on hover, no glows).
- **Type:** serif display for headlines (Fraunces or Instrument Serif), clean sans for body (Geist or Inter Tight), **JetBrains Mono** for kWh, prices, addresses, and tx hashes.
- **Hierarchy:** large editorial headlines against small, muted metadata tags.
- **Motion:** fast springs, staggered enters, a live trade tape that slides in new rows, numbers that count up. Purposeful only.
- **Above the fold:** live neighborhood trade tape + today's generation curve with forecast overlay + the "kWh traded / certificates minted / CO2 avoided (est.)" counters.

Banned: indigo-to-purple gradients, glassmorphism everywhere, evenly sized card grids with no hierarchy, stock hero sections, Lorem Ipsum, "Feature 1".

## UX rules

- **Zero dead ends.** Every button, toggle, and tab shows immediate feedback: skeleton, optimistic badge, or Sonner toast.
- **Seeded, realistic data.** Houses have names/IDs, panel sizes (kW), realistic daily curves, and believable prices in cUSD. Keep seed data in `/src/lib/seed.ts`.
- Cover loading, empty, error, and mobile states on every screen.
- Accessibility: contrast, visible focus rings, semantic elements, keyboard navigation.
- Mobile-first layouts. The buyer flow must work in a phone-width viewport (MiniPay story).

## Screens

1. **Market (home):** trade tape, generation/forecast chart, counters, list-surplus and buy actions
2. **My Home:** generation vs consumption, surplus available, AI price suggestion, active listings
3. **Certificate Ledger:** minted RECs, reading IDs with consumed status, link to block explorer
4. **Double-claim demo panel:** a clearly labeled control that attempts a second claim and shows the contract rejecting it
5. **About / Impact:** track alignment, scalability, adoption path

## Working agreements

- Plan before large changes. For any task touching more than 3 files, outline the plan first.
- Build order: seeded frontend first (the demo must always work) → contracts + tests → wallet + real settlement → forecast/matching → docs and video.
- Keep the seeded/mock path working as a fallback even after real chain calls exist (toggle via env flag).
- Run lint, typecheck, and contract tests before calling anything done.
- Commit small and often with clear messages. Git history is part of the submission.
- Keep `docs/SUBMISSION.md` updated as features land so the Devpost write-up is nearly done by the end.
- When unsure about a library API or chain detail, check the docs instead of guessing.

## Definition of done (for submission)

- [ ] Deployed contracts on Celo testnet, addresses in README
- [ ] Live demo URL working on desktop and phone width
- [ ] Double-claim rejection shown working
- [ ] README with setup, architecture diagram, and track alignment
- [ ] Demo video 3–5 minutes following `docs/DEMO_SCRIPT.md`
- [ ] Devpost submitted before the deadline, with buffer
