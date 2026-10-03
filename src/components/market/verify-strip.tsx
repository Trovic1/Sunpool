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
    title: "Certificate minted, payment settles",
    body: "The buyer pays the seller in a dollar stablecoin and receives a renewable energy certificate for exactly those kWh.",
  },
] as const

export function VerifyStrip() {
  return (
    <section aria-labelledby="verify-heading" className="grid gap-8 lg:grid-cols-12">
      <div className="flex flex-col gap-3 lg:col-span-4">
        <h2 id="verify-heading" className="font-display text-3xl font-bold text-balance sm:text-4xl">
          How a trade is verified
        </h2>
        <p className="text-pretty text-muted-foreground">
          The reading and the payment run on Celo Sepolia. The meter is simulated until certified hardware
          signs readings.
        </p>
        <Link
          href="/double-claim"
          className="w-fit font-medium underline decoration-sun decoration-2 underline-offset-4 hover:decoration-foreground"
        >
          Try claiming the same reading twice
        </Link>
      </div>
      <ol className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card lg:col-span-8">
        {STEPS.map((step) => (
          <li key={step.title} className="flex gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sun text-sun-foreground">
              <step.icon aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-pretty text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
