/**
 * Celo network constants. One file, so testnet changes are a one-line edit.
 *
 * Source: Celo docs, checked 2026-10-01.
 * - Celo Sepolia (replaced Alfajores): https://docs.celo.org/tooling/testnets/celo-sepolia
 * - Stablecoin addresses: https://docs.celo.org/tooling/contracts/fee-currencies
 * cUSD is now "Mento Dollar" (USDm). On Celo Sepolia the token at the address below
 * returns symbol "USDm", name "Mento Dollar", 18 decimals (verified on-chain via Forno).
 */

export const CELO_SEPOLIA = {
  id: 11142220,
  name: "Celo Sepolia",
  rpcUrl: "https://forno.celo-sepolia.celo-testnet.org",
  explorerUrl: "https://celo-sepolia.blockscout.com",
  faucetUrl: "https://faucet.celo.org/celo-sepolia",
  stablecoin: {
    address: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b",
    symbol: "USDm",
    name: "Mento Dollar",
    decimals: 18,
  },
} as const

export const CELO_MAINNET = {
  id: 42220,
  name: "Celo",
  rpcUrl: "https://forno.celo.org",
  explorerUrl: "https://celo.blockscout.com",
  stablecoin: {
    // Formerly cUSD.
    address: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    symbol: "USDm",
    name: "Mento Dollar",
    decimals: 18,
  },
} as const
