# Sunpool: submission draft

Living draft for the Devpost write-up. Updated as features land.

## Track alignment

Renewable Energy & Energy Trading. Sunpool covers peer-to-peer energy trading, renewable certificate tracking, microgrid coordination and tokenized incentives.

## Problem

In Lagos, grid supply is unreliable and many homes run diesel generators, while rooftop solar owners often produce more than they use at midday with no way to sell it to the people next door. Where local trading does exist, buyers have to trust the seller's numbers, and green claims can be counted twice.

## Solution

**Prepaid power from your neighbour's roof.** Lagos users already load prepaid units on their DisCo meter. Those units are locked to the meter, so Sunpool never resells them. Instead, neighbours load kWh of solar surplus from a nearby roof, delivered over a shared line (compound, estate or mini-grid). A small smart meter counts the units down and signs each reading. A neighborhood market where rooftop owners list surplus kWh and neighbors buy it with a dollar stablecoin on Celo (USDm, formerly cUSD, on mainnet; USDC on the testnet demo). Each sale is backed by a signed meter reading whose ID can be consumed once, which mints exactly one renewable energy certificate. A transparent forecast and price suggestion help sellers list a fair amount at a fair price.

## Target users

- Households with 3–10 kW rooftop arrays (sellers)
- Neighbors without panels, often phone-first and potentially in MiniPay (buyers)
- Community energy / microgrid coordinators

## Links

- Live demo: https://sunpool-gamma.vercel.app
- Activity: https://sunpool-gamma.vercel.app/activity
- Double-claim proof: https://sunpool-gamma.vercel.app/double-claim
- Contracts (Celo Sepolia, verified on Blockscout): ReadingRegistry `0xdA4575C3C30F5E81E0d57Ed96fd6ba39a2FE8b10`, RECToken `0xC92552b83C094E8052d9b8B4EDba34A3E1bA4ec6`, EnergyMarket (USDC) `0xAd7dF1530410e4eA9a6CAcb0C9C993958Aef0A29`

## What works today

- Contracts live on Celo Sepolia: signed meter readings verified on-chain (EIP-712), each reading ID consumable once (`ReadingAlreadyConsumed`), stablecoin settlement (USDC on testnet; USDm, formerly cUSD, on mainnet), ERC-721 certificates with meter ID, reading ID, timestamp and Wh. 20 tests cover double claims, bad signatures, settlement math and access control.
- The Market reads real listings and settled trades from the chain; wallets (MetaMask, MiniPay) can list surplus and buy.
- Double-claim page replays an already-consumed reading against the live contract and shows the rejection, no wallet needed.

- Offline seeded mode (`?source=seeded`) for Surulere, Lagos, clearly labeled as simulated
- Minimal app home: one Buy power / Sell surplus panel, "Load X kWh" in one tap, AI fair price on the Sell tab
- Live trade tape (on /activity) with pause/resume, optimistic "Pending" rows and screen-reader announcements
- Generation chart: metered (simulated) vs forecast with a confidence band, keyboard steppable, with a data table
- Counters: kWh traded, certificates minted, estimated CO₂ avoided with the emission factor and its source visible
- Buy a listing (pending → settled toast) and list surplus with a suggested price and inline validation
- Loading, empty (pre-dawn) and error (feed offline + retry) states, desktop and 360px phone width, reduced-motion support

## Scalability and adoption

_To fill in: MiniPay distribution, smart meter / inverter API onboarding, per-neighborhood markets._

## Honesty notes

- Meter data is simulated: a server-side meter key signs readings. Trades, payments and certificates are real testnet transactions. Labeled in the UI footer and README.
- CO₂ avoided is an estimate using 0.456 kg CO₂e/kWh (Nigeria grid 2025, Ember via Our World in Data).
- Forecasts are shown with a confidence band.
