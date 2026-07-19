import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getBookingHistory } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  productName: { fontSize: 13, fontWeight: '600', color: '#333' },
  label: { fontSize: 11, color: '#666' },
  value: { fontSize: 12, color: '#333', fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 6 },
  badgeApproved: { backgroundColor: '#D4EDDA' },
  badgeCompleted: { backgroundColor: '#CCE5FF' },
  badgeDisputed: { backgroundColor: '#F8D7DA' },
  badgeText: { fontSize: 11, fontWeight: '500' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: '#999' },
});

export default function BookingHistoryScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const data = await getBookingHistory();
      setBookings(data || []);
      setLoading(false);
    } catch (error) {
      console.warn('Varaushistorian lataus epäonnistui:', error.message);
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'all') return true;
    return b.bookingStage === filter;
  });

  const getBadgeStyle = (stage) => {
    if (stage === 'completed') return [styles.badge, styles.badgeCompleted];
    if (stage === 'disputed') return [styles.badge, styles.badgeDisputed];
    return [styles.badge, styles.badgeApproved];
  };

  const getStageLabel = (stage) => {
    const labels = {
      approved: 'Hyväksytty',
      awaiting_handoff: 'Odottaa siirtoa',
      in_use: 'Käytössä',
      awaiting_return: 'Odottaa palautusta',
      returned: 'Palautettu',
      completed: 'Valmis',
      disputed: 'Riita',
    };
    return labels[stage] || stage;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
        <ScreenHeader title="Varaushistoria" subtitle={`${bookings.length} varaus(ta)`} />

        <View style={styles.filterRow}>
          {['all', 'completed', 'in_use', 'disputed'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterButtonActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterButtonText, filter === f && styles.filterButtonTextActive]}>
                {f === 'all' ? 'Kaikki' : getStageLabel(f)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {filteredBookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Ei varauksia</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { marginHorizontal: 16 }]}>
              <Text style={styles.productName}>{item.product?.name || 'Tuote'}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Tila</Text>
                <View style={getBadgeStyle(item.bookingStage)}>
                  <Text style={styles.badgeText}>{getStageLabel(item.bookingStage)}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Luotu</Text>
                <Text style={styles.value}>{new Date(item.createdAt).toLocaleDateString('fi-FI')}</Text>
              </View>
              {item.completedAt && (
                <View style={styles.row}>
                  <Text style={styles.label}>Valmis</Text>
                  <Text style={styles.value}>{new Date(item.completedAt).toLocaleDateString('fi-FI')}</Text>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 0, paddingVertical: 12 }}
          scrollEnabled
        />
      )}
    </SafeAreaView>
  );
}
