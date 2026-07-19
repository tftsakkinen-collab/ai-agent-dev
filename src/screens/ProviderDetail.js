import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';

export default function ProviderDetail({ route, navigation }) {
  const { providerId } = route.params || {};
  const [provider, setProvider] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadProvider = async () => {
      try {
        const data = await fetchJson(`/api/providers/${providerId}`);
        setProvider(data);
      } catch (e) {
        setError(true);
      }
    };
    loadProvider();
  }, [providerId]);

  if (error) return <View style={styles.messageContainer}><Text style={styles.message}>Tarjoajaa ei löydy.</Text></View>;
  if (!provider) return <View style={styles.messageContainer}><Text style={styles.message}>Ladataan...</Text></View>;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Tarjoaja"
          subtitle={provider.name}
          actionLabel="Kirjoita arvostelu"
          onAction={() => navigation.navigate('ReviewScreen', { targetType: 'provider', targetId: provider.id, targetName: provider.name })}
        />
        <View style={styles.headerCard}>
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.description}>{provider.description}</Text>
          <Text style={styles.meta}>Arvio: {provider.rating ? `${provider.rating}/5` : 'Ei arvosteluja'}</Text>
          <Text style={styles.meta}>Tuotteita: {provider.products?.length ?? 0}</Text>
        </View>
        <Text style={styles.section}>Saatavilla olevat tuotteet</Text>
        <FlatList
          data={provider.products || []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Ei tuotteita näkyvissä.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.productCard} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productType}>{item.type?.replace('_', ' ')}</Text>
              <Text style={styles.productPrice}>{item.price}</Text>
            </TouchableOpacity>
          )}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  headerCard: { backgroundColor: '#fff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 18 },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 8, color: '#0f2f3d' },
  description: { color: '#556b7a', lineHeight: 22, marginBottom: 12 },
  meta: { color: '#15948b', marginBottom: 6, fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f2f3d' },
  productCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 12 },
  productName: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  productType: { color: '#556b7a', marginBottom: 6 },
  productPrice: { color: '#15948b', fontWeight: '700' },
  empty: { color: '#777', textAlign: 'center', marginTop: 12 },
  messageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  message: { color: '#556b7a' }
});
