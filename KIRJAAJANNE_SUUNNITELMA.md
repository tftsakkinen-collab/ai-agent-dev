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
Potilaskirjausten tekeminen tapahtuu poikkeuksetta tietokoneella potilastietojärjestelmään. Kun painotetaan äärimmäistä helppoutta ja yksinkertaisuutta (ei erillisiä asennuspaketteja), **selainpohjainen sovellus (joka tallentaa tiedot paikallisesti)** on käyttäjälle paras ratkaisu. Ohjelman saa auki kirjanmerkistä, ja sanelut voi selata sekä kopioida suoraan selaimesta potilastietojärjestelmään.

**Tietoturvallinen paikallinen tallennus selaimessa:**
Selainohjelma voidaan rakentaa niin, että se tallentaa kirjaukset selaimen omaan paikalliseen tietokantaan (IndexedDB). Tietoturva ratkaistaan *selaimessa tapahtuvalla salauksella*:
1. Käyttäjä luo ohjelmaan salasanan (master key).
2. Kun sanelu on valmis, teksti salataan vahvalla algoritmilla (esim. AES-GCM 256-bit).
3. Salattu pätkä tallennetaan selaimen tietokantaan (teksti ei koskaan lähde internetiin).
4. Vain syöttämällä oikean salasanan käyttäjä saa omat vanhat kirjauksensa auki ja luettavaan muotoon.

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

### Suositus MVP:lle: Vaihtoehto C (PWA Selainkäyttöliittymä + Lokaali Salattu Tallennus + Kevyt Taustapalvelu)
**Perustelu:** Fysioterapeutit ja hammaslääkärit käyttävät työpöytäkoneita, joissa selain on jo auki potilastietojärjestelmää varten. Selainpohjaisuus takaa sen, että käyttöliittymä tuntuu tutulta ja helpolta. Jotta raskaita Whisper- ja LLM-malleja voidaan ajaa luotettavasti *suomen kielellä*, on kuitenkin edelleen turvallisinta ajaa varsinainen laskenta selaimen ulkopuolella, koneella pyörivässä kevyessä paikallisessa taustapalvelimessa.

Käyttäjäkokemus on kuitenkin puhdas **Selain**:
1. Käyttäjä avaa selaimessa sivun (joka yhdistää lokaaliin palvelimeen `localhost`).
2. Sivulla tapahtuu kaikki: sanelu, paikallinen salaus AES-GCM-algoritmilla, tallennus selaimen sisäiseen tietokantaan ja tekstien purkaminen salasanalla.

Vaihtoehtoisesti, jos mallit saadaan optimoitua tarpeeksi (WebAssembly/WebGPU), voidaan siirtyä Vaihtoehto B:hen, jolloin edes paikallista taustapalvelinta ei tarvita, vaan kaikki laskenta tapahtuu suoraan selaimessa. Suomen kielen laatuvaatimukset tekevät tästä kuitenkin MVP-vaiheessa riskialttiimman.

## 3. MVP:n Tekninen Arkkitehtuuri

*   **Käyttöliittymä (UI):** React tai Vue.js, toimii puhtaasti **selaimessa** (PWA).
*   **Tallennus ja Salaus (UUSI):** Selaimen **IndexedDB** paikalliseen tallennukseen. Tallennus salataan selaimessa käyttäjän syöttämällä salasanalla käyttäen **Web Crypto API:n AES-GCM** salausta.
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

**Vaihe 3: Käyttöliittymä, UX ja Paketointi/Asennus**
*   Tavoite: Käyttäjäystävällinen sovellus ja helppo asennus/käyttöönotto.
*   Tehtävät: PWA-käyttöliittymän viimeistely. Leikepöytäintegraatio (tekstin helppo kopiointi yhdellä painikkeella). Paikallisen taustapalvelun kevyen asennuspaketin luominen tai ohjeistus.

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

## 6. Esihenkilön / Liiketoimintajohdon Huomiot: Ratkaistavat esteet ennen toteutusta

