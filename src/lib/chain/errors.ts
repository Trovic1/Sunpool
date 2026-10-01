import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem"

import { CELO_SEPOLIA } from "./celo"

export type ExplainedError = { title: string; description: string; cancelled?: boolean }

const CUSTOM_ERRORS: Record<string, ExplainedError> = {
  ReadingAlreadyConsumed: {
    title: "This reading was already claimed",
    description: "The registry accepts each meter reading once, so the same kWh cannot be sold or certified twice.",
  },
  ListingNotActive: {
    title: "This listing is no longer available",
    description: "Someone else bought it or the seller cancelled it. Pick another listing.",
  },
  PriceChanged: {
    title: "The price changed",
    description: "The listing now costs more than you approved. Refresh and try again.",
  },
  SelfPurchase: { title: "This is your own listing", description: "Buy from another household instead." },
  NotSeller: {
    title: "Only the seller can do this",
    description: "The reading names a different wallet as the seller.",
  },
  UnregisteredMeter: {
    title: "Unknown meter",
    description: "The reading was not signed by a registered meter key.",
  },
  InvalidSignature: { title: "Invalid meter signature", description: "The reading signature could not be verified." },
  ERC20InsufficientAllowance: {
    title: "Approval too low",
    description: "Approve the full amount in your wallet, then buy again.",
  },
  ERC20InsufficientBalance: {
    title: "Not enough USDm",
    description: "Swap some test CELO for USDm at app.mento.org, then try again.",
  },
  EnforcedPause: { title: "The market is paused", description: "Trading resumes when the operator unpauses it." },
}

/** Turns wallet and contract errors into calm, actionable copy. */
export function explainError(error: unknown): ExplainedError {
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) {
      return { title: "Cancelled in your wallet", description: "Nothing was sent.", cancelled: true }
    }
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError)
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName
      if (name && CUSTOM_ERRORS[name]) return CUSTOM_ERRORS[name]
      if (name) return { title: `Rejected by the contract: ${name}`, description: "Nothing was charged." }
    }
    const text = `${error.shortMessage} ${error.details ?? ""}`.toLowerCase()
    if (text.includes("insufficient funds")) {
      return {
        title: "Not enough CELO for gas",
        description: `Get free test CELO at ${CELO_SEPOLIA.faucetUrl.replace("https://", "")}, then try again.`,
      }
    }
    if (text.includes("rejected") || text.includes("denied")) {
      return { title: "Cancelled in your wallet", description: "Nothing was sent.", cancelled: true }
    }
    return { title: "Transaction failed", description: error.shortMessage }
  }
  if (error instanceof Error) return { title: "Something went wrong", description: error.message }
  return { title: "Something went wrong", description: "Try again in a moment." }
}
