# DESIGN.md: Sunpool, Lagos daylight

The design system as built. The reasoning is in [`docs/DESIGN_DIRECTION.md`](docs/DESIGN_DIRECTION.md). Tokens live in [`src/app/globals.css`](src/app/globals.css). Change them there, not inline.

## Rule of one colour

Sun yellow marks only solar energy and money changing hands. It is always a **filled area** with ink on top, never text or a thin line on the light ground.

## Colour tokens

| Token | Value | Use |
| --- | --- | --- |
| `--background` (paper) | `#f7f7f4` | Page ground |
| `--card` (paper-raised) | `#ffffff` | Panels, inputs, outline buttons |
| `--muted` (paper-sunk) | `#ecece7` | Quiet fills, honesty box |
| `--foreground` (ink) | `#111214` | Text, ink button, chart line, active nav pill |
| `--muted-foreground` | `#5a5e66` | Metadata, axis labels |
| `--sun` / `--primary` | `#f2b705` | Hero band, primary button, metered chart area, live badge, selection |
| `--sun-muted` | `#3d3200` | Secondary text on the yellow band |
| `--border` | ink at 13% | Panel and row hairlines |
| `--input` | ink at 28% | Control borders |

Contrast (WCAG): ink on sun 10.3:1, ink on paper 17.5:1, muted on paper 6.1:1, sun-muted on sun 7.0:1. Sun on paper is 1.69:1, which is why yellow is never text.

## Type

| Role | Family | Notes |
| --- | --- | --- |
| Headings (`font-display`) | Bricolage Grotesque | Bold, tracking -0.025em, `text-balance`. h1 4xl, then 5xl at sm, then 6xl at xl |
| UI and body (`font-sans`) | Geist | Sentence case everywhere |
| Data (`font-mono`, `tabular`) | JetBrains Mono | kWh, prices, addresses, reading IDs, hashes, clock |

There are no eyebrow labels and no 01/02/03 numbering. The `tag` utility is a plain 13px label. UI copy uses commas or hyphens, not em-dashes.

## Shape and depth

- Radius: `--radius` 0.75rem (12px) for panels; controls use `rounded-md` (about 10px). Full pills only for status badges and nav.
- Flat surfaces: a 1px `border-border` hairline is the elevation. There are no offset shadows and no glows.
- `--shadow-float` is reserved for floating layers: popover, dialog and chart tooltip.

## Components

- **Button:** `default` is a sun fill with ink text (Buy, Claim). `ink` is an ink fill (List surplus on the yellow band). `outline` is a card background with an input border. `ghost` is for secondary links. Sizes: sm h-8, default h-10, lg h-11.
- **Badge:** pill. `accent` is a sun fill (Live). `outline` is for network status in the header.
- **Masthead:** 64px tall. Logo is a yellow disc with the Sun icon. The active nav item is an ink pill. On mobile, nav moves to a second row.
- **Sun band (Market hero):** full-bleed `bg-sun`. Headline in 7 of 12 columns, totals in 5. The kWh total is set in large mono, with Certificates and CO₂ below it in two columns.
- **Generation chart:** the metered part is a `--sun` Area under an ink stroke (the signature move). Forecast is a dashed muted line with an ink-8% confidence band and a "Now" marker.
- **Trade tape:** a new row flashes a yellow wash (`rgba(242,183,5,0.32)` fading to 0) and slides in. Pause control included.
- **Verify strip:** heading and link on the left. On the right, an ordered list with a yellow icon square for each step.

## Motion

Fast springs, a one-time entrance stagger, numbers that count up, and a tape row that slides in. All of it is disabled under `prefers-reduced-motion`.

## Icons

Lucide only, at 16 to 18px, `aria-hidden` when decorative.

## Honesty in the UI

The footer says "Meter data is simulated". CO₂ is always labelled "estimated", with the 0.456 kg/kWh factor linked to its source. The forecast always shows its band.
