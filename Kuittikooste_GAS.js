/**
 * ALKUASETUKSET
 * 1. Aseta OpenAI API-avain
 * 2. Aseta käsiteltävän pääkansion (Vuosikansion) ID
 * 3. TÄRKEÄÄ: Ota käyttöön "Drive API" -palvelu!
 *    - Valitse Apps Script -editorin vasemmasta reunasta "Palvelut" (Services) kohdasta "+" (Lisää palvelu).
 *    - Valitse "Drive API" ja klikkaa "Lisää". (Versio v2 tai v3 kelpaa, tämä koodi käyttää REST API:a jotta se ei riipu tietystä versiosta,
 *      mutta varmuuden vuoksi myös Drive API -palvelun voi kytkeä päälle tai antaa skriptin pyytää oikeudet).
 *      HUOM! Tämä koodi tekee UrlFetchApp-kutsun Googlen Drive API:in, jolloin et tarvitse edes lisäpalvelun kytkemistä!
 *      Skripti tarvitsee vain oikeat OAuth-oikeudet.
 */

const OPENAI_API_KEY = 'SINUN_OPENAI_API_AVAIMESI_TÄHÄN';
const VUOSIKANSIO_ID = 'SINUN_VUOSIKANSION_ID_TÄHÄN';

function kasitteleVuosikansio() {
  const vuosikansio = DriveApp.getFolderById(VUOSIKANSIO_ID);
  const kuukausikansiot = vuosikansio.getFolders();

  while (kuukausikansiot.hasNext()) {
    const kuukausikansio = kuukausikansiot.next();
    kasitteleKuukausikansio(kuukausikansio);
  }

  Logger.log("Kaikki kansiot käsitelty!");
}

function kasitteleKuukausikansio(kuukausikansio) {
  const kansionNimi = kuukausikansio.getName();
  const taulukonNimi = "Kuittikooste - " + kansionNimi;

  Logger.log("Käsitellään kuukausikansio: " + kansionNimi);

  // Poistetaan mahdolliset aiemmat samannimiset koosteet tästä kansiosta
  const vanhatTiedostot = kuukausikansio.getFilesByName(taulukonNimi);
  while (vanhatTiedostot.hasNext()) {
    vanhatTiedostot.next().setTrashed(true);
  }

  // Luodaan uusi Google Sheets -taulukko
  const uusiTaulukko = SpreadsheetApp.create(taulukonNimi);
  const taulukkoId = uusiTaulukko.getId();

  // Siirretään luotu taulukko juuresta oikeaan alakansioon
  const taulukkoTiedosto = DriveApp.getFileById(taulukkoId);
  taulukkoTiedosto.moveTo(kuukausikansio);

  const sheet = uusiTaulukko.getActiveSheet();
  // Määritellään otsikot
  sheet.appendRow([
    "Tiedoston nimi",
    "Ostopäivä",
    "Maksunsaaja (Kelle)",
    "Mitä ostettu",
    "Summa (EUR)",
    "Tiedosto-ID"
  ]);

  // Jäädytetään otsikkorivi ja lihavoidaan
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, 6).setFontWeight("bold");

  // Käydään läpi kaikki kansion ja sen alakansioiden tiedostot
  kasitteleTiedostotRekursiivisesti(kuukausikansio, sheet);
}

function kasitteleTiedostotRekursiivisesti(kansio, sheet) {
  // Käsitellään kansion tiedostot
  const tiedostot = kansio.getFiles();
  while (tiedostot.hasNext()) {
    const tiedosto = tiedostot.next();
    analysoiJaKirjaaTiedosto(tiedosto, sheet);
  }

  // Käydään läpi alakansiot rekursiivisesti
  const alakansiot = kansio.getFolders();
  while (alakansiot.hasNext()) {
    kasitteleTiedostotRekursiivisesti(alakansiot.next(), sheet);
  }
}

