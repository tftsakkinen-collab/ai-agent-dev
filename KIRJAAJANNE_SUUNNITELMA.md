# Kirjaajanne – Tuotesuunnitelma ja Arkkitehtuuriehdotus

Tämä dokumentti on tuotesuunnitelma ja tekninen arkkitehtuuriehdotus "Kirjaajanne"-sovellukselle, joka on paikallisesti toimiva suomenkielinen sanelu- ja potilaskirjaustyökalu terveydenhuollon ammattilaisille (aluksi fysioterapeuteille ja hammaslääkäreille).

## 1. Käyttäjäkokemus ja Alustavalinta: Kännykkä, Selain vai Tietokone?

Ennen teknisten ratkaisujen vertailua on oleellista miettiä, mikä alusta on *käyttäjälle (fysioterapeutille/hammaslääkärille)* helpoin laitteen ja potilastietojärjestelmän (Kanta-yhteensopivat järjestelmät kuten Diarium, Kanta, ProConsilium) välisen työnkulun kannalta.

Koska tuotteessa ei ole suoraa integraatiota (MVP-vaihe), valmiin tekstin siirtäminen potilastietojärjestelmään tapahtuu kopioimalla (Copy-Paste).

*   **Tietokone (Työpöytäsovellus)**
    *   **Työnkulku:** Fysioterapeutti saneluohjelma on auki samalla tietokoneella (esim. toisella näytöllä tai pienenä ikkunana), jossa potilastietojärjestelmä on auki. Sanelu -> "Kopioi" -nappi -> Liitä (Ctrl+V) potilastietojärjestelmään.
    *   **Plussat:** Erittäin saumaton ja nopea kopiointi-liittäminen. Tyypillisin ympäristö potilastietojen käsittelyyn.
    *   **Miinukset:** Vaatii ohjelman asennuksen (esim. .exe Windowsille).

*   **Selain (Web-sovellus tietokoneella)**
    *   **Työnkulku:** Kuten tietokonesovelluksessa, mutta saneluohjelma pyörii selainvälilehdessä.
    *   **Plussat:** Ei vaadi asennusta, erittäin helppo kokeilla ("avaa vain linkki").
    *   **Miinukset:** Selaimessa *paikallisten* (on-device) mallien ajaminen on vielä epävakaata ja muistisyöppöä. Tiedoston/mallien lataus voi kestää jokaisella käyttökerralla, ellei välimuisti toimi täydellisesti. Mikrofoni-oikeuksien kyselyt voivat turhauttaa.

*   **Kännykkäsovellus (Mobiili)**
    *   **Työnkulku:** Fysioterapeutti sanelee kännykkään kävellessään tai istuessaan. Kännykkä rakenteistaa tekstin. *Miten teksti saadaan koneelle potilastietojärjestelmään?* Sähköpostilla, WhatsAppilla (ei tietoturvallinen) tai erillisen pilvisynkronoinnin kautta (rikkoo "on-device" -lupauksen).
    *   **Plussat:** Äärimmäisen helppo sanelun nauhoitusvaihe, kännykkä on aina mukana.
    *   **Miinukset:** Kopiointi potilastietojärjestelmään on erittäin kömpelöä ja hitaampaa kuin tietokoneella. Kännykän prosessointiteho rajoittaa paikallisten tekoälymallien kokoa merkittävästi.

**Johtopäätös käyttäjäkokemuksesta:**
Potilaskirjausten tekeminen tapahtuu poikkeuksetta tietokoneella potilastietojärjestelmään. Jotta "copy-paste"-vaihe on mahdollisimman kitkaton, **tietokoneella toimiva sovellus** on ylivoimaisesti helpoin ja tehokkain ratkaisu ammattilaisen päivittäisessä työssä. Kännykän ja tietokoneen välinen tekstin siirto ilman pilveä on liian kankea MVP-vaiheeseen.

---

## 2. Vaihtoehtoiset tekniset lähestymistavat

Paikallisen (on-device) ratkaisun toteuttamiseksi on kolme pääasiallista lähestymistapaa:

