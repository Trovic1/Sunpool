# Research notes (with sources)

Facts we use in the pitch, the About page and the Devpost write-up. Each one names its source. Checked 2026-10-01. Where sources disagree, both are given.

## Cost of power in Nigeria

| Fact | Value | Source |
| --- | --- | --- |
| Electricity from a petrol generator | ₦750 per kWh | Minister of Power Adebayo Adelabu, reported by [TheCable, 21 Oct 2024](https://thecable.ng/adelabu-electricity-produced-with-petrol-generator-now-costs-n750-kwh) |
| Electricity from a diesel generator | ₦950 per kWh | Same source |
| Grid tariff, Band A (20+ hours of supply a day) | ₦225 per kWh approved by NERC; Ikeja Electric charges ₦206.80 | [Business A.M.](https://businessamlive.com/nerc-ups-tariffs-to-n225-kwh-for-band-a-electricity-consumers/), [TechEconomy](https://v2.techeconomy.ng/why-ikeja-electric-reduced-electricity-tariff-for-band-a-customers) |
| Spending on self-generated power (fuel and generators), 2023 | ₦16.5 trillion, against about ₦1 trillion of power-sector revenue | Minister Adelabu, reported by [Prime Business Africa](https://primebusiness.africa/nigerians-spend-n16-5trn-on-diesel-petrol-generators-for-self-generated-power-report) |

Takeaway: generator power costs roughly three to four times the Band A grid tariff, so a neighbour's daytime solar surplus has a lot of room to be priced below the generator and still pay the seller well.

## Who cannot install their own panels

| Fact | Value | Source |
| --- | --- | --- |
| Lagos residents who rent | 51% rent, 31% own (Fortren & Company, 2026) | [Nairametrics, 1 Sep 2026](https://nairametrics.com/2026/09/01/only-31-of-lagos-residents-own-homes-as-rents-surge-report/) |
| Older estimate | 72% of Lagos residents are tenants | [BusinessDay](https://archive.businessday.ng/real-estate/article/72-of-lagos-residents-are-tenants-spending-50-of-their-monthly-income-on-rents/) |

Takeaway: at least half of Lagos residents rent, so they cannot put panels on the roof they live under.

## Regulation (who allows local electricity sales)

| Fact | Source |
| --- | --- |
| The Electricity Act 2023 lets states create and regulate their own electricity markets | [Mondaq: The Electricity Act 2023 and the rise of state electricity markets](https://www.mondaq.com/nigeria/renewables/1787744/the-electricity-act-2023-the-centralisation-of-power-and-the-rise-of-state-electricity-markets) |
| Lagos passed its Electricity Law on 3 Dec 2024; NERC transferred oversight of the Lagos market to the Lagos State Electricity Regulatory Commission (LASERC) in Dec 2024 | [ICIR](https://www.icirnigeria.org/nerc-transfers-electricity-oversight-in-lagos-to-state-regulatory-commission/), [Arise](https://www.arise.tv/nerc-transfers-lagos-electricity-oversight-to-lagos-government/) |
| In May 2026 LASERC approved 14 licences and permits covering off-grid generation, embedded generation, independent distribution, metering services and interconnected mini-grids | [Nairametrics, 9 May 2026](https://nairametrics.com/2026/05/09/lagos-approves-14-electricity-operators-across-off-grid-metering-distribution-markets/), [TheCable](https://www.thecable.ng/lagos-issues-14-power-generation-metering-licences-to-private-firms/) |
| NERC Mini-Grid Regulations 2023 cover isolated and interconnected mini-grids, with portfolio permits | [Mondaq: key innovations under the 2023 mini-grid regulations](https://mondaq.com/nigeria/renewables/1431572/key-innovations-under-the-2023-mini-grid-regulations) |

Takeaway for the pitch: Lagos now has its own regulator that is actively licensing mini-grid and metering operators. Sunpool's realistic route to market is as the metering, settlement and certificate layer for those licensed operators and for estates, not as an unlicensed electricity seller. We did **not** find a rule that explicitly allows household-to-household sales over the public grid, so that stays a future path.

## Wallets and payments

| Fact | Source |
| --- | --- |
| MiniPay is available in Nigeria (opened to all Opera Mini users there in 2023) and is now also a standalone app | [Opera Africa blog](https://blogs.opera.com/africa/2023/10/minipay-now-open-to-all-users-in-nigeria/), [AlternativeTo, May 2025](https://alternativeto.net/news/2025/5/opera-makes-minipay-available-globally-as-a-standalone-mobile-app-for-ios-and-android) |
| MiniPay supports USDT, USDC and cUSD (now USDm) | [Opera MiniPay product page](https://www.opera.com/products/minipay) |

## Meter and inverter data (production path)

| Fact | Source |
| --- | --- |
| Growatt publishes a token-authenticated Open API to read plant and inverter telemetry and historical energy data | [apis.io: Growatt](https://apis.io/providers/growatt/) |
| Deye provides cloud monitoring (Deye Cloud) for its hybrid inverters | Search result summary; API terms still to confirm |

Still open: which inverter brands dominate Lagos installations. Do not name market shares without a source.

## Grid emission factor

Nigeria 2025: 455.71 gCO₂e/kWh (lifecycle), Ember via [Our World in Data](https://ourworldindata.org/grapher/carbon-intensity-electricity). Used for "estimated CO₂ avoided".
