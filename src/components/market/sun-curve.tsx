"use client"

import type { GenerationPoint } from "@/lib/forecast"

const W = 320
const H = 72

/**
 * Today's neighbourhood output as one shape: metered so far is a lime area, the rest of the
 * day is a dashed forecast line. No axes; the full chart lives on the Activity page.
 */
export function SunCurve({ points, label }: { points: GenerationPoint[]; label: string }) {
  if (points.length < 2) return null
  const first = points[0].minute
  const last = points[points.length - 1].minute
  const peak = Math.max(1, ...points.map((p) => Math.max(p.forecast, p.actual ?? 0, p.band?.[1] ?? 0)))
  const x = (minute: number) => ((minute - first) / (last - first)) * W
  const y = (kw: number) => H - 4 - (kw / peak) * (H - 8)

  const metered = points.filter((p) => p.actual !== undefined)
  const future = points.filter((p) => p.actual === undefined)
  const line = (ps: GenerationPoint[], key: "actual" | "forecast") =>
    ps.map((p, i) => `${i ? "L" : "M"}${x(p.minute).toFixed(1)} ${y(p[key] ?? 0).toFixed(1)}`).join(" ")

  const area =
    metered.length > 1
      ? `${line(metered, "actual")} L${x(metered[metered.length - 1].minute).toFixed(1)} ${H} L${x(metered[0].minute).toFixed(1)} ${H} Z`
      : ""
  // Join the forecast to the last metered point so the curve reads as one day.
  const forecastPoints = metered.length ? [{ ...metered[metered.length - 1], forecast: metered[metered.length - 1].actual ?? 0 }, ...future] : future
  const now = metered[metered.length - 1]

  return (
    <div role="img" aria-label={label} className="relative h-16 w-full">
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
      <line x1="0" x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--border)" />
      {area && <path d={area} fill="var(--sun)" />}
      {forecastPoints.length > 1 && (
        <path
          d={line(forecastPoints, "forecast")}
          fill="none"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
    {now && (
      <span
        aria-hidden
        className="absolute size-2.5 -translate-1/2 rounded-full bg-foreground ring-4 ring-card"
        style={{ left: `${(x(now.minute) / W) * 100}%`, top: `${(y(now.actual ?? 0) / H) * 100}%` }}
      />
    )}
    </div>
  )
}
