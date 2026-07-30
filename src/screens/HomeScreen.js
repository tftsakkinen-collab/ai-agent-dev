import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import ProductList from '../components/ProductList';
import { fetchJson } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

const quickLocationItems = [
  { label: '🏖️ Nallikari Beach', query: 'Nallikari Oulu' },
  { label: '🌊 Tuira (Oulujoki)', query: 'Tuiran ranta Oulu' },
  { label: '🌲 Hietasaari', query: 'Hietasaari Oulu' },
  { label: '🏫 Linnanmaa', query: 'Linnanmaa Oulu' }
];

const categoryCards = [
  { title: '🏄 All-round SUP', label: 'Täydellinen aloittelijalle & rennolle retkelle Oulujoella', query: 'all-round' },
  { title: '⚡ Touring SUP', label: 'Nopeampi ja pidempi malli pidemmille reiteille & Nallikariin', query: 'touring' },
  { title: '👨‍👩‍👧 Kaksikko / Perhe-SUP', label: 'Isompi kantavuus 2 henkilölle tai retkivarusteille', query: 'kaksikko' }
];

export default function HomeScreen({ navigation }) {
  const { lang, toggleLang, t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Kaikki');
  const [sortOrder, setSortOrder] = useState('Suosituimmat');

  const ouluLocations = ['Kaikki Oulun noutopisteet', 'Nallikari', 'Tuira', 'Hietasaari', 'Kuivasjärvi'];
  const sortOptions = ['Suosituimmat', 'Halvin ensin', 'Kallein ensin'];

  let filteredProducts = [...products].filter(p => {
    if (selectedLocation !== 'Kaikki' && selectedLocation !== 'Kaikki Oulun noutopisteet') {
      const locMatch = p.locationName && p.locationName.toLowerCase().includes(selectedLocation.toLowerCase());
      const searchMatch = p.searchTerms && p.searchTerms.toLowerCase().includes(selectedLocation.toLowerCase());
      if (!locMatch && !searchMatch) return false;
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      const nameMatch = p.name && p.name.toLowerCase().includes(q);
      const descMatch = p.short && p.short.toLowerCase().includes(q);
      const locMatch = p.locationName && p.locationName.toLowerCase().includes(q);
      if (!nameMatch && !descMatch && !locMatch) return false;
    }

    return true;
  });

  if (sortOrder === 'Halvin ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
      return priceA - priceB;
    });
  } else if (sortOrder === 'Kallein ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
      return priceB - priceA;
    });
  }

  useEffect(() => {
    fetchJson('/api/products')
      .then((data) => setProducts(data))
      .catch(() => setProducts([]));

    fetchJson('/api/categories')
      .then((data) => setCategories(data))
      .catch(() => setCategories(categoryCards));
  }, []);

  const goToSearch = () => {
    navigation.navigate('MapSearch', { initialQuery: searchText.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* HEADER WITH LANGUAGE TOGGLE & PROFILE BUTTON */}
        <View style={styles.topHeaderBar}>
          <Text style={styles.brandTitle}>GearSpot <Text style={styles.brandBadge}>OULU</Text></Text>
          <View style={styles.headerRightGroup}>
            <TouchableOpacity style={styles.langToggleBtn} onPress={toggleLang}>
              <Text style={styles.langToggleText}>{lang === 'fi' ? '🌐 FI | EN' : '🌐 EN | FI'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
              <Text style={styles.profileBtnText}>👤 {t('profile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 12. FOUNDING HOST 0% PROMO BANNER */}
        <TouchableOpacity
          style={styles.foundingHostCard}
          onPress={() => navigation.navigate('BecomeHost')}
        >
          <Text style={styles.foundingHostTitle}>🎁 FOUNDING HOST -ETU OULUSSA!</Text>
          <Text style={styles.foundingHostText}>
            Liity ensimmäisten vuokraajien joukkoon: <Text style={styles.boldText}>0 % välityspalkkio</Text> koko kesän 2026 ajan! Lisää oma lautasi 1 minuutissa →
          </Text>
        </TouchableOpacity>

        {/* HERO BANNER */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Text style={styles.heroBadgeText}>🌊 Oulun SUP-kesä 2026</Text>
          </View>

          <Text style={styles.heroTitle}>{t('heroTitle')}</Text>
          <Text style={styles.heroSubtitle}>{t('heroSubtitle')}</Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder={t('searchPlaceholder')}
              placeholderTextColor="#8699a6"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={goToSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={goToSearch}>
              <Text style={styles.searchButtonText}>{t('searchBtn')}</Text>
            </TouchableOpacity>
          </View>

          {/* OULU LOCATIONS CHIPS */}
          <Text style={styles.chipSectionLabel}>{t('popularLocations')}</Text>
          <View style={styles.chipRow}>
            {quickLocationItems.map((item) => (
              <TouchableOpacity
                key={item.query}
                style={styles.locationChip}
                onPress={() => navigation.navigate('MapSearch', { initialQuery: item.query })}
              >
                <Text style={styles.locationChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 10. GROUP BOOKING & BACHELOR PARTY CARD */}
        <TouchableOpacity
          style={styles.groupBookingBanner}
          onPress={() => navigation.navigate('GroupBooking')}
        >
          <View style={styles.groupBannerLeft}>
            <Text style={styles.groupBannerBadge}>🎉 UUTTA OULUSSA</Text>
            <Text style={styles.groupBannerTitle}>Ryhmävaraus &amp; Polttarit (4–25 hlö)</Text>
            <Text style={styles.groupBannerSubtitle}>Varaa useampi lauta + aloittelijaperehdytys &amp; kuljetus yhdellä laakilla →</Text>
          </View>
        </TouchableOpacity>

        {/* CATEGORY CARDS */}
        <Text style={styles.sectionTitle}>{t('categoriesTitle')}</Text>
        <View style={styles.categoryRow}>
          {(categories.length ? categories : categoryCards).map((category) => (
            <TouchableOpacity
              key={category.id || category.title}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('MapSearch', { initialQuery: category.query })}
            >
              <Text style={styles.categoryTitle}>{category.title}</Text>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOCATION & SORT FILTERS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Noutopiste Oulussa:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {ouluLocations.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.filterChip, selectedLocation === loc && styles.filterChipActive]}
                onPress={() => setSelectedLocation(loc)}
              >
                <Text style={[styles.filterChipText, selectedLocation === loc && styles.filterChipTextActive]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>Järjestä:</Text>
            {sortOptions.map(sort => (
              <TouchableOpacity
                key={sort}
                style={[styles.sortChip, sortOrder === sort && styles.sortChipActive]}
                onPress={() => setSortOrder(sort)}
              >
                <Text style={[styles.sortChipText, sortOrder === sort && styles.sortChipTextActive]}>{sort}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PRODUCTS SECTION WITH GOLD STARS */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>{t('availableBoards')} ({filteredProducts.length})</Text>
          <Text style={styles.sectionSubtitle}>{t('includesGear')}</Text>
        </View>

        <ProductList products={filteredProducts} navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#0f2f3d' },
  brandBadge: { color: '#15948b', fontSize: 13, fontWeight: '800' },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langToggleBtn: { backgroundColor: '#ffffff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d2dfa6' },
  langToggleText: { color: '#0f2f3d', fontSize: 12, fontWeight: '800' },
  profileBtn: { backgroundColor: '#15948b', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  profileBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
  foundingHostCard: {
    backgroundColor: '#fff8e6',
    borderColor: '#ffd666',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14
  },
  foundingHostTitle: { fontSize: 12, fontWeight: '900', color: '#b45309', letterSpacing: 0.5, marginBottom: 4 },
  foundingHostText: { fontSize: 12, color: '#78350f', lineHeight: 17 },
  boldText: { fontWeight: '800', color: '#0f2f3d' },
  heroCard: {
    backgroundColor: '#0f2f3d',
    borderRadius: 22,
    padding: 22,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4
  },
  badgeRow: { marginBottom: 8 },
  heroBadgeText: { color: '#00e5d1', fontSize: 12, fontWeight: '800', uppercase: true, letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', lineHeight: 28, marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: '#b2c8d4', lineHeight: 19, marginBottom: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#214757',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: '#ffffff',
    color: '#0f2f3d',
    fontSize: 13,
    fontWeight: '600'
  },
  searchButton: { backgroundColor: '#15948b', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  searchButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  chipSectionLabel: { fontSize: 12, color: '#90aab8', fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  locationChip: { backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  locationChipText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  groupBookingBanner: {
    backgroundColor: '#15948b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  groupBannerLeft: {},
  groupBannerBadge: { color: '#a7f3d0', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, uppercase: true, marginBottom: 4 },
  groupBannerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  groupBannerSubtitle: { color: '#e6f7f5', fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 10, marginTop: 4 },
  sectionSubtitle: { fontSize: 12, color: '#687e8c', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 16 },
  categoryCard: { width: '48%', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2ebf0' },
  categoryTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4, color: '#0f2f3d' },
  categoryLabel: { fontSize: 11, color: '#687e8c', lineHeight: 16 },
  filterSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2ebf0' },
  filterSectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', marginBottom: 8, uppercase: true },
  horizontalScroll: { marginBottom: 12 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f0f4f7', marginRight: 8, borderWidth: 1, borderColor: '#d2dfa6' },
  filterChipActive: { backgroundColor: '#15948b', borderColor: '#15948b' },
  filterChipText: { color: '#4a6070', fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '800' },
  sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  sortLabel: { fontSize: 11, color: '#7a8e9c', fontWeight: '700', marginRight: 4 },
  sortChip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#f0f4f7' },
  sortChipActive: { backgroundColor: '#0f2f3d' },
  sortChipText: { color: '#556b7a', fontSize: 11, fontWeight: '600' },
  sortChipTextActive: { color: '#ffffff', fontWeight: '700' },
  productsHeader: { marginBottom: 6 }
});
