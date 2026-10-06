const WAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Lagos",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

/** Unix seconds as "6 Oct, 14:32 WAT" (Lagos time). */
export const formatWat = (unixSeconds: number) => `${WAT.format(new Date(unixSeconds * 1000))} WAT`

export const isoTime = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString()

/** 0x1234ab…cd56 */
export const shortHex = (hex: string) => (hex.length > 14 ? `${hex.slice(0, 8)}…${hex.slice(-4)}` : hex)