function analysoiJaKirjaaTiedosto(tiedosto, sheet) {
  const mimeType = tiedosto.getMimeType();
  const nimi = tiedosto.getName();
  const tiedostoId = tiedosto.getId();

  // Ohitetaan Google Sheets -tiedostot (esim. juuri luomamme tai aiemmat)
  if (mimeType === MimeType.GOOGLE_SHEETS) return;

  Logger.log("Analysoidaan tiedosto: " + nimi);

  let analyysi = {
    milloin: "Tarkistettava",
    kelle: "Tarkistettava",
    mita: "Tarkistettava",
    paljonko: "Tarkistettava"
  };

  try {
    if (mimeType === MimeType.JPEG || mimeType === MimeType.PNG) {
      // Kuvatiedostot lähetetään Vision API:lle
      analyysi = analysoiKuvaOpenAI(tiedosto);
    } else if (mimeType === MimeType.PDF) {
      // PDF-tiedostojen kohdalla puretaan teksti Drive API:n (OCR) avulla
      const teksti = poimiTekstiPDF(tiedostoId, nimi);

      if (teksti && teksti.trim().length > 5) {
        analyysi = analysoiTekstiOpenAI(teksti);
      } else {
        // Jos OCR epäonnistui tai palautti tyhjää, yritetään tiedostonimestä
        Logger.log("PDF:n teksti tyhjä, kokeillaan tiedostonimeä.");
        analyysi = analysoiNimiOpenAI(nimi);
      }
    } else {
      // Muille tiedostotyypeille (esim. Word tms.) kokeillaan pelkkää tiedostonimeä
      analyysi = analysoiNimiOpenAI(nimi);
    }
  } catch (error) {
    Logger.log("Virhe tiedoston " + nimi + " käsittelyssä: " + error);
    // Varmistetaan, ettei skripti kaadu vaan jatkaa ja asettaa "Tarkistettava" tiedostonimestä arvuutellen
    analyysi = analysoiNimiOpenAI(nimi);
  }

  // Kirjataan tulokset taulukkoon
  sheet.appendRow([
    nimi,
    analyysi.milloin || "Tarkistettava",
    analyysi.kelle || "Tarkistettava",
    analyysi.mita || "Tarkistettava",
    analyysi.paljonko || "Tarkistettava",
    tiedostoId
  ]);
}

/**
 * Funktio kuvien (JPG, PNG) lähettämiseksi base64-muodossa OpenAI:lle.
 */
function analysoiKuvaOpenAI(tiedosto) {
  const blob = tiedosto.getBlob();
  const base64Kuva = Utilities.base64Encode(blob.getBytes());
  const mimeType = blob.getContentType();

  const messages = [
    {
      "role": "system",
      "content": "Olet taloushallinnon apulainen. Poimi kuitista tai laskusta seuraavat tiedot: ostopäivä (milloin), maksunsaaja (kelle), mitä ostettu lyhyesti (mita) ja summa euroina (paljonko). Palauta vastaus JSON-muodossa avaimilla 'milloin' (YYYY-MM-DD), 'kelle', 'mita', 'paljonko' (pelkkä numero, esim 12.50 tai 12,50 jolloin palauta 12.50). Jos jotain puuttuu, aseta arvoksi 'Tarkistettava'."
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Analysoi tämä kuitti ja palauta pyydetty JSON."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": `data:${mimeType};base64,${base64Kuva}`
          }
        }
      ]
    }
  ];

  return kutsuOpenAI(messages);
}

/**
 * Muuntaa PDF-tiedoston tekstiksi hyödyntäen Googlen Drive API v3 -rajapinnan OCR-ominaisuutta (Google Doc -muunnos).
 */
