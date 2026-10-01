import { KNOWN_PARTIES } from "./chain/contracts"
export { minuteLabel } from "./forecast"

export const formatKwh = (kwh: number, digits = 1) =>
  `${kwh.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

/** Stablecoin (USDm) amounts. Prices per kWh use 3 decimals, totals use 2. */
export const formatCusd = (amount: number, digits = 2) =>
  amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const formatPrice = (price: number) => formatCusd(price, 3)

/** Celo's dollar stablecoin. Renamed from cUSD to USDm (Mento Dollar); same contract on mainnet. */
export const CURRENCY = "USDm"

export const shortAddress = (address: string) =>
  address.startsWith("0x") && address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address

/** Display name for a trade party: seeded household name, "You" for the connected wallet, or a short address. */
export function partyName(id: string, names: Record<string, string | undefined>, account?: string) {
  if (account && id.toLowerCase() === account.toLowerCase()) return "You"
  return names[id] ?? KNOWN_PARTIES[id.toLowerCase()] ?? shortAddress(id)
}
