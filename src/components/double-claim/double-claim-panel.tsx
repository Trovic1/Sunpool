"use client"

import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowUpRight, CircleCheck, OctagonX, Play, RotateCcw, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { BaseError, ContractFunctionRevertedError, parseUnits, type Address, type Hex } from "viem"
import { useConfig, usePublicClient } from "wagmi"
import { waitForTransactionReceipt, writeContract } from "wagmi/actions"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { useWallet } from "@/hooks/use-wallet"
import { CELO_SEPOLIA, SETTLEMENT_TOKEN } from "@/lib/chain/celo"
import {
  SUNPOOL_CONTRACTS,
  explorerAddress,
  explorerTx,
  marketAbiWithErrors,
  type SignedReading,
} from "@/lib/chain/contracts"
import { explainError } from "@/lib/chain/errors"
import fixture from "@/lib/chain/double-claim-fixture.json"

type Step = { id: string; label: string; state: "running" | "ok" | "rejected" | "error"; detail?: React.ReactNode }

const FIXTURE: SignedReading & { firstClaimTx: Hex } = {
  reading: {
    readingId: fixture.reading.readingId as Hex,
    meterId: fixture.reading.meterId as Hex,
    seller: fixture.reading.seller as Address,
    timestamp: BigInt(fixture.reading.timestamp),
    wh: BigInt(fixture.reading.wh),
  },
  signature: fixture.signature as Hex,
  firstClaimTx: fixture.firstClaimTx as Hex,
}

type Rejection = { name: string; args: readonly unknown[] }

function decodeRejection(error: unknown): Rejection | undefined {
  if (!(error instanceof BaseError)) return undefined
  const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError)
  if (reverted instanceof ContractFunctionRevertedError && reverted.data?.errorName) {
    return { name: reverted.data.errorName, args: reverted.data.args ?? [] }
  }
  return undefined
}

const shortHex = (hex: string) => `${hex.slice(0, 10)}…${hex.slice(-8)}`
const fmtTime = (unix: bigint | number) =>
  new Date(Number(unix) * 1000).toLocaleString("en-GB", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) +
  " WAT"

