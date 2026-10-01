import { FileSignature, Fingerprint, ReceiptText } from "lucide-react"
import Link from "next/link"

const STEPS = [
  {
    icon: FileSignature,
    title: "The meter signs a reading",
    body: "Each batch of exported kWh carries a reading ID, meter ID and timestamp, signed by a registered meter key.",
  },
  {
    icon: Fingerprint,
    title: "The reading ID is used once",
    body: "The registry records the ID when it is claimed. A second claim for the same reading is rejected.",
  },
  {
    icon: ReceiptText,
    title: "Certificate minted, USDm settles",
    body: "The buyer pays the seller in USDm and receives a renewable energy certificate for exactly those kWh.",
  },
] as const

export function VerifyStrip() {
  return (
    <section aria-labelledby="verify-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="tag">Why the numbers add up</p>
        <h2 id="verify-heading" className="font-display text-3xl font-medium tracking-tight">
          How a trade is verified
        </h2>
      </div>
      <ol className="grid gap-px overflow-hidden rounded-lg border border-foreground bg-foreground md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2 bg-background p-5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground tabular">0{i + 1}</span>
              <step.icon aria-hidden className="size-4 text-accent-text" />
            </div>
            <h3 className="font-medium">{step.title}</h3>
            <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
      <p className="text-sm text-pretty text-muted-foreground">
        Steps two and three run on Celo Sepolia. The meter in step one is simulated until certified
        hardware signs readings.{" "}
        <Link href="/double-claim" className="text-accent-text underline underline-offset-2">
          Try claiming the same reading twice
        </Link>
        .
      </p>
    </section>
  )
}
