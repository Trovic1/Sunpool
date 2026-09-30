"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SCENARIOS, type Market, type Scenario } from "@/hooks/use-market"

const LABELS: Record<Scenario, string> = {
  live: "Live",
  empty: "Empty",
  error: "Error",
}

/** Demo-only control so every state can be shown on camera. */
export function ScenarioSwitch({ market }: { market: Market }) {
  return (
    <div className="flex items-center gap-2">
      <span id="scenario-label" className="tag">
        Demo state
      </span>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={0}
        value={market.scenario}
        onValueChange={(value) => value && market.changeScenario(value as Scenario)}
        aria-labelledby="scenario-label"
      >
        {SCENARIOS.map((s) => (
          <ToggleGroupItem key={s} value={s} className="px-3">
            {LABELS[s]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
