import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import ProductList from '../components/ProductList';
import { fetchJson } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import Icon from 'react-native-vector-icons/Feather';

const quickLocationItems = [
  { icon: 'sun', label: 'Nallikari Beach', query: 'Nallikari Oulu' },
  { icon: 'droplet', label: 'Tuira (Oulujoki)', query: 'Tuiran ranta Oulu' },
  { icon: 'compass', label: 'Hietasaari', query: 'Hietasaari Oulu' },
  { icon: 'map-pin', label: 'Linnanmaa', query: 'Linnanmaa Oulu' }
];

export default function HomeScreen({ navigation }) {
  const { lang, toggleLang, t } = useLanguage();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(t('allLocations'));
  const [sortOrder, setSortOrder] = useState(t('sortPopular'));
  const [selectedDate, setSelectedDate] = useState('Tänään');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('Koko päivä');
  const [loading, setLoading] = useState(true);

  const dateOptions = [
    { label: lang === 'fi' ? 'Tänään' : 'Today', value: 'Tänään' },
    { label: lang === 'fi' ? 'Huomenna' : 'Tomorrow', value: 'Huomenna' },
    { label: lang === 'fi' ? 'Viikonloppu' : 'Weekend', value: 'Viikonloppu' }
  ];

  const timeOptions = [
    { label: lang === 'fi' ? 'Koko päivä' : 'Full Day', value: 'Koko päivä' },
    { label: lang === 'fi' ? 'Aamupäivä (9-13)' : 'Morning (9-13)', value: 'Aamupäivä' },
    { label: lang === 'fi' ? 'Iltapäivä (13-17)' : 'Afternoon (13-17)', value: 'Iltapäivä' },
    { label: lang === 'fi' ? 'Ilta (17-21)' : 'Evening (17-21)', value: 'Ilta' }
  ];

  const howItWorksSteps = [
    {
      step: '1',
      icon: 'search',
      title: lang === 'fi' ? '1. Etsi & valitse lauta' : '1. Search & choose board',
      desc: lang === 'fi' ? 'Selaa Oulun lähimpiä noutopisteitä (Nallikari, Tuira, Hietasaari).' : 'Browse nearby pick-up spots in Oulu.'
    },
    {
      step: '2',
      icon: 'credit-card',
      title: lang === 'fi' ? '2. Varaa & maksa verkossa' : '2. Book & pay securely',
      desc: lang === 'fi' ? 'Valitse kellonaika ja maksa turvallisesti ilman panttimurheita.' : 'Choose time slot and pay securely online.'
    },
    {
      step: '3',
      icon: 'check-circle',
      title: lang === 'fi' ? '3. Nouda lauta & nauti' : '3. Pick up & enjoy',
      desc: lang === 'fi' ? 'Nouda valmis SUP-lauta suoraan rannalta ja lähde vesille!' : 'Pick up your SUP board directly at the beach!'
    }
  ];

  const categoryCards = [
    { title: t('catAllroundTitle'), label: t('catAllroundLabel'), query: 'all-round', icon: 'disc' },
    { title: t('catTouringTitle'), label: t('catTouringLabel'), query: 'touring', icon: 'zap' },
    { title: t('catTandemTitle'), label: t('catTandemLabel'), query: 'kaksikko', icon: 'users' }
  ];

  const guideArticles = [
    { title: t('guide1Title'), slug: 'paras-sup-reitti-oulussa', desc: t('guide1Desc') },
    { title: t('guide2Title'), slug: 'nallikari-vai-hietasaari', desc: t('guide2Desc') }
  ];

  const ouluLocations = [t('allLocations'), 'Nallikari', 'Tuira', 'Hietasaari', 'Kuivasjärvi'];
  const sortOptions = [t('sortPopular'), t('sortCheapest'), t('sortPricy')];

  let filteredProducts = [...products].filter(p => {
    if (selectedLocation !== 'Kaikki' && selectedLocation !== t('allLocations')) {
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

  if (sortOrder === t('sortCheapest') || sortOrder === 'Halvin ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
      return priceA - priceB;
    });
  } else if (sortOrder === t('sortPricy') || sortOrder === 'Kallein ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
      return priceB - priceA;
    });
  }

  useEffect(() => {
    setLoading(true);
    fetchJson('/api/products')
      .then((data) => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });

    fetchJson('/api/categories')
      .then((data) => setCategories(data))
      .catch(() => setCategories(categoryCards));
  }, [lang]);

  const goToSearch = () => {
    navigation.navigate('MapSearch', { initialQuery: searchText.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* TOP HEADER BAR — MIN 44PX HEIGHT FOR ALL TOUCH TARGETS */}
        <View style={styles.topHeaderBar}>
          <Text style={styles.brandTitle}>GearSpot <Text style={styles.brandBadge}>OULU</Text></Text>
          <View style={styles.headerRightGroup}>
            <TouchableOpacity
              style={styles.langToggleBtn}
              onPress={toggleLang}
              activeOpacity={0.7}
              accessibilityLabel="Vaihda kieli FI tai EN"
              accessibilityRole="button"
            >
              <Icon name="globe" size={14} color="#0f2f3d" style={styles.btnIcon} accessibilityLabel="Kielivalitsimen kuvake" />
              <Text style={styles.langToggleText}>{lang === 'fi' ? 'FI | EN' : 'EN | FI'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
              accessibilityLabel="Käyttäjäprofiili"
              accessibilityRole="button"
            >
              <Icon name="user" size={14} color="#ffffff" style={styles.btnIcon} accessibilityLabel="Profiilin kuvake" />
              <Text style={styles.profileBtnText}>{t('profile')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FOUNDING HOST BANNER */}
        <TouchableOpacity
          style={styles.bannerTealCard}
          onPress={() => navigation.navigate('BecomeHost')}
          activeOpacity={0.8}
          accessibilityLabel="Founding Host tarjous"
          accessibilityRole="button"
        >
          <View style={styles.bannerHeaderRow}>
            <Icon name="award" size={16} color="#00e5d1" style={{ marginRight: 6 }} accessibilityLabel="Palkintokuvake" />
            <Text style={styles.bannerBadgeText}>{t('foundingHostBadge')}</Text>
          </View>
          <Text style={styles.bannerTitleText}>{t('foundingHostHeadline')}</Text>
          <Text style={styles.bannerSubtitleText}>{t('foundingHostSub')}</Text>
        </TouchableOpacity>

        {/* HERO BANNER WITH DATE & TIME SEARCH FILTER */}
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Icon name="sun" size={14} color="#00e5d1" style={{ marginRight: 6 }} accessibilityLabel="Aurinkokuvake" />
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
              accessibilityLabel="Hae lautoja tai noutopistettä"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={goToSearch}
              activeOpacity={0.8}
              accessibilityLabel="Aloita haku"
              accessibilityRole="button"
            >
              <Icon name="search" size={14} color="#ffffff" style={{ marginRight: 6 }} accessibilityLabel="Hakukuvake" />
              <Text style={styles.searchButtonText}>{t('searchBtn')}</Text>
            </TouchableOpacity>
          </View>

          {/* 2. DATE & TIME SEARCH FILTER */}
          <Text style={styles.chipSectionLabel}>
            {lang === 'fi' ? '📅 Milloin haluat suppailla?' : '📅 When do you want to paddle?'}
          </Text>
          <View style={styles.dateTimeContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              {dateOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dateTimeChip, selectedDate === opt.value && styles.dateTimeChipActive]}
                  onPress={() => setSelectedDate(opt.value)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Päivämäärä ${opt.label}`}
                  accessibilityRole="button"
                >
                  <Icon name="calendar" size={12} color={selectedDate === opt.value ? '#ffffff' : '#b2c8d4'} style={{ marginRight: 4 }} />
                  <Text style={[styles.dateTimeChipText, selectedDate === opt.value && styles.dateTimeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {timeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dateTimeChip, selectedTimeSlot === opt.value && styles.dateTimeChipActive]}
                  onPress={() => setSelectedTimeSlot(opt.value)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Kellonaika ${opt.label}`}
                  accessibilityRole="button"
                >
                  <Icon name="clock" size={12} color={selectedTimeSlot === opt.value ? '#ffffff' : '#b2c8d4'} style={{ marginRight: 4 }} />
                  <Text style={[styles.dateTimeChipText, selectedTimeSlot === opt.value && styles.dateTimeChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* OULU LOCATION CHIPS */}
          <Text style={styles.chipSectionLabel}>{t('popularLocations')}</Text>
          <View style={styles.chipRow}>
            {quickLocationItems.map((item) => (
              <TouchableOpacity
                key={item.query}
                style={styles.locationChip}
                onPress={() => navigation.navigate('MapSearch', { initialQuery: item.query })}
                activeOpacity={0.7}
                accessibilityLabel={`Noutopiste ${item.label}`}
                accessibilityRole="button"
              >
                <Icon name={item.icon || 'map-pin'} size={14} color="#ffffff" style={{ marginRight: 6 }} accessibilityLabel="Noutopisteen kuvake" />
                <Text style={styles.locationChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 3. "MITEN SE TOIMII" - 3-STEP VISUAL EXPLANATION SECTION */}
        <View style={styles.howItWorksCard} accessibilityLabel="Miten GearSpot toimii">
          <Text style={styles.howItWorksTitle}>
            {lang === 'fi' ? '💡 Miten GearSpot toimii?' : '💡 How GearSpot Works'}
          </Text>
          <View style={styles.howItWorksRow}>
            {howItWorksSteps.map((s) => (
              <View key={s.step} style={styles.howItWorksStepItem}>
                <View style={styles.stepIconCircle}>
                  <Icon name={s.icon} size={18} color="#15948b" accessibilityLabel={s.title} />
                </View>
                <Text style={styles.stepItemTitle}>{s.title}</Text>
                <Text style={styles.stepItemDesc}>{s.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* GROUP BOOKING BANNER */}
        <TouchableOpacity
          style={styles.bannerTealCard}
          onPress={() => navigation.navigate('GroupBooking')}
          activeOpacity={0.8}
          accessibilityLabel="Ryhmävarausosio"
          accessibilityRole="button"
        >
          <View style={styles.bannerHeaderRow}>
            <Icon name="users" size={16} color="#00e5d1" style={{ marginRight: 6 }} accessibilityLabel="Ryhmäkuvake" />
            <Text style={styles.bannerBadgeText}>{t('groupBookingBadge')}</Text>
          </View>
          <Text style={styles.bannerTitleText}>{t('groupBookingTitle')}</Text>
          <Text style={styles.bannerSubtitleText}>{t('groupBookingSub')}</Text>
        </TouchableOpacity>

        {/* GUIDES SECTION */}
        <Text style={styles.sectionTitle}>{t('guidesTitle')}</Text>
        <View style={styles.guideRow}>
          {guideArticles.map((article) => (
            <TouchableOpacity
              key={article.slug}
              style={styles.guideCard}
              onPress={() => navigation.navigate('GuideArticle', { slug: article.slug })}
              activeOpacity={0.7}
              accessibilityLabel={article.title}
              accessibilityRole="button"
            >
              <View style={styles.guideHeaderRow}>
                <Icon name="book-open" size={15} color="#15948b" style={{ marginRight: 6 }} accessibilityLabel="Opaskuvake" />
                <Text style={styles.guideTitle}>{article.title}</Text>
              </View>
              <Text style={styles.guideDesc}>{article.desc}</Text>
              <Text style={styles.guideLink}>{t('readGuide')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORY CARDS */}
        <Text style={styles.sectionTitle}>{t('categoriesTitle')}</Text>
        <View style={styles.categoryRow}>
          {categoryCards.map((category) => (
            <TouchableOpacity
              key={category.title}
              style={styles.categoryCard}
              onPress={() => navigation.navigate('MapSearch', { initialQuery: category.query })}
              activeOpacity={0.7}
              accessibilityLabel={category.title}
              accessibilityRole="button"
            >
              <View style={styles.categoryHeaderRow}>
                <Icon name={category.icon || 'disc'} size={15} color="#15948b" style={{ marginRight: 6 }} accessibilityLabel="Kategoriakuvake" />
                <Text style={styles.categoryTitle}>{category.title}</Text>
              </View>
              <Text style={styles.categoryLabel}>{category.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* LOCATION & SORT FILTERS */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionTitle}>{t('pickUpLabel')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {ouluLocations.map(loc => (
              <TouchableOpacity
                key={loc}
                style={[styles.filterChip, (selectedLocation === loc || (selectedLocation === 'Kaikki' && loc === t('allLocations'))) && styles.filterChipActive]}
                onPress={() => setSelectedLocation(loc)}
                activeOpacity={0.7}
                accessibilityLabel={`Noutopistesuodatin ${loc}`}
                accessibilityRole="button"
              >
                <Text style={[styles.filterChipText, (selectedLocation === loc || (selectedLocation === 'Kaikki' && loc === t('allLocations'))) && styles.filterChipTextActive]}>{loc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>{t('sortLabel')}</Text>
            {sortOptions.map(sort => (
              <TouchableOpacity
                key={sort}
                style={[styles.sortChip, sortOrder === sort && styles.sortChipActive]}
                onPress={() => setSortOrder(sort)}
                activeOpacity={0.7}
                accessibilityLabel={`Järjestä ${sort}`}
                accessibilityRole="button"
              >
                <Text style={[styles.sortChipText, sortOrder === sort && styles.sortChipTextActive]}>{sort}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PRODUCTS SECTION WITH SKELETON LOADING & DEMAND LEAD CAPTURE */}
        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>{t('availableBoards')} ({filteredProducts.length})</Text>
          <Text style={styles.sectionSubtitle}>{t('includesGear')}</Text>
        </View>

        <ProductList
          products={filteredProducts}
          loading={loading}
          selectedLocation={selectedLocation}
          navigation={navigation}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },

  // TOP HEADER BAR — MIN 44PX HEIGHT FOR ALL TOUCH TARGETS
  topHeaderBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: '#0f2f3d' },
  brandBadge: { color: '#15948b', fontSize: 13, fontWeight: '800' },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langToggleBtn: {
    minHeight: 44,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },

  // UNIFIED BRAND TEAL BANNER (#15948b)
  bannerTealCard: {
    minHeight: 60,
    backgroundColor: '#15948b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  bannerHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  bannerBadgeText: { color: '#00e5d1', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, uppercase: true },
  bannerTitleText: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  bannerSubtitleText: { color: '#e6f7f5', fontSize: 12, lineHeight: 17 },

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
  heroSubtitle: { fontSize: 13, color: '#b2c8d4', lineHeight: 19, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchButtonText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  // DATE & TIME SEARCH FILTER
  dateTimeContainer: { marginBottom: 14 },
  dateTimeChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)'
  },
  dateTimeChipActive: { backgroundColor: '#15948b', borderColor: '#15948b' },
  dateTimeChipText: { color: '#b2c8d4', fontSize: 12, fontWeight: '600' },
  dateTimeChipTextActive: { color: '#ffffff', fontWeight: '800' },

  chipSectionLabel: { fontSize: 12, color: '#90aab8', fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  // LOCATION CHIPS — MIN 44PX HEIGHT
  locationChip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)'
  },
  locationChipText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  // 3. "MITEN SE TOIMII" - 3-STEP EXPLANATION SECTION STYLES
  howItWorksCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    shadowColor: '#0f2f3d',
    shadowOpacity: 0.04,
    shadowRadius: 10
  },
  howItWorksTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 14 },
  howItWorksRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  howItWorksStepItem: { flex: 1, alignItems: 'center' },
  stepIconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e6f7f5', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#15948b' },
  stepItemTitle: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', textAlign: 'center', marginBottom: 4 },
  stepItemDesc: { fontSize: 11, color: '#687e8c', textAlign: 'center', lineHeight: 15 },

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

  // CATEGORY CARDS — MIN 44PX AREA
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

  // FILTER SECTION — MIN 44PX CHIPS FOR ALL FILTER AND SORT BUTTONS
  filterSection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#e2ebf0' },
  filterSectionTitle: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', marginBottom: 8, uppercase: true },
  horizontalScroll: { marginBottom: 12 },
  filterChip: {
    minHeight: 44,
    paddingVertical: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#f0f4f7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sortChipActive: { backgroundColor: '#0f2f3d' },
  sortChipText: { color: '#556b7a', fontSize: 13, fontWeight: '600' },
  sortChipTextActive: { color: '#ffffff', fontWeight: '700' },
  productsHeader: { marginBottom: 6 }
});
