"use client"

import { useQuery } from "@tanstack/react-query"

import type { MatchPlan } from "@/lib/match"

import { useDataSource } from "./use-data-source"

export type MatchResponse = MatchPlan & { source: "seeded" | "chain"; currency: string }

/**
 * Best-match fill plan from GET /api/match for `kwh`, limited to the listing ids the
 * Market is showing. Disabled until `kwh` is a positive number and there are offers.
 */
export function useMatch(kwh: number | null, listingIds: string[]) {
  const source = useDataSource()
  const only = [...listingIds].sort().join(",")
  const enabled = kwh !== null && Number.isFinite(kwh) && kwh > 0 && listingIds.length > 0

  return useQuery({
    queryKey: ["match", source, kwh, only],
    enabled,
    staleTime: 5_000,
    retry: 1,
    queryFn: async ({ signal }): Promise<MatchResponse> => {
      const qs = new URLSearchParams({ kwh: String(kwh), source, only })
      const res = await fetch(`/api/match?${qs}`, { signal })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? "Unable to rank offers.")
      return body
    },
  })
}
