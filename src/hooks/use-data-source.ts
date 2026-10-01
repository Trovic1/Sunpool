"use client"

import { parseAsStringLiteral, useQueryState } from "nuqs"

import { DATA_SOURCE } from "@/lib/chain/contracts"

/**
 * Which data the Market reads: live Celo Sepolia ("chain", the default) or the
 * offline seeded demo ("seeded"). `?source=seeded` forces the fallback for a
 * recording or when the testnet is down.
 */
export function useDataSource() {
  const [source] = useQueryState("source", parseAsStringLiteral(["chain", "seeded"] as const).withDefault(DATA_SOURCE))
  return source
}