function poimiTekstiPDF(tiedostoId, alkuperainenNimi) {
  try {
    const tiedosto = DriveApp.getFileById(tiedostoId);

    // Luodaan uusi Google Doc -tiedosto, kopioimalla PDF, joka pakottaa OCR-muunnoksen.
    const url = "https://www.googleapis.com/drive/v3/files/" + tiedostoId + "/copy";
    const token = ScriptApp.getOAuthToken();

    const metadata = {
      name: "OCR_TEMP_" + alkuperainenNimi,
      mimeType: MimeType.GOOGLE_DOCS
    };

    const options = {
      method: "post",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      payload: JSON.stringify(metadata),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);

    if (response.getResponseCode() !== 200) {
      Logger.log("Drive API kopiointi (OCR) epäonnistui koodilla " + response.getResponseCode() + ": " + response.getContentText());
      return null;
    }

    const data = JSON.parse(response.getContentText());
    const docId = data.id;

    // Avataan uusi dokumentti ja luetaan teksti
    const doc = DocumentApp.openById(docId);
    const teksti = doc.getBody().getText();

    // Poistetaan väliaikainen dokumentti roskakoriin
    DriveApp.getFileById(docId).setTrashed(true);

    return teksti;
  } catch (e) {
    Logger.log("Virhe poimittaessa tekstiä PDF:stä: " + e.toString());
    return null;
  }
}

/**
 * Lähettää puristetun PDF-tekstin OpenAI:lle analysoitavaksi.
 */
function analysoiTekstiOpenAI(teksti) {
  const messages = [
    {
      "role": "system",
      "content": "Olet taloushallinnon apulainen. Poimi kuitin tai laskun tekstisisällöstä seuraavat tiedot: ostopäivä (milloin), maksunsaaja (kelle), mitä ostettu lyhyesti (mita) ja summa euroina (paljonko). Palauta vastaus JSON-muodossa avaimilla 'milloin' (YYYY-MM-DD), 'kelle', 'mita', 'paljonko' (pelkkä numero, esim 12.50). Jos jotain puuttuu, aseta arvoksi 'Tarkistettava'."
    },
    {
      "role": "user",
      "content": "Laskun/kuitin teksti:\n" + teksti
    }
  ];
  return kutsuOpenAI(messages);
}

/**
 * Fallback: Yrittää analysoida tiedostonimen (esim. "LASKU - DNA Oy - 11.12.2014.pdf").
 */
function analysoiNimiOpenAI(nimi) {
  const messages = [
    {
      "role": "system",
      "content": "Olet taloushallinnon apulainen. Et pystynyt lukemaan laskun/kuitin sisältöä, joten arvioi tiedostonimen perusteella ostopäivä (milloin), maksunsaaja (kelle), mitä ostettu (mita) ja summa (paljonko). Palauta vastaus JSON-muodossa avaimilla 'milloin' (YYYY-MM-DD), 'kelle', 'mita', 'paljonko' (pelkkä numero). Ne kentät, joita et tiedostonimestä voi päätellä, aseta arvoon 'Tarkistettava'."
    },
    {
      "role": "user",
      "content": "Tiedoston nimi: " + nimi
    }
  ];
  return kutsuOpenAI(messages);
}

/**
 * Yleinen apufunktio OpenAI API:n kutsumiseen JSON-muotoa käyttäen.
 */
function kutsuOpenAI(messages) {
  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    "model": "gpt-4o-mini",
    "messages": messages,
    "response_format": { "type": "json_object" }
  };

  const options = {
    "method": "post",
    "headers": {
      "Authorization": "Bearer " + OPENAI_API_KEY,
      "Content-Type": "application/json"
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      const content = data.choices[0].message.content;

      try {
        return JSON.parse(content);
      } catch (e) {
        Logger.log("JSON parsiminen epäonnistui vastauksesta: " + content);
      }
    } else {
      Logger.log("OpenAI API virhe: " + response.getContentText());
    }
  } catch (error) {
    Logger.log("Verkkovirhe OpenAI-kutsussa: " + error);
  }

  // Palautetaan oletusarvot vian sattuessa
  return {
    milloin: "Tarkistettava",
    kelle: "Tarkistettava",
    mita: "Tarkistettava",
    paljonko: "Tarkistettava"
  };
}
