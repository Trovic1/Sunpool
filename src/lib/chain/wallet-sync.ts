import type { Address, Hash } from "viem"
import { getConnectorClient, getTransaction } from "wagmi/actions"

import type { wagmiConfig } from "./wagmi"

type Config = typeof wagmiConfig

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Wallets read the next nonce from their own RPC node. Behind a load balancer that
 * node can lag a block behind the one that confirmed our approval, and the wallet then
 * reuses the approval's nonce ("nonce too low"). Wait until the wallet's own node has
 * seen the confirmed transaction before asking for the next signature.
 */
export async function waitForWalletToCatchUp(config: Config, account: Address, confirmed: Hash, timeoutMs = 20_000) {
  const tx = await getTransaction(config, { hash: confirmed })
  const client = await getConnectorClient(config)
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const count = await client.request({ method: "eth_getTransactionCount", params: [account, "pending"] })
    if (BigInt(count) > BigInt(tx.nonce)) return
    await sleep(1000)
  }
}

const isNonceTooLow = (error: unknown) => String((error as Error)?.message ?? "").toLowerCase().includes("nonce too low")

/** Runs a wallet write, retrying once if the wallet submitted a stale nonce. */
export async function retryOnStaleNonce<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send()
  } catch (error) {
    if (!isNonceTooLow(error)) throw error
    await sleep(3000)
    return send()
  }
}