export function DoubleClaimPanel() {
  const publicClient = usePublicClient({ chainId: CELO_SEPOLIA.id })
  const config = useConfig()
  const wallet = useWallet()
  const reduced = useReducedMotion()
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)

  const push = (step: Step) => setSteps((s) => [...s.filter((x) => x.id !== step.id), step])

  /** Replays a reading against the live contract with eth_call. No wallet, no gas. */
  async function attemptClaim(id: string, signed: SignedReading, price: bigint) {
    push({ id, label: "Submitting the same signed reading to EnergyMarket.list…", state: "running" })
    try {
      await publicClient!.simulateContract({
        address: SUNPOOL_CONTRACTS.energyMarket,
        abi: marketAbiWithErrors,
        functionName: "list",
        args: [signed.reading, signed.signature, price],
        account: signed.reading.seller,
      })
      push({ id, label: "The contract accepted the claim", state: "error", detail: "This should not happen. The reading was not consumed." })
      return false
    } catch (error) {
      const rejection = decodeRejection(error)
      if (rejection?.name === "ReadingAlreadyConsumed") {
        const consumedAt = rejection.args[1] as bigint
        push({
          id,
          label: "Rejected by ReadingRegistry",
          state: "rejected",
          detail: (
            <span className="flex flex-col gap-1">
              <code className="font-mono text-sm break-all text-foreground">
                ReadingAlreadyConsumed({shortHex(rejection.args[0] as string)}, {consumedAt.toString()})
              </code>
              <span>First claimed {fmtTime(consumedAt)}. Nothing was listed, paid or minted.</span>
            </span>
          ),
        })
        return true
      }
      const e = explainError(error)
      push({ id, label: e.title, state: "error", detail: e.description })
      return false
    }
  }

  async function replayFixture() {
    setRunning(true)
    setSteps([
      {
        id: "first",
        label: "First claim already settled on Celo Sepolia",
        state: "ok",
        detail: (
          <a className="inline-flex items-center gap-1 underline underline-offset-2" href={explorerTx(FIXTURE.firstClaimTx)} target="_blank" rel="noreferrer">
            View the first claim on Blockscout <ArrowUpRight aria-hidden className="size-3" />
          </a>
        ),
      },
    ])
    const rejected = await attemptClaim("second", FIXTURE, parseUnits("0.125", SETTLEMENT_TOKEN.decimals))
    toast[rejected ? "success" : "error"](rejected ? "Second claim rejected on-chain" : "Unexpected result", {
      description: rejected ? "ReadingAlreadyConsumed: the same kWh cannot be certified twice." : "See the log below.",
    })
    setRunning(false)
  }

  async function runWithWallet() {
    const account = await wallet.ensureReady()
    if (!account) return
    setRunning(true)
    setSteps([])
    try {
      push({ id: "reading", label: "Requesting a fresh signed reading from the meter…", state: "running" })
      const res = await fetch("/api/readings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ seller: account, wh: 500 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error)
      const signed: SignedReading = {
        reading: { ...body.reading, timestamp: BigInt(body.reading.timestamp), wh: BigInt(body.reading.wh) },
        signature: body.signature,
      }
      push({
        id: "reading",
        label: "Meter signed reading for 0.5 kWh",
        state: "ok",
        detail: <code className="font-mono text-sm">{shortHex(signed.reading.readingId)}</code>,
      })

      const price = parseUnits("0.125", SETTLEMENT_TOKEN.decimals)
      push({ id: "first", label: "First claim: confirm the listing in your wallet…", state: "running" })
      const hash = await writeContract(config, {
        address: SUNPOOL_CONTRACTS.energyMarket,
        abi: marketAbiWithErrors,
        functionName: "list",
        args: [signed.reading, signed.signature, price],
      })
      push({ id: "first", label: "First claim: settling on Celo Sepolia…", state: "running" })
      const receipt = await waitForTransactionReceipt(config, { hash })
      if (receipt.status !== "success") throw new Error("The first claim reverted.")
      push({
        id: "first",
        label: "First claim accepted. The reading is now consumed.",
        state: "ok",
        detail: (
          <a className="inline-flex items-center gap-1 underline underline-offset-2" href={explorerTx(hash)} target="_blank" rel="noreferrer">
            View on Blockscout <ArrowUpRight aria-hidden className="size-3" />
          </a>
        ),
      })
      await attemptClaim("second", signed, price)
    } catch (error) {
      const e = error instanceof Error && !("shortMessage" in error) ? { title: error.message, description: "" } : explainError(error)
      push({ id: "failure", label: e.title, state: "error", detail: e.description })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold">The reading under test</CardTitle>
          <CardDescription>Signed by the registered meter key and already claimed once on Celo Sepolia.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm">
            {[
              ["Reading ID", FIXTURE.reading.readingId],
              ["Meter ID", FIXTURE.reading.meterId],
              ["Seller", FIXTURE.reading.seller],
              ["Energy", `${Number(FIXTURE.reading.wh) / 1000} kWh`],
              ["Read at", fmtTime(FIXTURE.reading.timestamp)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="tag">{label}</dt>
                <dd className="font-mono break-all">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
        <CardFooter className="flex-wrap gap-2">
          <Button size="lg" onClick={() => void replayFixture()} disabled={running || !publicClient}>
            {running ? <Spinner data-icon="inline-start" /> : <Play data-icon="inline-start" />}
            Claim it again
          </Button>
          <Button size="lg" variant="outline" onClick={() => void runWithWallet()} disabled={running}>
            <Wallet data-icon="inline-start" />
            Run it with my wallet
          </Button>
        </CardFooter>
      </Card>

      <Card className="min-h-72">
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold">What the contract says</CardTitle>
          <CardDescription>
            &ldquo;Claim it again&rdquo; replays the reading with a read-only call, so it needs no wallet or gas.
            &ldquo;Run it with my wallet&rdquo; claims a fresh reading for real, then tries the same reading a
            second time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attempt yet. Press &ldquo;Claim it again&rdquo; to start.</p>
          ) : (
            <ol className="flex flex-col gap-3" aria-live="polite">
              <AnimatePresence initial={false}>
                {steps.map((step) => (
                  <motion.li
                    key={step.id}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                    className="flex gap-3 rounded-md border border-rule p-3"
                  >
                    <span className="pt-0.5">
                      {step.state === "running" && <Spinner />}
                      {step.state === "ok" && <CircleCheck aria-hidden className="size-4 text-success" />}
                      {(step.state === "rejected" || step.state === "error") && (
                        <OctagonX aria-hidden className="size-4 text-destructive" />
                      )}
                    </span>
                    <div className="flex min-w-0 flex-col gap-1 text-sm">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {step.label}
                        {step.state === "rejected" && <Badge variant="destructive">Double claim blocked</Badge>}
                      </p>
                      {step.detail && <div className="text-muted-foreground">{step.detail}</div>}
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}
        </CardContent>
        {steps.length > 0 && !running && (
          <CardFooter>
            <Button variant="ghost" size="sm" onClick={() => setSteps([])}>
              <RotateCcw data-icon="inline-start" />
              Clear
            </Button>
          </CardFooter>
        )}
      </Card>

      <p className="text-sm text-muted-foreground lg:col-span-2">
        Contracts:{" "}
        <a className="underline decoration-dotted underline-offset-2" href={explorerAddress(SUNPOOL_CONTRACTS.readingRegistry)} target="_blank" rel="noreferrer">
          ReadingRegistry
        </a>{" "}
        ·{" "}
        <a className="underline decoration-dotted underline-offset-2" href={explorerAddress(SUNPOOL_CONTRACTS.energyMarket)} target="_blank" rel="noreferrer">
          EnergyMarket
        </a>
        . Source verified on Blockscout. The custom error is defined in{" "}
        <code className="font-mono">ReadingRegistry.consume</code>.
      </p>
    </div>
  )
}
