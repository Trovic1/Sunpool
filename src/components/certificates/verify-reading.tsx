"use client"

import { ArrowUpRight, CircleAlert, ShieldCheck } from "lucide-react"
import { useCallback, useState } from "react"
import type { Hex } from "viem"
import { useConfig } from "wagmi"
import { readContract } from "wagmi/actions"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { SUNPOOL_CONTRACTS, explorerAddress, readingRegistryAbi } from "@/lib/chain/contracts"

import { formatWat, shortHex } from "./format"

type Check =
  | { state: "idle" | "checking" }
  | { state: "consumed"; consumedAt: number }
  | { state: "unused" }
  | { state: "error" }

/**
 * Re-reads ReadingRegistry from the browser (not via our server), so anyone can see the
 * reading behind a certificate is consumed and a second claim would revert.
 */
export function VerifyReading({ certificateId, readingId, className }: { certificateId: string; readingId: Hex; className?: string }) {
  const config = useConfig()
  const [check, setCheck] = useState<Check>({ state: "idle" })

  const run = useCallback(async () => {
    setCheck({ state: "checking" })
    try {
      const [isConsumed, consumedAt] = await Promise.all([
        readContract(config, {
          address: SUNPOOL_CONTRACTS.readingRegistry,
          abi: readingRegistryAbi,
          functionName: "isConsumed",
          args: [readingId],
        }),
        readContract(config, {
          address: SUNPOOL_CONTRACTS.readingRegistry,
          abi: readingRegistryAbi,
          functionName: "consumedAt",
          args: [readingId],
        }),
      ])
      setCheck(isConsumed ? { state: "consumed", consumedAt: Number(consumedAt) } : { state: "unused" })
    } catch {
      setCheck({ state: "error" })
    }
  }, [config, readingId])

  return (
    <Popover onOpenChange={(open) => open && void run()}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <ShieldCheck data-icon="inline-start" />
          Verify reading
          <span className="sr-only"> for certificate {certificateId}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] rounded-2xl">
        <PopoverHeader>
          <PopoverTitle className="font-display text-base font-bold">Reading {shortHex(readingId)}</PopoverTitle>
          <PopoverDescription>Checked live against the ReadingRegistry contract on Celo Sepolia.</PopoverDescription>
        </PopoverHeader>

        <div role="status" aria-live="polite" className="rounded-xl bg-background p-3">
          {check.state === "checking" || check.state === "idle" ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Spinner />
              Reading the contract…
            </p>
          ) : check.state === "consumed" ? (
            <div className="flex flex-col gap-1.5">
              <p className="flex items-center gap-2 font-medium text-success">
                <ShieldCheck aria-hidden className="size-4" />
                Consumed, can&rsquo;t be counted twice
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs tabular">
                <dt className="text-muted-foreground">isConsumed</dt>
                <dd>true</dd>
                <dt className="text-muted-foreground">consumedAt</dt>
                <dd>
                  {check.consumedAt} <span className="text-muted-foreground">({formatWat(check.consumedAt)})</span>
                </dd>
              </dl>
              <p className="text-xs text-muted-foreground">
                Listing it again reverts with <span className="font-mono">ReadingAlreadyConsumed</span>.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <CircleAlert aria-hidden className="size-4" />
                {check.state === "unused" ? "Not consumed in the registry" : "Couldn't reach Celo Sepolia"}
              </p>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => void run()}>
                Check again
              </Button>
            </div>
          )}
        </div>

        <a
          href={`${explorerAddress(SUNPOOL_CONTRACTS.readingRegistry)}?tab=read_contract`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-0.5 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          Check it yourself on Blockscout
          <ArrowUpRight aria-hidden className="size-3" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </PopoverContent>
    </Popover>
  )
}