### Vaihtoehto A: Paikallinen Desktop-sovellus (Tauri/Electron + Python/C++ taustapalvelu)
Käyttöliittymä toteutetaan web-teknologioilla (React, Vue) ja paketoidaan työpöytäsovellukseksi. Taustalla pyörii paikallinen prosessi, joka ajaa Whisper-mallia ja tekstinkäsittely-LLM:ää.
*   **Plussat:** Erinomainen suorituskyky, täysi pääsy laitteiston resursseihin (esim. näytönohjain, mikrofoni), helppo asennuspaketti (exe/dmg). Mahdollistaa raskaampien mallien ajamisen.
*   **Miinukset:** Kaksi erillistä koodikantaa (UI ja AI-taustapalvelu), asennuspaketin koko voi kasvaa suureksi mallien myötä, vaatii asennuksen käyttäjän koneelle.

### Vaihtoehto B: Selainpohjainen WebAssembly (WASM) -sovellus (WebGPU)
Koko sovellus (UI ja tekoälymallit) ladataan selaimeen kerran ja ajetaan paikallisesti selaimen sisällä hyödyntäen WebAssemblyä ja WebGPU:ta.
*   **Plussat:** Ei asennusta (toimii heti selaimessa URL-osoitteesta), erittäin matala kynnys kokeilla, helppo päivittää. Täysin paikallinen, kunhan sivu on kerran ladattu välimuistiin.
*   **Miinukset:** Selaimentuki on vielä rajallinen raskaiden tekoälymallien ajamiselle, vaatii paljon selaimen muistia, tiedostojärjestelmän käyttö ja offline-käytön varmistaminen on haastavampaa. Raskaiden suomenkielisten mallien pyörittäminen selaimessa on toistaiseksi epävarmaa.

### Vaihtoehto C: PWA (Progressive Web App) + Paikallinen kevyt palvelin
Käyttöliittymä on selainpohjainen sovellus (PWA), mutta se kommunikoi erillisen, koneelle asennettavan kevyen taustapalvelimen (esim. Go:lla tai Rustilla kirjoitettu Whisper.cpp kääre) kanssa.
*   **Plussat:** Kevyt käyttöliittymä, vankka taustapalvelu. Parempi vikasietoisuus kuin puhtaassa WASM-ratkaisussa.
*   **Miinukset:** Vaatii kahden komponentin hallinnan (selain-UI + taustapalvelu), voi olla hämmentävä loppukäyttäjälle asentaa erillinen ohjelma, jolla ei ole omaa käyttöliittymää.

### Suositus MVP:lle: Vaihtoehto A (Paikallinen Desktop-sovellus Tauri + Whisper.cpp/Llama.cpp)
**Perustelu:** Fysioterapeutit ja hammaslääkärit käyttävät yleensä työpöytäkoneita tai kannettavia tietokoneita vastaanotoillaan. Desktop-sovellus antaa parhaan suorituskyvyn äänentunnistukseen ja luotettavimman mikrofoni-integraation. Se mahdollistaa raskaampien paikallisten kielimallien tehokkaan ajamisen, mitä tarvitaan terminologian korjaamiseen ja rakenteistamiseen suomen kielellä. Tauri on suositeltu kehys, sillä se on huomattavasti Electronia kevyempi ja tuottaa pienempiä asennustiedostoja.

## 3. MVP:n Tekninen Arkkitehtuuri

*   **Käyttöliittymä (UI):** React tai Vue.js, paketoituna **Taurilla** (Rust-pohjainen taustajärjestelmä).
*   **Puheentunnistus (ASR):** **Whisper.cpp** (C/C++ implementaatio OpenAI:n Whisperistä). Se on optimoitu toimimaan CPU:lla (ja Apple Siliconilla), joten se ei vaadi käyttäjältä kalliita näytönohjaimia.
    *   *Malli:* **Whisper Small tai Base** (tai erikseen suomeen hienosäädetty malli, esim. Hugging Facesta). Small tarjoaa yleensä riittävää tarkkuutta suomen kielessä MVP-vaiheeseen.
*   **Terminologian korjauskerros ja Rakenteistus:** **Paikallinen LLM (Large Language Model) jälkikäsittelyvaiheena.**
    *   *Ratkaisu:* ASR (Whisper) tuottaa raakatekstin. Tämän jälkeen teksti syötetään paikallisesti ajettavalle LLM:lle, jota ajetaan **Llama.cpp**:n avulla.
    *   *Promptaus vs. Hienosäätö:* **Promptaus** (In-Context Learning) on MVP-vaiheessa kustannustehokkain ja nopein ratkaisu. Järjestelmäprompti voisi olla: "Olet suomalainen fysioterapeutti. Korjaa seuraavasta sanelusta lääketieteelliset termit ja jaottele teksti otsikoiden alle...". LLM ymmärtää kontekstin paremmin kuin yksinkertainen etsi-ja-korvaa -sanasto, erityisesti foneettisten virheiden kohdalla (esim. "kranio servikaalinen" -> "kraniocervikaalinen"). Pieni 7-8 miljardin parametrin malli (kvantisoituna) on tähän sopiva.
