"use client"

import { useReducedMotion } from "framer-motion"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BAND_BASE,
  BAND_PER_HOUR,
  CHART_END_MINUTE,
  CHART_START_MINUTE,
  SMOOTHING_ALPHA,
  minuteLabel,
  type GenerationPoint,
} from "@/lib/forecast"
import { formatKwh } from "@/lib/format"
import { NEIGHBORHOOD, TOTAL_PANEL_KW } from "@/lib/seed"
import type { Market } from "@/hooks/use-market"

const TICKS = [6, 9, 12, 15, 18].map((h) => h * 60)

export function GenerationChart({ market }: { market: Market }) {
  const { generation, minute, status } = market
  const reduced = useReducedMotion()
  const loading = status === "loading"
  const preDawn = minute <= NEIGHBORHOOD.sunriseMinutes

  const remainingLow = generation.remainingKwh * (1 - BAND_BASE - BAND_PER_HOUR * 3)
  const remainingHigh = generation.remainingKwh * (1 + BAND_BASE + BAND_PER_HOUR * 3)

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="font-display text-xl font-medium">Today&rsquo;s generation</CardTitle>
        <CardDescription>
          All {Math.round(TOTAL_PANEL_KW)} kW of rooftops in {NEIGHBORHOOD.name}, in kW. Simulated
          meter readings against the forecast.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 rounded-full bg-chart-actual" />
            Metered (simulated)
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="w-4 border-t-2 border-dashed border-chart-forecast" />
            Forecast
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-4 rounded-xs bg-chart-band" />
            Confidence band
          </li>
        </ul>

        {loading ? (
          <Skeleton className="h-56 w-full sm:h-64" />
        ) : (
          <figure className="h-56 w-full sm:h-64">
            <figcaption className="sr-only">
              {preDawn
                ? `Forecast only. Generation expected from ${minuteLabel(NEIGHBORHOOD.sunriseMinutes)}.`
                : `Metered ${formatKwh(generation.generatedKwh)} kWh so far. Forecast ${formatKwh(generation.remainingKwh)} kWh more today. Use arrow keys on the chart to step through times, or open the data table below.`}
            </figcaption>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={generation.points}
                margin={{ top: 16, right: 8, bottom: 0, left: -12 }}
                accessibilityLayer
              >
                <CartesianGrid vertical={false} stroke="var(--rule)" />
                <XAxis
                  dataKey="minute"
                  type="number"
                  domain={[CHART_START_MINUTE, CHART_END_MINUTE]}
                  ticks={TICKS}
                  tickFormatter={minuteLabel}
                  tickLine={false}
                  axisLine={{ stroke: "var(--foreground)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickCount={5}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-jetbrains-mono)" }}
                />
                <Tooltip
                  content={ChartTooltip}
                  cursor={{ stroke: "var(--foreground)", strokeWidth: 1 }}
                  isAnimationActive={false}
                />
                <Area
                  dataKey="band"
                  stroke="none"
                  fill="var(--chart-band)"
                  isAnimationActive={!reduced}
                  animationDuration={500}
                  connectNulls={false}
                  activeDot={false}
                />
                <Line
                  dataKey="forecast"
                  stroke="var(--chart-forecast)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-forecast)", stroke: "var(--background)", strokeWidth: 2 }}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="actual"
                  stroke="var(--chart-actual)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-actual)", stroke: "var(--background)", strokeWidth: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
                {minute >= CHART_START_MINUTE && minute <= CHART_END_MINUTE && (
                <ReferenceLine
                  x={minute}
                  stroke="var(--foreground)"
                  strokeWidth={1}
                  label={{
                    value: `Now ${minuteLabel(minute)}`,
                    position: "top",
                    fill: "var(--foreground)",
                    fontSize: 11,
                    fontFamily: "var(--font-jetbrains-mono)",
                  }}
                />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </figure>
        )}

        {loading ? (
          <Skeleton className="h-5 w-3/4" />
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:flex sm:flex-wrap sm:gap-x-6">
            <div className="flex flex-col">
              <dt className="tag">Metered so far</dt>
              <dd className="font-mono tabular">{formatKwh(generation.generatedKwh)} kWh</dd>
            </div>
            <div className="flex flex-col">
              <dt className="tag">Expected rest of day</dt>
              <dd className="font-mono tabular">
                {formatKwh(remainingLow, 0)}&ndash;{formatKwh(remainingHigh, 0)} kWh
              </dd>
            </div>
            <div className="col-span-2 flex flex-col sm:col-span-1">
              <dt className="tag">Model</dt>
              <dd className="text-muted-foreground">
                Clear-sky curve × weather, smoothed (α&nbsp;{SMOOTHING_ALPHA}). Correction{" "}
                <span className="font-mono tabular text-foreground">×{generation.correction.toFixed(2)}</span>
              </dd>
            </div>
          </dl>
        )}

        {!loading && (
          <details className="group text-sm">
            <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground">
              Show hourly data table
            </summary>
            <DataTable points={generation.points} />
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as GenerationPoint
  return (
    <div className="flex min-w-40 flex-col gap-1 rounded-md border border-foreground bg-background px-3 py-2 text-xs shadow-offset">
      <p className="font-mono font-medium tabular">{point.label} WAT</p>
      {point.actual !== undefined && (
        <p className="flex justify-between gap-4">
          <span className="text-muted-foreground">Metered</span>
          <span className="font-mono tabular">{point.actual.toFixed(1)} kW</span>
        </p>
      )}
      <p className="flex justify-between gap-4">
        <span className="text-muted-foreground">Forecast</span>
        <span className="font-mono tabular">{point.forecast.toFixed(1)} kW</span>
      </p>
      {point.band && point.actual === undefined && (
        <p className="flex justify-between gap-4">
          <span className="text-muted-foreground">Band</span>
          <span className="font-mono tabular">
            {point.band[0].toFixed(1)}&ndash;{point.band[1].toFixed(1)} kW
          </span>
        </p>
      )}
    </div>
  )
}

function DataTable({ points }: { points: GenerationPoint[] }) {
  const hourly = points.filter((p) => p.minute % 60 === 0)
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded-md border border-rule">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Neighborhood generation by hour, kW</caption>
        <thead className="sticky top-0 bg-muted">
          <tr>
            <th scope="col" className="px-3 py-1.5 font-medium">Time</th>
            <th scope="col" className="px-3 py-1.5 text-end font-medium">Metered</th>
            <th scope="col" className="px-3 py-1.5 text-end font-medium">Forecast</th>
            <th scope="col" className="px-3 py-1.5 text-end font-medium">Band</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular">
          {hourly.map((p) => (
            <tr key={p.minute} className="border-t border-rule">
              <th scope="row" className="px-3 py-1 font-normal">{p.label}</th>
              <td className="px-3 py-1 text-end">{p.actual?.toFixed(1) ?? "—"}</td>
              <td className="px-3 py-1 text-end">{p.forecast.toFixed(1)}</td>
              <td className="px-3 py-1 text-end">
                {p.band && p.actual === undefined ? `${p.band[0].toFixed(1)}–${p.band[1].toFixed(1)}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
