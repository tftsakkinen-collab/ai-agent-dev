# GitHub Secrets - käyttöönotto (Gearspot)

Tama checklist varmistaa, etta release-putki voidaan ajaa CI:ssa ilman kovakoodattuja avaimia.

## 1. Vaaditut salaisuudet

Luo seuraavat salaisuudet repossa: Settings -> Secrets and variables -> Actions -> New repository secret.

- `EAS_TOKEN`
  - Expo EAS access token CI-buildien ajamiseen.
  - Luo: `npx eas-cli login` -> `npx eas-cli whoami` -> luo token Expo-dashboardissa.

- `ANDROID_KEYSTORE_JSON`
  - Base64-muotoinen Android keystore tai EAS managed credentials -viite.
  - Jos kaytat omaa keystorea, tallenna vain salattu/base64-arvo.

- `ANDROID_KEYSTORE_PASSWORD`
  - Keystoren salasana.

- `ANDROID_KEY_ALIAS`
  - Key alias.

- `ANDROID_KEY_PASSWORD`
  - Yksittaisen keyn salasana.

- `APPLE_CREDENTIALS`
  - Apple-signing tunnisteet (tai EAS managed workflow -tiedot).

- `VERCEL_TOKEN` (valinnainen)
  - Tarvitaan, jos web julkaistaan Verceliin CI:n kautta.

## 2. Tarkistus ennen ensimmaista releasea

- [ ] `eas.json` sisaltaa `production`-profiilin Android + iOS buildiin.
- [ ] `package-lock.json` on commitoitu, jotta `npm ci` toimii CI:ssa.
- [ ] CI-workflow kayttaa `npm ci` asennukseen.
- [ ] CI-workflow ajaa `npm run lint`, `npm test` ja `npm run test:e2e`.
- [ ] EAS token toimii paikallisesti komennolla: `npx eas-cli build:list --limit 1`.

## 3. Suositeltu CI-jarjestys

1. Checkout repository.
2. Setup Node 18.
3. Run `npm ci`.
4. Run `npm run lint`.
5. Run `npm test -- --runInBand`.
6. Run `npm run test:e2e`.
7. Trigger release helper:

```bash
EAS_TOKEN=${{ secrets.EAS_TOKEN }} VERCEL_TOKEN=${{ secrets.VERCEL_TOKEN }} ./prepare_release.sh
```

## 4. Turvallisuusperiaatteet

- Ala koskaan tallenna avaimia tiedostoihin tai commit-historiaan.
- Kayta vain GitHub Secretsia tai EAS secret storagea.
- Kierrata tokenit, jos niita on koskaan kaytetty vaaringin tai jaettu vahingossa.
- Rajaa token-oikeudet minimiin (build-only, ei turhia organisaatio-oikeuksia).

## 5. Rollout check (quick pass/fail)

- [ ] Kaikki required secrets olemassa.
- [ ] CI-job menee vihreaksi branchissa.
- [ ] Android production build triggeroitu onnistuneesti.
- [ ] iOS production build triggeroitu onnistuneesti.
- [ ] Web deploy onnistui (jos kaytossa).
