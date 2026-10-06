"use client"

import { useQuery } from "@tanstack/react-query"

import type { CertificateLedger } from "@/lib/chain/certificates"

const POLL_MS = 30_000

async function fetchLedger(): Promise<CertificateLedger> {
  const res = await fetch("/api/certificates", { cache: "no-store" })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? "Unable to load certificates.")
  return body
}

/** The certificate ledger from /api/certificates, refreshed every 30 seconds. */
export function useCertificates() {
  return useQuery({ queryKey: ["certificates"], queryFn: fetchLedger, refetchInterval: POLL_MS })
}
