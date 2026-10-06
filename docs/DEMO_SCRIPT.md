# Sunpool demo video script (target 4:00, hard limit 5:00)

Read the voice-over at a calm pace. Every on-screen claim must be true on the day you record: re-check the live counters and certificate count first, and change the numbers below to match.

## Before recording

- Two browser profiles with MetaMask on Celo Sepolia: **Seller** and **Buyer**. Both funded with test CELO (https://faucet.celo.org/celo-sepolia); Buyer also has test USDC (https://faucet.circle.com, pick Celo Sepolia).
- Open these tabs: `/` (Market), `/activity`, `/certificates`, `/double-claim`, `/about`, and Blockscout for the RECToken contract.
- Load each page once first, so nothing shows a cold-start skeleton on camera.
- Backup: if Celo Sepolia is down, record the Market part with `/?source=seeded&state=live` and say on screen that it is the seeded demo.
- Screen at 1440×900, browser zoom 110%, notifications off.

## Script

### 1. The problem (0:00 – 0:35)

**Screen:** Market home, hero visible.

> "In Lagos, the grid is unreliable, so homes and shops run petrol and diesel generators. Nigeria's Minister of Power puts generator power at 750 to 950 naira per kilowatt-hour, several times the grid tariff. Meanwhile, rooftop solar owners produce more than they use at midday, and that surplus is wasted. They can't sell it to the shop next door, and if they could, nobody could trust the numbers, or stop the same green kilowatt-hour from being claimed twice."

### 2. The idea (0:35 – 0:55)

**Screen:** Scroll slowly through "How it works".

> "Sunpool is prepaid power from your neighbour's roof. You load solar units from the house next door, the way you already load a prepaid meter. A smart meter on the shared line signs every reading. Celo settles the payment in a dollar stablecoin, and each sale mints exactly one renewable energy certificate."

### 3. Sell surplus, with AI verification (0:55 – 1:50)

**Screen:** Seller profile → Connect wallet → Sell surplus tab.

> "I'm the rooftop owner. I declare a five-kilowatt array and offer two kilowatt-hours."

Show the verification result.

> "Before the meter signs anything, Sunpool's verification model checks the reading against real sunlight. It pulls today's solar irradiance for Lagos from Open-Meteo, works out the most my roof could physically have produced, subtracts what I've already sold today on-chain, and compares me to my neighbours. Here it says accept, with its reasons. The forecast and the fair-price suggestion come from the same data."

Now try an impossible amount (for example 40 kWh, or any amount at night).

> "If I try to sell more than my roof could produce, it refuses to sign, and tells me why. That's what stops a fake meter reading from becoming a fake certificate."

Go back to the valid amount and list it. Show the toast and the transaction.

> "The listing consumes the signed reading on-chain. That reading ID can never be used again."

### 4. Buy (1:50 – 2:40)

**Screen:** Buyer profile → Market → Buy power → Load.

> "Now I'm the neighbour, a tailor whose generator costs a fortune. One tap: load half a kilowatt-hour."

Approve and confirm. Show pending → settled.

> "USDC goes straight to the rooftop owner, and I receive a renewable energy certificate."

**Screen:** `/activity`: the trade appears on the tape and the counters tick up.

### 5. Certificates and the double-claim proof (2:40 – 3:25)

**Screen:** `/certificates`: the new certificate at the top. Open it on Blockscout.

> "Every certificate is public: the meter, the reading, the energy, the owner. And each one points to a reading that's marked consumed."

**Screen:** `/double-claim` → press "Claim it again".

> "Here's the proof. I replay a reading that was already sold. The live contract rejects it: ReadingAlreadyConsumed. Nothing is listed, paid or minted. No double counting."

### 6. Impact, security and the path to production (3:25 – 4:05)

**Screen:** `/about` → scroll through who it's for, security and trust, and the production path.

> "The first realistic users are estates, compounds and mini-grid operators, where a shared line already exists. Lagos now licenses mini-grid and metering operators through LASERC. About half of Lagos residents rent and can't put panels on their roof, so they're natural buyers."

> "Today the meter is simulated and we say so. In production, certified smart meters or inverter APIs sign readings on the device, with one revocable key per meter. Our threat model covers fake readings, key theft, sybil wallets and replay."

### 7. Close (4:05 – 4:20)

**Screen:** Market home.

> "Sunpool: trustworthy, peer-to-peer solar for the neighbourhood, built on Celo. Thank you."

## After recording

- Trim dead air; add captions (judges often watch muted).
- Upload to YouTube (unlisted is fine) and paste the link into Devpost and `docs/SUBMISSION.md`.
