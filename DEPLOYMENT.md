# GearSpot Tuotantojulkaisu (Deployment Guide)

Tämä sovellus on rakennettu "production-ready" tasolle ja se vaatii NodeJS-ympäristön sekä kyvyn tallentaa tietoa levylle (SQLite ja `/uploads`-hakemisto) **tai** S3-pilveen.

Suosittelemme **Render.com** tai **Railway.app** palveluita, koska ne tukevat suoraan NodeJS-palvelimia ja pysyviä levyjä (Persistent Disk) toisin kuin Vercel (joka on serverless).

## 1. Ympäristömuuttujat (Environment Variables)

Kun pystytät palvelimen, sinun tulee syöttää sille seuraavat muuttujat (esim. Renderin Environment -välilehdelle):

- `AUTH_SECRET`: Pitkä satunnainen merkkijono (esim. `a8b9f...`) kirjautumistokenien salausta varten.
- `STRIPE_SECRET_KEY`: Oikea Live-avain Stripestä (alkaa `sk_live_...`).
- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Oikea Live-avain Stripestä (alkaa `pk_live_...`).
- `STRIPE_WEBHOOK_SECRET`: Avain, jonka saat Stripestä kun rekisteröit Webhook-endpointin (`/api/stripe/webhook`).

**(Vapaaehtoinen) AWS S3 -kuvatallennus**
Jos haluat kuvien menevän pilveen levyn sijaan (erittäin suositeltavaa!):
- `AWS_REGION`: esim. `eu-north-1`
- `AWS_ACCESS_KEY_ID`: AWS IAM avain
- `AWS_SECRET_ACCESS_KEY`: AWS IAM salasana
- `AWS_BUCKET_NAME`: S3-bucketin nimi

## 2. Palvelimen asennus Render.com:iin

1. Luo tili [Renderiin](https://render.com).
2. Valitse "New Web Service" ja yhdistä tämä GitHub-repo.
3. Asetukset:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server/index.js`
4. Lisää levytila tietokannalle ja kuville:
   - Mene "Advanced" -> "Add Disk".
   - **Name:** `data`
   - **Mount Path:** `/app/server` (tai mihin asetat tiedostot).

## 3. Webhookin asennus Stripeen

1. Mene Stripen Dashboardissa **Developers -> Webhooks**.
2. Lisää uusi endpoint: `https://[sinun-palvelimen-url]/api/stripe/webhook`.
3. Valitse kuunneltava tapahtuma: `payment_intent.succeeded` ja `payment_intent.payment_failed`.
4. Ota talteen Webhook Signing Secret (`whsec_...`) ja aseta se palvelimesi ympäristömuuttujiin (`STRIPE_WEBHOOK_SECRET`).

## 4. Oulu-tuotteiden vieminen / Admin-toimet

Kun palvelin pyörii, kirjaudu sisään "super-adminina":
1. Mene selaimella osoitteeseen `https://[sinun-palvelimen-url]`.
2. Asenna / lisää SUP-laudat järjestelmään (voit lisätä ne UI:n kautta tai syöttämällä vanhan JSON-datan suoraan `gearspot.sqlite`-tiedostoon).

## 5. Domainin kytkeminen

Jos haluat käyttää esim. `sup-oulu.fi` osoitetta:
1. Osta domain haluamaltasi palveluntarjoajalta.
2. Renderissä mene Web Servicen asetuksiin -> "Custom Domains".
3. Lisää `sup-oulu.fi` ja noudata ohjeita DNS CNAME / A -tietueiden päivittämiseksi.
