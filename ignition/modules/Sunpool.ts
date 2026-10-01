import { buildModule } from "@nomicfoundation/hardhat-ignition/modules"
import { keccak256, stringToHex } from "viem"

/**
 * Deploys ReadingRegistry, RECToken and EnergyMarket, then wires roles:
 * - the market may consume readings and mint certificates
 * - the demo meter signer is registered for meter "sunpool:demo-meter"
 *
 * Parameters (see ignition/parameters/celoSepolia.json):
 * - stablecoin: USDm address on the target network
 * - meterSigner: address of the key that signs (simulated) meter readings
 */
export const DEMO_METER_ID = keccak256(stringToHex("sunpool:demo-meter"))

export default buildModule("Sunpool", (m) => {
  const admin = m.getAccount(0)
  const stablecoin = m.getParameter<string>("stablecoin")
  const meterSigner = m.getParameter<string>("meterSigner")
  const meterId = m.getParameter<string>("meterId", DEMO_METER_ID)

  const registry = m.contract("ReadingRegistry", [admin])
  const certificates = m.contract("RECToken", [admin])
  const market = m.contract("EnergyMarket", [admin, stablecoin, registry, certificates])

  const consumerRole = m.staticCall(registry, "CONSUMER_ROLE")
  const minterRole = m.staticCall(certificates, "MINTER_ROLE")
  m.call(registry, "grantRole", [consumerRole, market], { id: "grantConsumer" })
  m.call(certificates, "grantRole", [minterRole, market], { id: "grantMinter" })
  m.call(registry, "registerMeter", [meterId, meterSigner], { id: "registerDemoMeter" })

  return { registry, certificates, market }
})
