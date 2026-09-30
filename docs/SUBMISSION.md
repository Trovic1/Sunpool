# Sunpool: submission draft

Living draft for the Devpost write-up. Updated as features land.

## Track alignment

Renewable Energy & Energy Trading. Sunpool covers peer-to-peer energy trading, renewable certificate tracking, microgrid coordination and tokenized incentives.

## Problem

In Lagos, grid supply is unreliable and many homes run diesel generators, while rooftop solar owners often produce more than they use at midday with no way to sell it to the people next door. Where local trading does exist, buyers have to trust the seller's numbers, and green claims can be counted twice.

## Solution

A neighborhood market where rooftop owners list surplus kWh and neighbors buy it in cUSD on Celo. Each sale is backed by a signed meter reading whose ID can be consumed once, which mints exactly one renewable energy certificate. A transparent forecast and price suggestion help sellers list a fair amount at a fair price.

## Target users

- Households with 3–10 kW rooftop arrays (sellers)
- Neighbors without panels, often phone-first and potentially in MiniPay (buyers)
- Community energy / microgrid coordinators

## What works today

- Market screen on seeded, clearly labeled simulated data for Surulere, Lagos
- Live trade tape with pause/resume, optimistic "Pending" rows and screen-reader announcements
- Generation chart: metered (simulated) vs forecast with a confidence band, keyboard steppable, with a data table
- Counters: kWh traded, certificates minted, estimated CO₂ avoided with the emission factor and its source visible
- Buy a listing (pending → settled toast) and list surplus with a suggested price and inline validation
- Loading, empty (pre-dawn) and error (feed offline + retry) states, desktop and 360px phone width, reduced-motion support

## Scalability and adoption

_To fill in: MiniPay distribution, smart meter / inverter API onboarding, per-neighborhood markets._

## Honesty notes

- Meter data is simulated in the demo and labeled as such.
- CO₂ avoided is an estimate using 0.456 kg CO₂e/kWh (Nigeria grid 2025, Ember via Our World in Data).
- Forecasts are shown with a confidence band.
