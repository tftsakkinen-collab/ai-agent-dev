import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getPaymentHistory } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: '#555' },
  summaryValue: { fontSize: 14, fontWeight: '700', color: '#1976D2' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  description: { fontSize: 12, fontWeight: '600', color: '#333' },
  label: { fontSize: 11, color: '#666' },
  amount: { fontSize: 13, fontWeight: '700', color: '#333' },
  amountPositive: { color: '#34C759' },
  amountNegative: { color: '#FF3B30' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeCompleted: { backgroundColor: '#D4EDDA' },
  badgeRefunded: { backgroundColor: '#FFF3CD' },
  badgeText: { fontSize: 11, fontWeight: '500' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: '#999' },
});

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    try {
      const data = await getPaymentHistory();
      setPayments(data?.payments || []);
      setSummary(data?.summary);
      setLoading(false);
    } catch (error) {
      console.warn('Maksusistorian lataus epäonnistui:', error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#1976D2" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} scrollEnabled={false}>
        <ScreenHeader title="Maksuhistoria" subtitle="Kaikki tapahtumat" />

        {summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Kokonaistulot (30d)</Text>
              <Text style={styles.summaryValue}>€{summary.totalEarnings?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Palautukset</Text>
              <Text style={[styles.summaryValue, styles.amountNegative]}>-€{summary.totalRefunds?.toFixed(2) || '0.00'}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Netto</Text>
              <Text style={[styles.summaryValue, { color: '#34C759' }]}>€{summary.netEarnings?.toFixed(2) || '0.00'}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {payments.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Ei maksutapahtumia</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.card, { marginHorizontal: 16 }]}>
              <View style={styles.row}>
                <Text style={styles.description}>{item.description || 'Maksu'}</Text>
                <Text style={[styles.amount, item.type === 'refund' ? styles.amountNegative : styles.amountPositive]}>
                  {item.type === 'refund' ? '-' : '+'}€{Math.abs(item.amount).toFixed(2)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Päivämäärä</Text>
                <Text style={{ fontSize: 11, color: '#666' }}>{new Date(item.createdAt).toLocaleDateString('fi-FI')}</Text>
              </View>
              {item.status && (
                <View style={[styles.badge, item.status === 'completed' ? styles.badgeCompleted : styles.badgeRefunded]}>
                  <Text style={styles.badgeText}>{item.status === 'completed' ? '✓ Valmis' : '⟲ Palautettu'}</Text>
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
