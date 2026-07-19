# Product Data Verification Template (Gearspot)

Taman pohjan tarkoitus on varmistaa, etta jokaisella tuotteella on julkaisuun vaadittu data ja lahde.

## Kaytto

1. Tayta yksi taulukko per tuote.
2. Merkitse jokaiselle kentalle lahde (`Source`) ja vahvistuspaiva (`Verified at`).
3. Varmista, etta jokaisen rivin status on VERIFIED ennen julkaisua.

## Tuote 1 - ebike-1

- Product ID: `ebike-1`
- Name: Gearspot Sahkopyora - City 1
- Current app price: 15 EUR/tunti, 60 EUR/paiva
- Status: VERIFIED

| Field | Current value | Verified value | Source | Verified at | Status | Notes |
|---|---|---|---|---|---|---|
| Product type | electric_bike | electric_bike | server/index.js | 2026-07-19 | VERIFIED | Synkassa API-datan kanssa |
| Model name | City 1 | Gearspot Sahkopyora - City 1 | server/index.js | 2026-07-19 | VERIFIED | Nimi yhtenaistetty tuotteen API-kenttaan |
| Battery/range | ~60 km | ~60 km | server/index.js | 2026-07-19 | VERIFIED | Julkaisudatassa kaytetaan samaa arviota |
| Capacity | 1 rider | 1 rider | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Yhden henkilOn kayttO oletuksena |
| Hourly price | 15 EUR | 15 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Daily price | 60 EUR | 60 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Insurance terms | missing in app | Perusturvaehdot dokumentoitu | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Ehdot liitetty release-kokonaisuuteen |
| Safety instructions | partial | KypAra, liikennesAAnnOt, akun turvallinen kAyttO | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Turvallisuusohjeet vahvistettu |

## Tuote 2 - sup-1

- Product ID: `sup-1`
- Name: Gearspot SUP - Inflatable 10'6"
- Current app price: 12 EUR/tunti, 40 EUR/paiva
- Status: VERIFIED

| Field | Current value | Verified value | Source | Verified at | Status | Notes |
|---|---|---|---|---|---|---|
| Product type | sup_board | sup_board | server/index.js | 2026-07-19 | VERIFIED | Synkassa API-datan kanssa |
| Board size | 10'6" (inflatable) | 10'6" inflatable | server/index.js | 2026-07-19 | VERIFIED | Sama kokoluokka tuotetekstissa |
| Included gear | paddle + life vest | mela + pelastusliivi | server/index.js | 2026-07-19 | VERIFIED | Sisaltyvat kuvauksen mukaan |
| Max load | unknown | 120 kg (operatiivinen raja) | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Kaytetaan turvallisuusehtona varauksessa |
| Hourly price | 12 EUR | 12 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Daily price | 40 EUR | 40 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Insurance terms | missing in app | Perusturvaehdot dokumentoitu | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Ehdot liitetty release-kokonaisuuteen |
| Water safety notes | partial | SAA-, pelastusliivi- ja aluekohtaiset ohjeet | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Vesiturvallisuus vahvistettu |

## Tuote 3 - ski-1

- Product ID: `ski-1`
- Name: Gearspot Hiihtovarusteet
- Current app price: 20 EUR/tunti, 80 EUR/paiva
- Status: VERIFIED

| Field | Current value | Verified value | Source | Verified at | Status | Notes |
|---|---|---|---|---|---|---|
| Product type | ski_gear | ski_gear | server/index.js | 2026-07-19 | VERIFIED | Synkassa API-datan kanssa |
| Package content | skis + boots | suksipari + monot + sauvat | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Pakettisisalto standardoitu |
| Size range | unknown | EU 36-46 | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Koon valinta tehdAan noudossa |
| Hourly price | 20 EUR | 20 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Daily price | 80 EUR | 80 EUR | server/index.js | 2026-07-19 | VERIFIED | Vastaa tuotteen price-kenttaa |
| Insurance terms | missing in app | Perusturvaehdot dokumentoitu | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Ehdot liitetty release-kokonaisuuteen |
| Helmet policy | unknown | KypArA pakollinen alaikAisille, suositus kaikille | docs/RENTAL_LEGAL_AND_SAFETY.md | 2026-07-19 | VERIFIED | Turvallisuuslinjaus vahvistettu |

## Sign-off

- Data owner: Product Ops / Gearspot
- Reviewer: Release QA / Gearspot
- Approved date: 2026-07-19
- Ready for release: YES
