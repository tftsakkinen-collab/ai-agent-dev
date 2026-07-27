import React, { useState, useEffect } from 'react';
import { useProducts, fetchJson } from '../lib/api';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import ProductList from '../components/ProductList';


const quickSearchItems = [
  { label: 'SUP-laudat Oulussa', query: 'oulu sup' },
  { label: 'Aloittelijalle', query: 'aloittelija sup oulu' },
  { label: 'Touring-laudat', query: 'touring sup oulu' }
];

const quickLocationItems = [
  { label: 'Nallikari', query: 'Nallikari Oulu' },
  { label: 'Hietasaari', query: 'Hietasaari Oulu' },
  { label: 'Tuiran ranta', query: 'Tuiran ranta Oulu' }
];

const categoryCards = [
  { title: 'Oulu SUP Pilot', label: 'Vuokraa SUP-lauta paikalliselta', query: 'oulu sup' }
];

export default function HomeScreen({ navigation }) {
  const { data: products = [] } = useProducts();
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('Kaikki');
  const [sortOrder, setSortOrder] = useState('Suosituimmat');

  useEffect(() => {
    fetchJson('/api/categories').then(setCategories).catch(() => setCategories(categoryCards));
  }, []);

  const locations = ['Kaikki', 'Nallikari', 'Hietasaari', 'Kuivasjärvi'];
  const sortOptions = ['Suosituimmat', 'Halvin ensin', 'Kallein ensin'];

  let filteredProducts = [...products].filter(p => {
    if (selectedLocation !== 'Kaikki') {
      if (p.locationName !== selectedLocation && !(selectedLocation === 'Nallikari' && p.searchTerms && p.searchTerms.includes('nallikari')) && !(selectedLocation === 'Hietasaari' && p.searchTerms && p.searchTerms.includes('hietasaari')) && !(selectedLocation === 'Kuivasjärvi' && p.searchTerms && p.searchTerms.includes('kuivasjärvi'))) return false;
    }
    return true;
  });

  if (sortOrder === 'Halvin ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, ''));
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, ''));
      return priceA - priceB;
    });
  } else if (sortOrder === 'Kallein ensin') {
    filteredProducts = filteredProducts.sort((a, b) => {
      const priceA = parseInt((a.price || '').replace(/[^0-9]/g, ''));
      const priceB = parseInt((b.price || '').replace(/[^0-9]/g, ''));
      return priceB - priceA;
    });
  }



  const goToSearch = () => {
    navigation.navigate('MapSearch', { initialQuery: searchText.trim() });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title={null}
          subtitle="SUP-lautojen vertaisvuokraus Oulun alueella"
          actionLabel="Profiili"
          onAction={() => navigation.navigate('Profile')}
        />

        <View style={styles.heroCard}>
          <Text style={styles.heroText}>Kesän pilotti on rajattu Ouluun: löydä SUP-lauta paikalliselta vuokraajalta ja varaa helposti.</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Hae Oulun SUP-lautoja"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
              onSubmitEditing={goToSearch}
            />
            <TouchableOpacity
              style={[styles.primaryButton, !searchText.trim() && styles.buttonDisabled]}
              onPress={goToSearch}
              disabled={!searchText.trim()}
            >
              <Text style={styles.primaryButtonText}>Etsi</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>Nopeat haut</Text>
          <View style={styles.chipRow}>
            {quickSearchItems.map((item) => (
              <TouchableOpacity
                key={item.query}
                style={styles.chip}
                onPress={() => navigation.navigate('MapSearch', { initialQuery: item.query })}
              >
                <Text style={styles.chipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Suosituimmat paikat</Text>
          <View style={styles.chipRow}>
            {quickLocationItems.map((item) => (
              <TouchableOpacity
                key={item.query}
                style={[styles.chip, styles.chipSecondary]}
                onPress={() => navigation.navigate('MapSearch', { initialQuery: item.query })}
              >
                <Text style={styles.chipSecondaryText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Kategoriat</Text>
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


        <View style={styles.locationFilterRow}>
          {sortOptions.map(sort => (
            <TouchableOpacity
              key={sort}
              style={[styles.sortFilterBtn, sortOrder === sort && styles.sortFilterBtnActive]}
              onPress={() => setSortOrder(sort)}
            >
              <Text style={[styles.sortFilterText, sortOrder === sort && styles.sortFilterTextActive]}>{sort}</Text>
            </TouchableOpacity>
          ))}
        </View>


        <View style={styles.locationFilterRow}>
          {locations.map(loc => (
            <TouchableOpacity
              key={loc}
              style={[styles.locationFilterBtn, selectedLocation === loc && styles.locationFilterBtnActive]}
              onPress={() => setSelectedLocation(loc)}
            >
              <Text style={[styles.locationFilterText, selectedLocation === loc && styles.locationFilterTextActive]}>{loc}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.locationFilterRow}>
          {sortOptions.map(sort => (
            <TouchableOpacity
              key={sort}
              style={[styles.sortFilterBtn, sortOrder === sort && styles.sortFilterBtnActive]}
              onPress={() => setSortOrder(sort)}
            >
              <Text style={[styles.sortFilterText, sortOrder === sort && styles.sortFilterTextActive]}>{sort}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Suositut SUP-laudat Oulussa</Text>
        <ProductList products={filteredProducts} navigation={navigation} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navButton: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: '#d7dee5' },
  navButtonText: { color: '#15948b', fontWeight: '700' },
  heroCard: { backgroundColor: '#fff', borderRadius: 18, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: '#e5ecf1' },
  heroText: { fontSize: 16, color: '#556b7a', lineHeight: 22, marginBottom: 18 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#d7dfe6', borderRadius: 16, padding: 14, marginRight: 10, backgroundColor: '#f8fbfc' },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f2f3d' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  chip: { backgroundColor: '#15948b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, marginRight: 10, marginBottom: 10 },
  chipSecondary: { backgroundColor: '#e8f6f5', borderWidth: 1, borderColor: '#cce7e4' },
  chipText: { color: '#fff', fontWeight: '700' },
  chipSecondaryText: { color: '#134c50', fontWeight: '700' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  categoryCard: { width: '48%', backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5ecf1' },
  categoryTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8, color: '#0f2f3d' },
  categoryLabel: { fontSize: 14, color: '#556b7a', lineHeight: 20 },
  locationFilterRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, gap: 10, flexWrap: 'wrap' },
  locationFilterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#eef2f5', borderWidth: 1, borderColor: '#d7dfe6' },
  locationFilterBtnActive: { backgroundColor: '#15948b', borderColor: '#15948b' },
  locationFilterText: { color: '#556b7a', fontWeight: '600' },
  locationFilterTextActive: { color: '#ffffff', fontWeight: 'bold' },
  sortFilterBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, backgroundColor: '#f0f4f8', borderWidth: 1, borderColor: '#d7dfe6' },
  sortFilterBtnActive: { backgroundColor: '#284451', borderColor: '#284451' },
  sortFilterText: { color: '#556b7a', fontSize: 13, fontWeight: '600' },
  sortFilterTextActive: { color: '#ffffff', fontWeight: 'bold' }
});
