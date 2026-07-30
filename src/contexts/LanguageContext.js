import React, { createContext, useContext, useState } from 'react';

const LanguageContext = createContext();

export const translations = {
  fi: {
    heroTitle: 'Vuokraa laadukas SUP-lauta helposti Oulussa',
    heroSubtitle: 'Nouda lauta suoraan rannalta (Nallikari, Tuira, Hietasaari) tai varaa retkelle mukaan.',
    searchPlaceholder: '🔍 Hae lautaa tai noutopaikkaa (esim. Nallikari)...',
    searchBtn: 'Etsi',
    popularLocations: '📍 Suositut noutopaikat Oulussa:',
    categoriesTitle: '🏄 Lautatyypit & Kategoriat',
    availableBoards: '🔥 Vapaat SUP-laudat',
    includesGear: 'Sisältää mela, liivit, karkuremmi & kuljetuskassi',
    groupBookingTitle: '🎉 Ryhmävaraus & Polttarit',
    groupBookingSubtitle: 'Varaa useampi SUP-lauta ja aloittelijaperehdytys ryhmällesi (4–20 hlö)',
    foundingHostBadge: '🎁 FOUNDING HOST -ETU: 0 % VÄLITYSPALKKIO ENSIMMÄISILLE ISÄNTILE!',
    profile: 'Profiili',
    login: 'Kirjaudu',
    bookNow: 'Varaa nyt',
    priceFrom: 'Vuokra alkaen'
  },
  en: {
    heroTitle: 'Rent Premium SUP Boards Easily in Oulu',
    heroSubtitle: 'Pick up directly at the beach (Nallikari, Tuira, Hietasaari) or book for a day trip.',
    searchPlaceholder: '🔍 Search board or location (e.g. Nallikari)...',
    searchBtn: 'Search',
    popularLocations: '📍 Popular Pick-up Locations in Oulu:',
    categoriesTitle: '🏄 Board Types & Categories',
    availableBoards: '🔥 Available SUP Boards',
    includesGear: 'Includes paddle, life vest, leash & carry bag',
    groupBookingTitle: '🎉 Group Booking & Team Events',
    groupBookingSubtitle: 'Book multiple SUP boards and group instructor for 4–20 people',
    foundingHostBadge: '🎁 FOUNDING HOST PROMO: 0% COMMISSION FOR FIRST HOSTS!',
    profile: 'Profile',
    login: 'Login',
    bookNow: 'Book Now',
    priceFrom: 'Price from'
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
