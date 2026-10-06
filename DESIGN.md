# DESIGN.md: Sunpool, Deep forest

The design system as built (2026-10-03). Tokens live in [`src/app/globals.css`](src/app/globals.css). Change them there, not inline. History: Warm Editorial → Lagos daylight → Deep forest, chosen by the project owner because the earlier looks read like an article.

## Principles

1. **One number, one action.** Each view leads with a single big figure and a single lime button. Everything else is secondary.
2. **No reading required.** Home has no paragraphs. Sentences are short. Detail lives on Activity, Proof and About.
3. **Prepaid language.** People "load" kWh from a neighbour, the way Lagos users load prepaid units.
4. **Lime means solar or action.** It is used for the primary button, solar energy drawn as a filled area, and one highlighted phrase per headline. Nothing else.

## Colour tokens (dark only)

| Token | Value | Use |
| --- | --- | --- |
| `--background` (forest-950) | `#0c1f18` | Page ground |
| `--card` (forest-900) | `#13291f` | Panels |
| `--muted` / `--secondary` (forest-850) | `#1a3529` | Quiet fills |
| `--accent` (forest-800) | `#1f4033` | Avatars, active nav pill |
| `--foreground` (mist) | `#eef5ef` | Text |
| `--muted-foreground` | `#9db3a6` | Secondary text |
| `--primary` / `--sun` (lime) | `#c8f25a` | Primary button, metered solar area, highlight |
| `--primary-foreground` | `#0c1f18` | Text on lime |
| `--border` | mist at 10% | Hairlines |
| `--input` | mist at 22% | Control borders |
| `--destructive` | `#ff8a7a` | Errors |

Contrast (WCAG): mist on forest 15.5:1; muted on forest 7.7:1, on card 6.9:1; lime on forest 13.3:1; forest on lime 13.3:1; error on card 6.7:1.

## Type

| Role | Family | Notes |
| --- | --- | --- |
| Headlines (`font-display`) | Bricolage Grotesque | Extra bold, leading 0.95. h1 2.75rem on phones, 6xl at sm, 7xl at lg |
| UI and body (`font-sans`) | Geist | Sentence case |
| Data (`font-mono`, `tabular`) | JetBrains Mono | kWh, prices, addresses, hashes, clock |

## Shape

- `--radius` 1rem. Cards `rounded-3xl`, offers and inputs `rounded-2xl`, buttons `rounded-xl`, pills for tabs, nav and badges.
- Flat. A 10% hairline is the elevation. `--shadow-float` only on popover, dialog and tooltip.

## Components

- **Trade panel** (`market/trade-panel.tsx`): a segmented Buy power / Sell surplus switch with a spring pill, backed by `?tab=sell`.
  - **Buy:** "Solar for sale near you now" big kWh, cheapest price, sun curve, offer rows (tap to select, lime ring and check), then one full-width "Load X kWh for Y USDC" button.
  - **Sell:** "Ready to sell now" big kWh (the AI verification's headroom: what the roof has made so far today, minus home use and earlier listings), the sunset forecast as the supporting line, then the amount, rooftop size and price form, the AI verification panel, the fair price hint, "List for sale", and your listings. The amount defaults inside what the meter will sign now.
- **Sun curve** (`market/sun-curve.tsx`): today's output. Metered is a lime area and the forecast is a dashed muted line, with a dot for now. No axes.
- **How it works** (`market/how-it-works.tsx`): three cards: Load units, Their roof powers your line, Counted once and paid instantly.
- **Activity page:** totals, the full generation chart with confidence band, and the trade tape with a lime flash on new rows.
- **Certificates page:** totals card (kWh certified, count, estimated CO₂ with its factor), then the ledger: a table on desktop, stacked rows on phones. Each reading carries a green "Consumed" badge and a "Verify reading" popover that re-reads the registry from the browser. All / Mine pill switch, backed by `?view=mine`.
- **One-page home:** `/` stacks Market, Activity, Certificates, Proof and About as sections (`SectionShell` in `site/section-shell.tsx`; the hero keeps the page h1, the rest use h2). On the home page the Activity and Certificates totals are hidden because the hero already shows them. `/activity`, `/certificates`, `/double-claim` and `/about` still render each section on its own for deep links.
- **Masthead:** sticky; logo in a lime disc, then Market, Activity, Certificates, Proof and About as pills, a Testnet badge and the wallet button. Links go to `/#section`; a scroll-spy (`use-active-section.ts`) slides the active pill as you scroll. A hairline appears once the page scrolls. On phones the pills sit in a second row, spaced to fit 360px without scrolling.
- **Trade tape:** when there are fewer trades than fill the card, it ends with "That's every trade so far" and a List surplus link instead of empty space.

## Motion

Scroll reveal (`.reveal`): blocks zoom in from 94% and rise as they enter, and ease back to 96% at 35% opacity as they leave the top. It runs on the browser's scroll timeline (`animation-timeline: view()`), capped in pixels so tall blocks stay readable, and is skipped where unsupported and under reduced motion. Market home also enters with one staggered fade-and-rise (`.enter` in `globals.css`, 700 ms expo ease-out, 80 ms steps set by `--enter-i`): location, headline, subline and the trade panel, stats, then How it works. Pure CSS, so content is never stuck hidden. Then: spring tab pill, offer rows that slide in, numbers that count up, and a tape row that slides in with a lime wash. All of it is reduced under `prefers-reduced-motion`.

## Honesty in the UI

The footer on every page says meter data is simulated, that payments and certificates are real on testnet, and that CO₂ is an estimate at 0.456 kg/kWh with a source. The Sell tab labels the spare kWh as coming from a simulated meter. About lists what is real, simulated and estimated.
