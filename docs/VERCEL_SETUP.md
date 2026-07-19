# Vercel Setup

## Mita tama tekee

Tama projekti julkaisee kaksi asiaa samaan Vercel-preview-linkkiin:

1. `dist/`-kansioon rakennetun web-sivuston
2. `api/[...path].js`-reitin kautta mock-API:n

Web kayttaa previewssa samaa originia (`/api/...`), joten selain- ja puhelintestaus ei vaadi erillisia tunneleita.

## Ennen deployta

1. Varmista, että projekti on GitHubissa.
2. Aja paikallisesti kerran:

```bash
npm install
npx playwright test e2e/mock-api.spec.js
npm run build:web
```

## Suositus datan pysyvyyteen

Ilman Vercel KV:ta mock-data voi olla serverless-previewssa epavakaata, koska palvelinfunktiot ovat luonteeltaan tilattomia.

Suositus:

1. Luo Vercelissa Redis- tai KV-integraatio
2. Liita se projektiin
3. Tuettuja ymparistomuuttujia ovat:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`
   - tai `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

Taman jalkeen varaukset, palautukset, dynaamiset arvostelut ja virheraportit pysyvat paremmin tallessa previewssa.

## Deploy vaihe vaiheelta

### Vaihtoehto A: Vercel UI

1. Mene Verceliin ja valitse `Add New -> Project`
2. Valitse GitHub-repo
3. Framework Preset: `Other`
4. Build Command: `npm run build:web`
5. Output Directory: `dist`
6. Deploy

### Vaihtoehto B: Vercel CLI

1. Asenna CLI:

```bash
npm i -g vercel
```

2. Kirjaudu:

```bash
vercel login
```

3. Aja projektin juuressa:

```bash
vercel
```

4. Production preview / uusi deploy:

```bash
vercel --prod
```

## Julkaisun jalkeen testaa

1. Avaa Vercelin antama preview-linkki
2. Tarkista etusivu
3. Testaa:
   - kirjautuminen
   - mock-varaus
   - mock-palautus
   - `Ilmoita ongelmasta`
   - Profiili -> `Katso virheraportit`

## Huomioita

1. Mock-auth on tehty stateless-malliin, joten kirjautuminen toimii serverless-ymparistossa ilman muistissa elavia sessioita.
2. Pysyvampi mock-data edellyttaa kaytannossa KV:n liittamista projektiin.
3. Kun oikea backend tulee mukaan, `api/` voidaan irrottaa omaksi palvelukseen ilman, etta webin kayttokokemusta tarvitsee suunnitella uusiksi.