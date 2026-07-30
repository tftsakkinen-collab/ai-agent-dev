import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const translations = {
  fi: {
    // Header & Navigation
    heroTitle: 'Vuokraa laadukas SUP-lauta helposti Oulussa',
    heroSubtitle: 'Nouda lauta suoraan rannalta (Nallikari, Tuira, Hietasaari) tai varaa retkelle mukaan.',
    searchPlaceholder: 'Hae lautaa tai noutopaikkaa (esim. Nallikari)...',
    searchBtn: 'Etsi',
    popularLocations: 'Suositut noutopaikat Oulussa:',
    profile: 'Profiili',
    login: 'Kirjaudu',
    bookNow: 'Varaa nyt',
    priceFrom: 'VUOKRA ALKAEN',

    // Founding Host Banner
    foundingHostBadge: 'FOUNDING HOST -ETU OULUSSA',
    foundingHostHeadline: '0 % välityspalkkiota ensimmäiset 3 kuukautta uustunnuksille!',
    foundingHostSub: 'Liity vuokraajaksi tänään ja ansaitse 100 % tulostasi →',

    // Group Booking Banner
    groupBookingBadge: 'RYHMÄVARAUS & POLTTARIT',
    groupBookingTitle: 'Ryhmävaraus (4–25 henkilöä)',
    groupBookingSub: 'Varaa useampi lauta, ohjaaja & kuljetus rannalle yhdellä laakilla →',

    // SEO Guides Section
    guidesTitle: 'Oulun SUP-Oppaat & Reitit',
    guide1Title: 'Paras SUP-reitti Oulussa (3 Reittiä)',
    guide1Desc: 'Reittiohjeet Tuiran suistoon, Nallikariin ja Kuivasjärvelle.',
    guide2Title: 'Nallikari vai Hietasaari — Kumpa Sopii Sinulle?',
    guide2Desc: 'Vertailussa tuuliolosuhteet, rannat ja palvelut.',
    readGuide: 'Lue opas →',

    // Board Categories
    categoriesTitle: 'Lautatyypit & Kategoriat',
    catAllroundTitle: 'All-round SUP',
    catAllroundLabel: 'Täydellinen aloittelijalle & rennolle retkelle Oulujoella',
    catTouringTitle: 'Touring SUP',
    catTouringLabel: 'Nopeampi ja pidempi malli pidemmille reiteille & Nallikariin',
    catTandemTitle: 'Kaksikko / Perhe-SUP',
    catTandemLabel: 'Isompi kantavuus 2 henkilölle tai retkivarusteille',

    // Filters & Sort
    pickUpLabel: 'Noutopiste Oulussa:',
    allLocations: 'Kaikki Oulun noutopisteet',
    sortLabel: 'Järjestä:',
    sortPopular: 'Suosituimmat',
    sortCheapest: 'Halvin ensin',
    sortPricy: 'Kallein ensin',

    // Products & Empty state
    availableBoards: 'Vapaat SUP-laudat',
    includesGear: 'Sisältää mela, liivit, karkuremmi & kuljetuskassi',
    emptyTitle: 'Ei hakuehtoja vastaavia lautasaatavuuksia.',
    emptySub: 'Kokeile valita toinen Oulun noutopiste tai hakutermi.',
    reviewsCount: 'arvostelua',
    photosCount: 'laadukasta kuvaa',
    providerTag: 'Tarjoaja',

    // Report Issue Button
    reportIssue: 'Ilmoita ongelmasta'
  },
  en: {
    // Header & Navigation
    heroTitle: 'Rent Premium SUP Boards Easily in Oulu',
    heroSubtitle: 'Pick up directly at the beach (Nallikari, Tuira, Hietasaari) or book for a day trip.',
    searchPlaceholder: 'Search board or location (e.g. Nallikari)...',
    searchBtn: 'Search',
    popularLocations: 'Popular Pick-up Locations in Oulu:',
    profile: 'Profile',
    login: 'Login',
    bookNow: 'Book Now',
    priceFrom: 'RENTAL FROM',

    // Founding Host Banner
    foundingHostBadge: 'FOUNDING HOST PROMO IN OULU',
    foundingHostHeadline: '0% commission for the first 3 months for new accounts!',
    foundingHostSub: 'Become a host today and earn 100% of your rental income →',

    // Group Booking Banner
    groupBookingBadge: 'GROUP BOOKINGS & EVENTS',
    groupBookingTitle: 'Group Booking (4–25 people)',
    groupBookingSub: 'Book multiple boards, instructor & beach delivery all in one go →',

    // SEO Guides Section
    guidesTitle: 'Oulu SUP Guides & Routes',
    guide1Title: 'Best SUP Routes in Oulu (3 Routes)',
    guide1Desc: 'Route directions for Tuira estuary, Nallikari, and Kuivasjärvi.',
    guide2Title: 'Nallikari vs Hietasaari — Which Suits You Best?',
    guide2Desc: 'Comparing wind conditions, beaches, and amenities.',
    readGuide: 'Read guide →',

    // Board Categories
    categoriesTitle: 'Board Types & Categories',
    catAllroundTitle: 'All-round SUP',
    catAllroundLabel: 'Perfect for beginners & relaxed trips on Oulu River',
    catTouringTitle: 'Touring SUP',
    catTouringLabel: 'Faster and longer board for longer routes & Nallikari',
    catTandemTitle: 'Tandem / Family SUP',
    catTandemLabel: 'Higher capacity for 2 people or expedition gear',

    // Filters & Sort
    pickUpLabel: 'Pick-up Location in Oulu:',
    allLocations: 'All Oulu Pick-up Spots',
    sortLabel: 'Sort by:',
    sortPopular: 'Most Popular',
    sortCheapest: 'Cheapest First',
    sortPricy: 'Highest Price First',

    // Products & Empty state
    availableBoards: 'Available SUP Boards',
    includesGear: 'Includes paddle, life vest, leash & carry bag',
    emptyTitle: 'No SUP board availability matching your criteria.',
    emptySub: 'Try selecting another Oulu pick-up location or search term.',
    reviewsCount: 'reviews',
    photosCount: 'high quality photos',
    providerTag: 'Host',

    // Report Issue Button
    reportIssue: 'Report an issue'
  }
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('fi');

  const toggleLang = () => {
    setLang((prev) => (prev === 'fi' ? 'en' : 'fi'));
  };

  const t = (key) => translations[lang]?.[key] || translations['fi']?.[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
