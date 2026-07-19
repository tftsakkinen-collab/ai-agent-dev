import React from 'react';
import { Text, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProductList({ products = [], navigation }) {
  const renderItem = ({ item }) => {
    const typeLabel = item.type ? item.type.replace('_', ' ') : 'Varuste';
    const providerName = item.provider?.name || 'Gearspot';
    const ratingLabel = item.rating ? `${item.rating}/5` : 'Ei arvosteluja';

    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation?.navigate('ProductDetail', { product: item })}>
        <View style={styles.cardHeader}>
          <View style={styles.nameColumn}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.provider}>{providerName}</Text>
          </View>
          <Text style={styles.type}>{typeLabel}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.price}>{item.price}</Text>
          <Text style={styles.rating}>{ratingLabel}</Text>
        </View>
        <Text style={styles.desc}>{item.short}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={products}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      ListEmptyComponent={<Text style={styles.empty}>Ei tuotteita saatavilla.</Text>}
      contentContainerStyle={products.length === 0 ? styles.emptyContainer : null}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e6eef3', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  nameColumn: { flex: 1, marginRight: 10 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  provider: { fontSize: 12, color: '#556b7a' },
  type: { fontSize: 12, color: '#0077cc', textTransform: 'capitalize' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  price: { color: '#333', fontWeight: '700' },
  rating: { color: '#15948b', fontWeight: '700' },
  desc: { color: '#666', lineHeight: 20 },
  empty: { textAlign: 'center', color: '#777', marginTop: 32 },
  emptyContainer: { flex: 1, justifyContent: 'center' }
});
