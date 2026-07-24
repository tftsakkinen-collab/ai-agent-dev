import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList,Alert, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';

export default function MapSearchScreen({ route, navigation }) {
  const initialQuery = route?.params?.initialQuery || '';
  const [search, setSearch] = useState(initialQuery);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts(initialQuery);
  }, [initialQuery]);

  const fetchProducts = async (query = '') => {
    setLoading(true);
    try {
      const data = await fetchJson(`/api/products`);
      // Simple client side filter for now
      const filtered = query ? data.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.locationName.toLowerCase().includes(query.toLowerCase())) : data;
      setProducts(filtered);
    } catch (error) {
      Alert.alert('Virhe', 'Sijainteja ei voitu hakea. Tarkista palvelin.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchProducts(search);
  };


  return (
    <SafeAreaView style={styles.safe}>      
      <ScreenHeader
        title="Etsi paikka"
        subtitle="Hae Oulun SUP-paikkoja ja valitse sopivin noutopiste"
      />
      <View style={styles.container}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Kirjoita esim. Nallikari tai Hietasaari"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleSearch} disabled={loading}>
            <Text style={styles.primaryButtonText}>{loading ? 'Haetaan...' : 'Hae'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.resultInfo}>{loading ? 'Haetaan...' : `${products.length} sijaintia`}</Text>

        {Platform.OS === 'web' ? (
           <View style={styles.webMapPlaceholder}>
             <Text>Kartta ei tuettu täysin web-selaimessa ilman lisäkonfiguraatiota. Näytetään {products.length} tulosta.</Text>
           </View>
        ) : (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: 65.0121,
              longitude: 25.4651,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {products.map(p => {
               if (p.lat && p.lng) {
                 return <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} description={p.short} onPress={() => navigation.navigate('ProductDetail', { product: p })} />
               }
               return null;
            })}
          </MapView>
        )}

        <FlatList data={products} keyExtractor={(item) => item.id} renderItem={({ item }) => (<TouchableOpacity style={styles.item} onPress={() => navigation.navigate('ProductDetail', { product: item })}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.itemMeta}>{item.locationName} - {item.price}</Text></TouchableOpacity>)} ListEmptyComponent={<Text style={styles.emptyText}>Ei tuloksia hakusanalla: {search}</Text>} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  input: { flex: 1, borderWidth: 1, borderColor: '#d7dfe6', borderRadius: 14, padding: 12, backgroundColor: '#f8fbfc', marginRight: 10 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, paddingHorizontal: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  resultInfo: { color: '#556b7a', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e3eaef' },
  lakeName: { fontSize: 17, fontWeight: '700', marginBottom: 6, color: '#0f2f3d' },
  meta: { color: '#556b7a', marginBottom: 4 },
  secondaryButton: { backgroundColor: '#eef7f5', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
  empty: { color: '#777', marginTop: 20, textAlign: 'center' }
});
