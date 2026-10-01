import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"

/**
 * Second EnergyMarket that settles in USDC on Celo Sepolia, reusing the deployed
 * ReadingRegistry and RECToken. Test USDm has almost no liquidity on Celo Sepolia
 * (the Mento USDC/USDm pool held 0.0014 USDm on 2026-10-01), while test USDC is
 * freely available from https://faucet.circle.com. Mainnet would settle in USDm.
 */
export default buildModule("SunpoolUsdcMarket", (m) => {
  const admin = m.getAccount(0)
  const usdc = m.getParameter<string>("usdc")
  const registry = m.contractAt("ReadingRegistry", m.getParameter<string>("registry"))
  const certificates = m.contractAt("RECToken", m.getParameter<string>("recToken"))

  const market = m.contract("EnergyMarket", [admin, usdc, registry, certificates])

  m.call(registry, "grantRole", [m.staticCall(registry, "CONSUMER_ROLE"), market], { id: "grantConsumerUsdc" })
  m.call(certificates, "grantRole", [m.staticCall(certificates, "MINTER_ROLE"), market], { id: "grantMinterUsdc" })

  return { market }
})