*   **Tietokanta:** SQLite (paikallinen), jos halutaan tallentaa väliaikaisia saneluita tai asetuksia (esim. omat rakennepohjat). MVP:ssä teksti voi elää vain muistissa siihen asti, kunnes käyttäjä kopioi sen leikepöydälle.

## 4. Karkea Rakennussuunnitelma / Roadmap

**Vaihe 1: Proof of Concept (PoC) & Perus-ASR**
*   Tavoite: Saada paikallinen Whisper pyörimään ja litteroimaan suomea koneella.
*   Tehtävät: Whisper.cpp-integraatio. Peruskäyttöliittymä (Nauhoita -> Teksti).

**Vaihe 2: Jälkikäsittely ja Terminologia**
*   Tavoite: Raakatekstin korjaaminen ja rakenteistaminen.
*   Tehtävät: Llama.cpp integraatio paikallista LLM:ää varten. Yhden tai kahden käyntityyppipohjan (esim. "Fysioterapia - Alkustatus", "Hammaslääkäri - Tarkastus") promptin hiominen. LLM:n kvantisointi, jotta se pyörii myös peruskannettavilla.

**Vaihe 3: Käyttöliittymä, UX ja Paketointi**
*   Tavoite: Käyttäjäystävällinen sovellus ja helppo asennus.
*   Tehtävät: Tauri-käyttöliittymän viimeistely. Leikepöytäintegraatio (tekstin helppo kopiointi yhdellä painikkeella). Asennuspaketin luominen.

**Vaihe 4: MVP Beta-testaus**
*   Tavoite: Palautteen kerääminen rajatulta kohderyhmältä todellisessa työympäristössä.
*   Tehtävät: Sovelluksen jakaminen pilottikäyttäjille. Mallien tarkkuuden ja promptien optimointi palautteen perusteella.

**Tulevaisuus (MVP:n jälkeen):**
*   Omien sanastojen/lyhenteiden lisäys ja hienosäätö.
*   Integraatio selaimen potilastietojärjestelmiin selainlaajennuksen avulla.

## 5. Avoimet Kysymykset ja Riskit

1.  **Laitteistovaatimukset ja Suorituskyky:** Suurin riski on, että tehokas terminologian korjaus (LLM) ja sanelu (Whisper) vaativat liikaa laskentatehoa vanhemmilta tietokoneilta, joita monilla pienyrittäjillä saattaa olla. Ratkaisuna on käyttää voimakkaasti kvantisoituja malleja, mutta se voi vaikuttaa laatuun.
2.  **MDR-luokittelu (Medical Device Regulation):** Ohjelmisto, joka on tarkoitettu lääketieteelliseen tarkoitukseen, saattaa olla lääkinnällinen laite. Koska "Kirjaajanne" ainoastaan *dokumentoi* sanelun, eikä tee diagnoosia tai hoitopäätöksiä, se ei todennäköisesti kuulu MDR:n piiriin. Tämä on kuitenkin syytä varmistaa juridisesti.
3.  **Tietosuoja-arkkitehtuuri ja Vastuut:** Vaikka data ei siirry pilveen, on varmistettava, ettei saneludata (audio tai teksti) tallennu selkokielisenä tietokoneen levylle (esim. lokitiedostoihin) pysyvästi vahingossa. MVP:ssä kaikki pitäisi käsitellä vain välimuistissa ja poistaa ohjelman sulkeutuessa.
4.  **Jakelu ja Asennus:** Raskaat paikalliset kielimallit kasvattavat asennuspaketin kokoa (helposti useita gigatavuja). Tämä saattaa olla hidasta tai hämmentävää asentaa. Vaihtoehtoisesti voidaan jakaa kevyt asennuspaketti, joka lataa mallit taustalla ensimmäisen käynnistyksen yhteydessä.
5.  **Käyttöjärjestelmät (Mac vs. Windows):** Paikallisten mallien saaminen pyörimään tehokkaasti (esim. laitteistokiihdytyksellä) vaatii hieman erilaista optimointia Apple Silicon -koneille ja Windows-koneille, joissa voi olla hyvinkin vaihtelevaa rautaa.