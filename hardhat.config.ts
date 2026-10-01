import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem"
import { configVariable, defineConfig } from "hardhat/config"

import { CELO_SEPOLIA } from "./src/lib/chain/celo.js"

export default defineConfig({
  plugins: [hardhatToolboxViem],
  solidity: {
    profiles: {
      default: { version: "0.8.28" },
      production: {
        version: "0.8.28",
        settings: { optimizer: { enabled: true, runs: 200 } },
      },
    },
  },
  networks: {
    hardhat: { type: "edr-simulated", chainType: "l1" },
    celoSepolia: {
      type: "http",
      chainType: "generic",
      chainId: CELO_SEPOLIA.id,
      url: CELO_SEPOLIA.rpcUrl,
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")],
    },
  },
  chainDescriptors: {
    [CELO_SEPOLIA.id]: {
      name: CELO_SEPOLIA.name,
      blockExplorers: {
        blockscout: {
          name: "Celo Sepolia Blockscout",
          url: CELO_SEPOLIA.explorerUrl,
          apiUrl: `${CELO_SEPOLIA.explorerUrl}/api`,
        },
      },
    },
  },
  verify: {
    blockscout: { enabled: true },
    etherscan: { enabled: false },
    sourcify: { enabled: false },
  },
})
