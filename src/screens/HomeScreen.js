import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import ProductList from '../components/ProductList';
import { fetchJson } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/Feather';

const quickLocationItems = [
  { icon: 'sun', label: 'Nallikari Beach', query: 'Nallikari Oulu' },
  { icon: 'droplet', label: 'Tuira (Oulujoki)', query: 'Tuiran ranta Oulu' },
  { label: 'Hietasaari', icon: 'compass', query: 'Hietasaari Oulu' },
  { label: 'Linnanmaa', icon: 'map-pin', query: 'Linnanmaa Oulu' }
];

const categoryCards = [
  { title: 'All-round SUP', label: 'Täydellinen aloittelijalle & rennolle retkelle Oulujoella', query: 'all-round', icon: 'disc' },
  { title: 'Touring SUP', label: 'Nopeampi ja pidempi malli pidemmille reiteille & Nallikariin', query: 'touring', icon: 'zap' },
  { title: 'Kaksikko / Perhe-SUP', label: 'Isompi kantavuus 2 henkilölle tai retkivarusteille', query: 'kaksikko', icon: 'users' }
];

const guideArticles = [
  { title: 'Paras SUP-reitti Oulussa (3 Reittiä)', slug: 'paras-sup-reitti-oulussa', desc: 'Reittiohjeet Tuiran suistoon, Nallikariin ja Kuivasjärvelle.' },
  { title: 'Nallikari vai Hietasaari — Kumpa Sopii Sinulle?', slug: 'nallikari-vai-hietasaari', desc: 'Vertailussa tuuliolosuhteet, rannat ja palvelut.' }
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
        {/* HEADER WITH MIN 44PX TOUCH TARGETS */}
        <View style={styles.topHeaderBar}>
          <Text style={styles.brandTitle}>GearSpot <Text style={styles.brandBadge}>OULU</Text></Text>
          <View style={styles.headerRightGroup}>
            <TouchableOpacity style={styles.langToggleBtn} onPress={toggleLang} activeOpacity={0.7}>
              <Icon name="globe" size={14} color="#0f2f3d" style={styles.btnIcon} />
              <Text style={styles.langToggleText}>{lang === 'fi' ? 'FI | EN' : 'EN | FI'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')} activeOpacity={0.7}>
              <Icon name="user" size={14} color="#ffffff" style={styles.btnIcon} />
              <Text style={styles.profileBtnText}>{t('profile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. CLARIFIED FOUNDING HOST BANNER WITH UNIFIED WARM AMBER COLOR */}
        <TouchableOpacity
          style={styles.foundingHostCard}
          onPress={() => navigation.navigate('BecomeHost')}
          activeOpacity={0.8}
        >
          <View style={styles.foundingHostHeader}>
            <Icon name="award" size={16} color="#d97706" style={{ marginRight: 6 }} />
            <Text style={styles.foundingHostTitle}>FOUNDING HOST -ETU OULUSSA</Text>
          </View>
          <Text style={styles.foundingHostText}>
            <Text style={styles.boldText}>0 % välityspalkkiota ensimmäiset 3 kuukautta uustunnuksille!</Text> Liity vuokraajaksi tänään ja ansaitse 100 % tulostasi →
          </Text>
        </TouchableOpacity>

        {/* HERO BANNER WITH UNIFIED TEAL/NAVY COLORS */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Icon name="sun" size={14} color="#00e5d1" style={{ marginRight: 6 }} />
            <Text style={styles.heroBadgeText}>Oulun SUP-kesä 2026</Text>
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
            <TouchableOpacity style={styles.searchButton} onPress={goToSearch} activeOpacity={0.8}>
              <Text style={styles.searchButtonText}>{t('searchBtn')}</Text>
            </TouchableOpacity>
          </View>

          {/* OULU LOCATION CHIPS WITH MIN 44PX HEIGHT */}
          <Text style={styles.chipSectionLabel}>{t('popularLocations')}</Text>
          <View style={styles.chipRow}>
            {quickLocationItems.map((item) => (
              <TouchableOpacity
                key={item.query}
                style={styles.locationChip}
                onPress={() => navigation.navigate('MapSearch', { initialQuery: item.query })}
                activeOpacity={0.7}
              >
                <Icon name={item.icon || 'map-pin'} size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.locationChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* GROUP BOOKING BANNER WITH UNIFIED TEAL BRAND COLOR & 44PX TOUCH AREA */}
        <TouchableOpacity
          style={styles.groupBookingBanner}
          onPress={() => navigation.navigate('GroupBooking')}
          activeOpacity={0.8}
        >
          <View style={styles.groupBannerLeft}>
            <View style={styles.groupBannerHeaderRow}>
              <Icon name="users" size={16} color="#00e5d1" style={{ marginRight: 6 }} />
              <Text style={styles.groupBannerBadge}>RYHMÄVARAUS &amp; POLTTARIT</Text>
            </View>
            <Text style={styles.groupBannerTitle}>Ryhmävaraus (4–25 henkilöä)</Text>
            <Text style={styles.groupBannerSubtitle}>Varaa useampi lauta, ohjaaja &amp; kuljetus rannalle yhdellä laakilla →</Text>
          </View>
        </TouchableOpacity>

        {/* GUIDES SECTION WITH CLEAN FEATHER ICONS */}
        <Text style={styles.sectionTitle}>Oulun SUP-Oppaat &amp; Reitit</Text>
        <View style={styles.guideRow}>
          {guideArticles.map((article) => (
            <TouchableOpacity
              key={article.slug}
              style={styles.guideCard}
              onPress={() => navigation.navigate('GuideArticle', { slug: article.slug })}
              activeOpacity={0.7}
            >
              <View style={styles.guideHeaderRow}>
                <Icon name="book-open" size={15} color="#15948b" style={{ marginRight: 6 }} />
                <Text style={styles.guideTitle}>{article.title}</Text>
              </View>
              <Text style={styles.guideDesc}>{article.desc}</Text>
              <Text style={styles.guideLink}>Lue opas →</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORY CARDS */}
        <Text style={styles.sectionTitle}>{t('categoriesTitle')}</Text>
        <View style={styles.categoryRow}>
          {(categories.length ? categories : categoryCards).map((category) => (
            <TouchableOpacity
              key={category.id || category.title}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('MapSearch', { initialQuery: category.query })}
              activeOpacity={0.7}
            >
              <View style={styles.categoryHeaderRow}>
                <Icon name={category.icon || 'disc'} size={15} color="#15948b" style={{ marginRight: 6 }} />
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOCATION & SORT FILTERS WITH MIN 44PX TOUCH TARGETS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>Noutopiste Oulussa:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {ouluLocations.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.filterChip, selectedLocation === loc && styles.filterChipActive]}
                onPress={() => setSelectedLocation(loc)}
                activeOpacity={0.7}
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
                activeOpacity={0.7}
              >
                <Text style={[styles.sortChipText, sortOrder === sort && styles.sortChipTextActive]}>{sort}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PRODUCTS SECTION */}
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

  // TOP HEADER BAR WITH MIN 44PX TOUCH TARGETS
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#0f2f3d' },
  brandBadge: { color: '#15948b', fontSize: 13, fontWeight: '800' },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langToggleBtn: {
    minHeight: 44,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d2dfa6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnIcon: { marginRight: 6 },
  langToggleText: { color: '#0f2f3d', fontSize: 13, fontWeight: '800' },
  profileBtn: {
    minHeight: 44,
    backgroundColor: '#15948b',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'center'
  },
  profileBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // UNIFIED SECONDARY ACCENT (WARM AMBER / GOLD) FOR PROMO BANNER
  foundingHostCard: {
    minHeight: 54,
    backgroundColor: '#fff8e6',
    borderColor: '#ffd666',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    justify: 'center'
  },
  foundingHostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  foundingHostTitle: { fontSize: 12, fontWeight: '900', color: '#d97706', letterSpacing: 0.5 },
  foundingHostText: { fontSize: 12, color: '#78350f', lineHeight: 18 },
  boldText: { fontWeight: '800', color: '#0f2f3d' },

  // HERO CARD
  heroCard: {
    backgroundColor: '#0f2f3d',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  heroBadgeText: { color: '#00e5d1', fontSize: 12, fontWeight: '800', uppercase: true, letterSpacing: 0.5 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff', lineHeight: 28, marginBottom: 8 },
  heroSubtitle: { fontSize: 13, color: '#b2c8d4', lineHeight: 19, marginBottom: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  searchInput: {
    flex: 1,
    minHeight: 46,
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
  searchButton: {
    minHeight: 46,
    backgroundColor: '#15948b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  chipSectionLabel: { fontSize: 12, color: '#90aab8', fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // LOCATION CHIPS WITH MIN 44PX HEIGHT
  locationChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  locationChipText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // GROUP BOOKING BANNER WITH MIN 44PX AREA
  groupBookingBanner: {
    minHeight: 60,
    backgroundColor: '#15948b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  groupBannerLeft: {},
  groupBannerHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  groupBannerBadge: { color: '#00e5d1', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, uppercase: true },
  groupBannerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
  groupBannerSubtitle: { color: '#e6f7f5', fontSize: 12, lineHeight: 17 },

  // GUIDES
  guideRow: { marginBottom: 16 },
  guideCard: {
    minHeight: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2ebf0'
  },
  guideHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  guideTitle: { fontSize: 14, fontWeight: '800', color: '#0f2f3d' },
  guideDesc: { fontSize: 11, color: '#687e8c', marginBottom: 8, lineHeight: 16 },
  guideLink: { fontSize: 12, color: '#15948b', fontWeight: '800' },

  // CATEGORY CARDS WITH MIN 44PX AREA
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 10, marginTop: 4 },
  sectionSubtitle: { fontSize: 12, color: '#687e8c', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 16 },
  categoryCard: {
    width: '48%',
    minHeight: 80,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    justifyContent: 'center'
  },
  categoryHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  categoryTitle: { fontSize: 14, fontWeight: '800', color: '#0f2f3d' },
  categoryLabel: { fontSize: 11, color: '#687e8c', lineHeight: 16 },

  // FILTER SECTION WITH MIN 44PX CHIPS
  filterSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2ebf0' },
  filterSectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', marginBottom: 8, uppercase: true },
  horizontalScroll: { marginBottom: 12 },
  filterChip: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f0f4f7',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#d2dfa6',
    justifyContent: 'center',
    alignItems: 'center'
  },
  filterChipActive: { backgroundColor: '#15948b', borderColor: '#15948b' },
  filterChipText: { color: '#4a6070', fontSize: 13, fontWeight: '700' },
  filterChipTextActive: { color: '#ffffff', fontWeight: '800' },

  sortRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  sortLabel: { fontSize: 12, color: '#7a8e9c', fontWeight: '700', marginRight: 4 },
  sortChip: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f0f4f7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sortChipActive: { backgroundColor: '#0f2f3d' },
  sortChipText: { color: '#556b7a', fontSize: 12, fontWeight: '600' },
  sortChipTextActive: { color: '#ffffff', fontWeight: '700' },
  productsHeader: { marginBottom: 6 }
});
