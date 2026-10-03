# Sunpool design PRD

IEEE ClimateChain Global Hackathon 2026 · Track: Renewable Energy & Energy Trading
Working name: Sunpool. Pitch: "Your neighbor's rooftop is your power plant. Sunpool makes the trade trustworthy."

## Goal

Sunpool lets households with rooftop solar sell surplus kWh to nearby buyers, settled in cUSD on Celo. Every verified kWh batch mints a renewable energy certificate (REC). Each meter reading ID can be consumed only once, so a certificate cannot be double counted. A transparent forecasting layer predicts generation and demand, suggests a fair clearing price, and matches sellers to buyers.

**The one thing the design must achieve:** in the first five seconds, a judge or a neighbor should see that energy is changing hands right now, between named homes, at a believable price, and that every trade is accounted for exactly once. Trust is the product. The page should read as a civic ledger, not a trading terminal.

Success for the hackathon build:

- The demo never breaks. The seeded path works with no wallet, no network and no chain.
- The Market screen shows, above the fold on desktop, the live trade tape, today's generation curve with forecast and confidence band, and the three counters.
- The double-claim rejection is visible and easy to understand.
- Simulated data is labeled as simulated wherever it appears.

## Audience

1. **Hackathon judges** (primary for the next 3 weeks). They watch a 3–5 minute video and click a demo link, often on a laptop, sometimes on a phone. They weigh real-world impact, technical soundness and clarity. They are skeptical of crypto hype and fabricated numbers.
2. **Prosumer households**: homeowners with 3–10 kW rooftop arrays. They want to know what their surplus is worth today and to list it without learning blockchain vocabulary.
3. **Buyer households**: renters and neighbors without panels, often on a phone and potentially inside MiniPay. They want cheaper, local, clean power and a receipt they can trust.
4. **Microgrid / community energy coordinators** (secondary). They care about balance between generation and demand across the neighborhood and about certificate integrity.

Context: short sessions, glanceable numbers, low tolerance for jargon. Many buyers are phone-first on modest connections.

## Brand identity

- **Name:** Sunpool (working name).
- **Personality:** warm, precise, quietly confident, civic.
- **Tone of voice:** plain and specific. Numbers carry units. No hype words ("revolutionary", "to the moon"), no exclamation marks in system copy. Errors are calm and say how to recover. Sentence case throughout.
- **Direction: Deep forest** (replaced Lagos daylight and Warm Editorial on 2026-10-03, see `DESIGN.md`). Dark, minimal and app-like: one big number, Buy or Sell, a few neighbours, one button. Detail lives on secondary pages.
- **Concept: prepaid power from your neighbour's roof.** Lagos users already load prepaid units on their DisCo meter. Those units are locked to the meter and Sunpool never touches them. Sunpool sells solar surplus delivered on a shared line (compound, estate, mini-grid) through a small smart meter that counts the loaded kWh down. The meter is simulated in the demo.

### Palette

| Role | Value | Use |
| --- | --- | --- |
| Forest (background) | `#0c1f18` | Page background |
| Card | `#13291f` | Panels |
| Mist (text) | `#eef5ef` | Text, 15.5:1 on forest |
| Muted | `#9db3a6` | Secondary text, 7.7:1 on forest |
| Lime (the only accent) | `#c8f25a` | Primary action, solar energy (filled area), key words; forest text on lime 13.3:1 |

### Typography

- **Display:** Bricolage Grotesque, extra bold, for big short headlines.
- **Body / UI:** Geist.
- **Data:** JetBrains Mono for kWh, prices, addresses, reading IDs and tx hashes, with tabular numbers.

### Surfaces

Large radius (16 to 24px) cards on a dark ground, 10% hairlines, no shadows except floating layers. No glows, no gradients, no glassmorphism.

### Banned

Indigo-to-purple gradients, glassmorphism, evenly sized card grids with no hierarchy, stock hero sections, Lorem Ipsum, "Feature 1", invented testimonials, partners or user numbers.

## Screens / sections

