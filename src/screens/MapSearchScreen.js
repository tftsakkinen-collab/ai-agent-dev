import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Linking, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';

export default function MapSearchScreen({ route }) {
  const initialQuery = route?.params?.initialQuery || '';
  const [search, setSearch] = useState(initialQuery);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocations(initialQuery);
  }, [initialQuery]);

  const fetchLocations = async (query = '') => {
    setLoading(true);
    try {
      const data = await fetchJson(`/api/locations?q=${encodeURIComponent(query)}`);
      setLocations(data);
    } catch (error) {
      Alert.alert('Virhe', 'Sijainteja ei voitu hakea. Tarkista palvelin.');
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchLocations(search);
  };

  const openGoogleMaps = (query) => {
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Virhe', 'Ei voitu avata Google Mapsia.');
    });
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

        <Text style={styles.resultInfo}>{loading ? 'Haetaan...' : `${locations.length} sijaintia`}</Text>
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Ladataan...' : 'Ei hakutuloksia.'}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.lakeName}>{item.name}</Text>
              <Text style={styles.meta}>{item.category} · {item.place}</Text>
              <Text style={styles.meta}>{item.productCount ?? item.products?.length ?? 0} tuotetta saatavilla</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => openGoogleMaps(item.query)}>
                <Text style={styles.secondaryButtonText}>Avaa Google Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        />
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
