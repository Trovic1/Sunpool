export { minuteLabel } from "./forecast"

export const formatKwh = (kwh: number, digits = 1) =>
  `${kwh.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`

/** cUSD amounts. Prices per kWh use 3 decimals, totals use 2. */
export const formatCusd = (amount: number, digits = 2) =>
  amount.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })

export const formatPrice = (price: number) => formatCusd(price, 3)