1. **Market (home).** Headline, three small totals, and the app panel: Buy power (solar for sale now, today's sun curve, neighbours to pick from, one Load button) or Sell surplus (your spare kWh, amount and price with the AI fair price, List for sale). Below: How it works in three cards.
2. **Activity.** Totals, the full generation chart with forecast band, and the live trade tape.
3. **Proof.** The double-claim test against the live contract.
4. **About.** Costs (generator vs grid), the prepaid-meter explanation, who it is for, what is real vs simulated, track alignment.
5. Later: My Home and Certificate Ledger.

Global footer on every screen: meter data is simulated; payments and certificates are real on testnet; CO₂ is an estimate.

## Core interactions

Rule: zero dead ends. Every control gives immediate feedback through a skeleton, an optimistic badge or a Sonner toast.

| Interaction | What happens |
| --- | --- |
| Page load | Skeletons shaped like the counters, chart and tape rows. Content staggers in once. |
| New trade arrives (seeded tick) | Row slides into the top of the tape, the counters count up, and a short lime wash fades on the new row. A polite live region announces it. |
| Pause / resume tape | Toggle stops the seeded stream. The icon and label change, so motion is not the only cue. |
| Buy a listing | Row gets an optimistic "Pending" badge, then "Settled" with a toast showing kWh, price and a (simulated) reading ID. On failure, the badge reverts and an error toast names the fix. |
| List surplus | Dialog (bottom drawer on phone) with kWh and price fields, prefilled with the AI suggestion. Submit shows pending, then the listing appears in the open listings. Validation errors sit next to the field. |
| Chart hover / focus | Tooltip shows hour, actual kWh, forecast kWh and band. Keyboard users can step through hours. |
| Scenario switch (demo only) | Toggle between Live, Empty (pre-dawn, no trades yet) and Error (feed unavailable) so every state can be shown in the video. |
| Empty tape | "No trades yet today" with when generation starts and a List surplus action. |
| Error | Alert with plain cause and a Retry button. The rest of the page stays usable. |

## Motion

Fast springs, no bounce. Purposeful only.

- **Entrances:** one staggered page entrance (~100ms steps) on first load. No stagger on repeated interactions.
- **Trade tape:** new rows slide in from the top with a spring; old rows exit with a small translateY and fade.
- **Counters:** numbers count up to their new value on change.
- **Chart:** the "now" marker and forecast band fade in once; no looping animation.
- **Press feedback:** buttons scale to 0.96 on press.
- **Reduced motion:** `prefers-reduced-motion` swaps slides and count-ups for instant updates or opacity fades. Every animated state change also changes a label, icon or color.

## Constraints

- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, shadcn/ui on Radix UI, Lucide icons only, Framer Motion, Sonner, Nuqs (URL state for scenario and selected house), Recharts. wagmi + viem for Celo later.
- **Setting:** the seeded neighborhood is in Lagos, Nigeria (about 6.5° N). Day curves use Lagos sunrise/sunset and irradiance, the CO₂ estimate uses a sourced Nigerian grid emission factor shown in the UI, and prices are quoted in cUSD.
- **Data:** seeded, realistic data in `src/lib/seed.ts`: named houses with IDs, panel sizes in kW, daily curves, prices in cUSD. The seeded path stays available behind an env flag after real chain calls land.
- **Honesty:** simulated data labeled in the UI and README; CO₂ shown as an estimate with its emission factor; forecasts shown with a confidence band.
- **Responsive:** mobile-first. The buyer flow must work at 360px width (MiniPay). No horizontal scroll at 320px.
- **Accessibility:** WCAG AA contrast, visible `:focus-visible` rings, semantic landmarks and headings, full keyboard support, labeled controls, polite live region for the tape.
- **Performance:** no heavy ML dependency; the forecast is a transparent model (solar curve × weather factor + exponential smoothing). The page must render meaningfully without JavaScript-heavy chain calls.
- **Timeline:** hackathon window Oct 5 – Oct 25, 2026. Submit with buffer.
