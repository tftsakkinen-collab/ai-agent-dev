import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

export default function ProductDetail({ route, navigation }) {
  const { product } = route.params || {};

  if (!product) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Tuotetta ei löydy.</Text>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Tuote"
          subtitle={product.name}
          actionLabel="Varaa"
          onAction={() => navigation.navigate('Booking', { product })}
        />
        <View style={styles.card}>
          {Array.isArray(product.photos) && product.photos[0] ? (
            <Image source={{ uri: product.photos[0] }} style={styles.heroImage} resizeMode="cover" />
          ) : null}
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.type}>{product.type?.replace('_', ' ') || 'Varuste'}</Text>
          <Text style={styles.price}>{product.price}</Text>
          <Text style={styles.rating}>{product.rating ? `${product.rating}/5` : 'Ei arvosteluja vielä'}</Text>
          <Text style={styles.short}>{product.short}</Text>
          {product.locationName ? <Text style={styles.provider}>Sijainti: {product.locationName}</Text> : null}
          <Text style={styles.provider}>Tarjoaja: {product.provider?.name || 'Gearspot'}</Text>
        </View>
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('ReviewScreen', { targetType: 'product', targetId: product.id, targetName: product.name })}>
            <Text style={styles.secondaryButtonText}>Arvostelut</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryButton} onPress={() => navigation.navigate('ProviderDetail', { providerId: product.providerId })}>
            <Text style={styles.tertiaryButtonText}>Katso tarjoaja</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#e3eaef' },
  heroImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12, backgroundColor: '#e8eef2' },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 6, color: '#0f2f3d' },
  type: { fontSize: 14, color: '#15948b', fontWeight: '700', marginBottom: 10, textTransform: 'capitalize' },
  price: { fontSize: 18, fontWeight: '700', marginBottom: 6, color: '#1f3d55' },
  rating: { fontSize: 14, color: '#15948b', marginBottom: 12, fontWeight: '700' },
  short: { fontSize: 15, color: '#556b7a', lineHeight: 22, marginBottom: 12 },
  provider: { fontSize: 14, color: '#556b7a' },
  buttonGroup: { marginTop: 20 },
  secondaryButton: { backgroundColor: '#eef7f5', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
  tertiaryButton: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#d7dfe6' },
  tertiaryButtonText: { color: '#0f2f3d', fontWeight: '700' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  emptyText: { color: '#556b7a', fontSize: 16 }
});
