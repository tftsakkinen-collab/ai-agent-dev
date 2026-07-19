import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { searchProducts } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  searchBox: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
    marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', marginBottom: 12, gap: 8 },
  filterButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#CCC' },
  filterButtonActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterButtonText: { fontSize: 12, color: '#333', fontWeight: '500' },
  filterButtonTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  productName: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { fontSize: 11, color: '#666' },
  value: { fontSize: 12, color: '#333', fontWeight: '500' },
  priceTag: { backgroundColor: '#34C759', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  priceTagText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  viewButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  viewButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: '#999' },
});

export default function SearchAndFilterScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    loadInitialProducts();
  }, []);

  const loadInitialProducts = async () => {
    try {
      setLoading(true);
      const data = await searchProducts('');
      setProducts(data || []);
      setLoading(false);
    } catch (error) {
      console.warn('Tuotteiden lataus epäonnistui:', error.message);
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.length < 2) {
      loadInitialProducts();
      return;
    }

    try {
      setLoading(true);
      const data = await searchProducts(query);
      setProducts(data || []);
      setLoading(false);
    } catch (error) {
      console.warn('Haku epäonnistui:', error.message);
      setLoading(false);
    }
  };

  const filteredProducts = category === 'all'
    ? products
    : products.filter((p) => p.category === category || p.type === category);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
        <ScreenHeader title="Etsi tuotteita" subtitle="Löydä mitä tarvitset" />

        <TextInput
          style={styles.searchBox}
          placeholder="🔍 Etsi tuotetta tai isäntää..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />

        <View style={styles.filterRow}>
          {['all', 'sup', 'kayak', 'rental'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, category === f && styles.filterButtonActive]}
              onPress={() => setCategory(f)}
            >
              <Text style={[styles.filterButtonText, category === f && styles.filterButtonTextActive]}>
                {f === 'all' ? 'Kaikki' : f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'Tuotteita ei löytynyt' : 'Lataa tuotteita...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { marginHorizontal: 0 }]}>
              <Text style={styles.productName}>{item.name}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Isäntä</Text>
                <Text style={styles.value}>{item.ownerEmail ? item.ownerEmail.split('@')[0] : 'Gearspot'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Sijainti</Text>
                <Text style={styles.value}>{item.location || 'Oulu'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Hinta / pv</Text>
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>€{item.pricePerDay || 0}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>Näytä yksityiskohdat →</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 0 }}
          scrollEnabled
        />
      )}
    </SafeAreaView>
  );
}