Esihenkilön ja tuoteomistajan näkökulmasta projektissa on teknisen koodaamisen lisäksi merkittäviä strategisia ja liiketoiminnallisia kysymyksiä, jotka täytyy ratkaista tai ainakin linjata ennen kuin kehittäjät aloittavat koodaamisen:

### 1. "Salasanan Unohtuminen" -skenaario (Tietoturva vs. Käytettävyys)
Jos käytämme selaimen sisäistä salausta (AES-GCM), jossa avain on käyttäjän pääsalasana, **käyttäjä menettää kaikki kirjatut tekstinsä lopullisesti, jos hän unohtaa salasanansa**.
*   *Päätös:* Hyväksymmekö tämän riskin MVP:ssä (korostettu varoitus käyttäjälle), vai tarvitaanko monimutkaisempi salasanan palautusmekanismi (mikä heikentää "täysin lokaalia" lupausta)? MVP:ssä kirjaukset on joka tapauksessa tarkoitus siirtää potilastietojärjestelmään päivän päätteeksi, joten vanhojen saneluiden menetys ei saisi olla katastrofi. Tämä käyttöohjeistus on lyötävä lukkoon.

### 2. Keskivertokäyttäjän IT-taidot ja Asennustuki
Vaikka käyttöliittymä on selainpohjainen, tekoälymallit vaativat paikallisen taustapalvelun pyörimään koneella. Fysioterapeutit/hammaslääkärit eivät ole IT-asiantuntijoita.
*   *Päätös:* Miten taustapalvelimen (esim. Whisper.cpp) asennus tehdään idioottivarmaksi? Jos asennus vaatii komentorivin käyttöä, MVP kaatuu heti asennettavuuteen. Tarvitsemme resursointia rakentamaan "yhden klikkauksen" asennusohjelman (.exe/.dmg) taustapalvelulle, sekä kapasiteettia asiakastukeen.

### 3. Laitteistokanta (Hardware-todellisuus)
Oletamme, että tekoälymallit pyörivät "paikallisesti". Todellisuudessa monella yksityisyrittäjällä on käytössään 5-7 vuotta vanha kannettava ilman erillistä näytönohjainta.
*   *Päätös:* Ennen koodauksen aloitusta on testattava *hitaimmalla mahdollisella* testikoneella (esim. vanha Intel i5 -läppäri), kuinka kauan 5 minuutin sanelun prosessointi suomenkielisellä mallilla kestää. Jos se kestää 15 minuuttia, tuote ei ole käyttökelpoinen. Meidän on määriteltävä selkeät minimilaitteistovaatimukset ennen markkinointia.

### 4. MDR (Medical Device Regulation) -Rajavedon virallistaminen
Olemme olettaneet, ettei työkalu ole lääkinnällinen laite, koska se vain "dokumentoi". Jos kuitenkin LLM tekee vahingossa terminologiavirheen (esim. muuttaa "ei leikata" muotoon "leikataan" tai jättää olennaisen negatiivisen löydöksen pois), kuka on vastuussa?
*   *Päätös:* Tarvitsemme juristin lausunnon, riittääkö käyttöehtoihin (EULA) vastuuvapauslauseke: "Ammattilaisen on aina tarkistettava tekoälyn tuottama teksti ennen tallentamista potilasrekisteriin".

### 5. Lisensointi- ja Kaupallinen malli
Koska ohjelmisto toimii täysin lokaalisti, emme voi luotettavasti "katkaista" käyttöoikeutta pilvestä, jos asiakas lopettaa kuukausimaksun maksamisen (ellemme rakenna ohjelmaan pakollista nettiyhteyden "lisenssitarkistusta", mikä vähentää ohjelman luotettavuutta ja rikkoo offline-idean).
*   *Päätös:* Myymmekö ohjelman kertamaksulla (esim. 500 € kertaostos + valinnaiset vuosittaiset päivitykset) vai rakennammeko DRM-lisenssitarkistuksen kuukausilaskutusta varten? Tämä vaikuttaa suoraan ohjelmiston arkkitehtuuriin.