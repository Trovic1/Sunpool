import { SectionShell, SectionTitle } from "@/components/site/section-shell"

import { DoubleClaimPanel } from "./double-claim-panel"

/** The double-claim proof: its own route at /double-claim, and the Proof section of the home page. */
export function ProofSection({ embedded = false }: { embedded?: boolean }) {
  return (
    <SectionShell id="proof" embedded={embedded} className="gap-10">
      <div className="reveal flex max-w-3xl flex-col gap-4">
        <SectionTitle id="proof" embedded={embedded} className="text-5xl sm:text-7xl">
          One reading, <span className="text-accent-text">one sale.</span>
        </SectionTitle>
        <p className="max-w-xl text-lg text-pretty text-muted-foreground">
          Every kWh comes from a meter reading with its own ID. Try selling the same reading twice: the live contract
          refuses.
        </p>
      </div>
      <div className="reveal">
        <DoubleClaimPanel />
      </div>
    </SectionShell>
  )
}
