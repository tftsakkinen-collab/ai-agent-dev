import React, { useEffect, useState } from 'react';
import { SafeAreaView, Text, StyleSheet, View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import ProductList from '../components/ProductList';
import { fetchJson } from '../lib/api';

const quickSearchItems = [
  { label: 'SUP-lauta', query: 'sup' },
  { label: 'Sähköpyörä', query: 'ebike' },
  { label: 'Hiihtovarusteet', query: 'ski' }
];

const quickLocationItems = [
  { label: 'Tuusula', query: 'Tuusulanjärvi' },
  { label: 'Levi', query: 'Levi ski resort' },
  { label: 'Helsinki', query: 'Helsinki Baana' }
];

const categoryCards = [
  { title: 'Vesillä', label: 'SUP ja melonta', query: 'sup' },
  { title: 'Kaupunki', label: 'Sähköpyörät ja retkipyörät', query: 'ebike' },
  { title: 'Talvi', label: 'Hiihto ja laskettelu', query: 'ski' }
];

export default function HomeScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchText, setSearchText] = useState('');

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
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title={null}
          subtitle="Löydä ja varaa varusteet läheltäsi"
          actionLabel="Profiili"
          onAction={() => navigation.navigate('Profile')}
        />

        <View style={styles.heroCard}>
          <Text style={styles.heroText}>Selaa ja varaa lähelläsi olevia vuokrauskohteita nopeasti yhdellä haulla.</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Hae SUP, pyörä tai hiihto"
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

        <Text style={styles.sectionTitle}>Suositut varusteet</Text>
        <ProductList products={products} navigation={navigation} />
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
  categoryLabel: { fontSize: 14, color: '#556b7a', lineHeight: 20 }
});
