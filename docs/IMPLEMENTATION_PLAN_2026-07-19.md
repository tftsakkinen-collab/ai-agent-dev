# Toteutuslista - 2026-07-19

## Tavoite
Vieda Gearspot scaffold-vaiheesta release-valmiiksi hallituilla prioriteeteilla.

## P0 - Taman viikon pakolliset (release blocker)

1. Vakauta testi- ja laatupolku
- [x] E2E kaynnistaa mock API:n automaattisesti Playwrightin webServer-asetuksella.
- [x] Poista lintin pakotettu ohitus (`|| true`) jotta virheet katkaisevat putken.
- [x] Lisaa vahintaan 3 unit-testia API- ja varauspoluille.
- [x] Lisaa yksi E2E-polku: login -> product -> booking -> review.
- [x] Lisaa provider + reviews regressiopolku E2E-testeihin.

2. Data ja sisalto valmiiksi
- [ ] Vahvista tuotetiedot (mallit, hinnat, kapasiteetit) tuotekohtaisesti.
- [x] Luo tuotedatan verifiointipohja kentittain (ID, hinta, kapasiteetti, lahde).
- [ ] Korvaa seed/hypoteesi-kentat varmennetulla sisallolla memory-tiedostoissa.
- [ ] Varmista suomi/englanti-kieliterminologia yhdenmukaiseksi.

3. Release-minimi kuntoon
- [x] Ota CI:ssa `npm ci` kayttoon asennusvaiheessa.
- [ ] Varmista EAS salaisuudet (EAS_TOKEN + allekirjoitusavaimet).
- [x] Dokumentoi yksi toistettava release-komento (local + CI).
- [x] Luo GitHub Secrets -checklista ja rollout-pass/fail -tarkistus.
- [x] Luo GitHub Actions release-job, joka ajaa `prepare_release.sh`.

## P1 - Seuraava sprintti (laatu + turvallisuus)

1. Auth hardening
- [ ] Korvaa mock-token oikealla JWT/OAuth-flowlla.
- [ ] Tuo tokenin vanheneminen ja uloskirjautuminen kaikille suojatuille kutsuille.

2. Backend hardening
- [ ] Siirra in-memory bookings/reviews pysyvaan tietokantaan.
- [ ] Lisaa basic rate limiting ja request-validointi API:in.

3. Havainnointi
- [ ] Lisaa virhelokitus (esim. Sentry) client + server.
- [ ] Lisaa release-jalkeinen smoke-checklista.

## P2 - Kehittamatta olevat kasvualueet

1. Kayttokokemus
- [ ] Parempi hakukokemus sijainneille ja kategorioille.
- [ ] Arvostelujen moderointi ja suodatus.

2. Liiketoiminta
- [ ] Maksuintegraatio ja kuittausviestit.
- [ ] Palautus- ja vahinkoprosessin tuki sovellukseen.

## Tyon tila nyt
- Tila: IN PROGRESS
- Kaynnissa oleva osuus: P0 / Data- ja release-valmius
- Seuraava toteutusaskel: EAS-salaisuuksien syotto GitHubiin ja tuotteiden verified-arvojen taytto
