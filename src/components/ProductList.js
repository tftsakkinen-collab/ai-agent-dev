import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function ProductList({ products = [], navigation }) {
  const renderItem = ({ item }) => {
    const typeLabel = item.type ? item.type.replace('_', ' ') : 'Varuste';
    const providerName = item.provider?.name || 'GearSpot Oulu';
    const ratingValue = item.rating || 4.9;
    const reviewCount = item.reviewCount || 12;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation?.navigate('ProductDetail', { product: item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameColumn}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.locationRow}>
              <Icon name="map-pin" size={13} color="#556b7a" style={{ marginRight: 4 }} />
              <Text style={styles.provider}>{item.locationName || 'Oulu'} • Tarjoaja: {providerName}</Text>
            </View>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabel}</Text>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.short}</Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingBadge}>
            <Icon name="star" size={13} color="#15948b" style={{ marginRight: 4 }} />
            <Text style={styles.ratingValue}>{ratingValue}</Text>
            <Text style={styles.reviewCount}>({reviewCount} arvostelua)</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>VUOKRA ALKAEN</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        </View>

        {Array.isArray(item.photos) && item.photos.length ? (
          <View style={styles.photoRow}>
            <Icon name="camera" size={12} color="#7a8e9c" style={{ marginRight: 4 }} />
            <Text style={styles.photoCount}>{item.photos.length} laadukasta kuvaa</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  if (products.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="info" size={24} color="#15948b" style={{ marginBottom: 8 }} />
        <Text style={styles.emptyTitle}>Ei hakuehtoja vastaavia lautasaatavuuksia.</Text>
        <Text style={styles.emptySubtitle}>Kokeile valita toinen Oulun noutopiste tai hakutermi.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {products.map((item) => (
        <React.Fragment key={item.id}>
          {renderItem({ item })}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: { marginTop: 8 },
  card: {
    minHeight: 140,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    shadowColor: '#0f2f3d',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nameColumn: { flex: 1, marginRight: 10 },
  name: { fontSize: 17, fontWeight: '800', marginBottom: 4, color: '#0f2f3d' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  provider: { fontSize: 12, color: '#556b7a', fontWeight: '500' },
  typeBadge: { backgroundColor: '#e6f7f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#15948b' },
  typeText: { fontSize: 11, color: '#0e6962', fontWeight: '800', textTransform: 'uppercase' },
  desc: { color: '#4a6070', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#15948b' },
  ratingValue: { color: '#0e6962', fontWeight: '800', fontSize: 13, marginRight: 4 },
  reviewCount: { color: '#15948b', fontSize: 11, fontWeight: '600' },
  priceContainer: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: '#7a8e9c', fontWeight: '700' },
  price: { color: '#15948b', fontSize: 17, fontWeight: '800' },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  photoCount: { color: '#7a8e9c', fontSize: 11, fontWeight: '600' },
  emptyContainer: { padding: 30, alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2ebf0' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0f2f3d', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: '#687e8c', textAlign: 'center' }
});
