import { createConfig, http } from "wagmi"
import { celoSepolia } from "wagmi/chains"
import { injected } from "wagmi/connectors"

import { CELO_SEPOLIA } from "./celo"

/** Injected wallets cover MetaMask, Valora/Opera MiniPay (window.ethereum) and most mobile wallets. */
export const wagmiConfig = createConfig({
  chains: [celoSepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: { [celoSepolia.id]: http(CELO_SEPOLIA.rpcUrl) },
  ssr: true,
})

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig
  }
}
