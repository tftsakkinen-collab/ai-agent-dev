import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { exportBookingsAsCSV, exportMetricsAsCSV, getAdminPilotMetrics } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  description: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 12 },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  buttonSecondary: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonSecondaryText: { color: '#333', fontSize: 14, fontWeight: 'bold' },
  successCard: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  successText: { fontSize: 13, color: '#155724', fontWeight: '500' },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: { fontSize: 12, color: '#1565C0', lineHeight: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 10,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

export default function DataExportScreen() {
  const [exporting, setExporting] = useState(null);
  const [lastExport, setLastExport] = useState(null);
  const [metrics, setMetrics] = useState(null);

  React.useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await getAdminPilotMetrics(30);
      setMetrics(data);
    } catch (error) {
      console.warn('Metriikoiden haku epäonnistui:', error.message);
    }
  };

  const handleExportBookings = async () => {
    try {
      setExporting('bookings');
      const csv = await exportBookingsAsCSV();
      const filename = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
      setLastExport({ type: 'Varaukset', filename });
      Alert.alert('Onnistui', `CSV viety: ${filename}\n\nTiedosto on valmis lataukseen.`);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportMetrics = async () => {
    try {
      setExporting('metrics');
      const csv = await exportMetricsAsCSV();
      const filename = `metrics-${new Date().toISOString().split('T')[0]}.csv`;
      setLastExport({ type: 'Mittarit', filename });
      Alert.alert('Onnistui', `CSV viety: ${filename}\n\nTiedosto on valmis lataukseen.`);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setExporting(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Data-vienti" subtitle="Vie pilot-metriikat ja varaukset" />

        {metrics && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{metrics.totals?.bookings || 0}</Text>
              <Text style={styles.statLabel}>Varaukset</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{metrics.metrics?.bookingCompletionRatePct || 0}%</Text>
              <Text style={styles.statLabel}>Valmistumis%</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{metrics.metrics?.averageReviewScore || '-'}</Text>
              <Text style={styles.statLabel}>Avg Review</Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>📊 Vientiä saatavilla</Text>

        <View style={styles.card}>
          <Text style={styles.description}>
            Vie kaikki varaustiedot CSV-muodossa. Sisältää varauksen tilan, osapuolet, maksut ja riita-asiat.
          </Text>
          <TouchableOpacity
            style={[styles.button, exporting === 'bookings' && { opacity: 0.5 }]}
            onPress={handleExportBookings}
            disabled={exporting === 'bookings'}
          >
            <Text style={styles.buttonText}>
              {exporting === 'bookings' ? 'Viedään...' : '📥 Vie varaukset (CSV)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.description}>
            Vie pilot-mittarit (completion-aste, dispute-aste, reviews, resoluutioaika). 30 päivän kaudelta.
          </Text>
          <TouchableOpacity
            style={[styles.button, exporting === 'metrics' && { opacity: 0.5 }]}
            onPress={handleExportMetrics}
            disabled={exporting === 'metrics'}
          >
            <Text style={styles.buttonText}>
              {exporting === 'metrics' ? 'Viedään...' : '📥 Vie mittarit (CSV)'}
            </Text>
          </TouchableOpacity>
        </View>

        {lastExport && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>
              ✓ {lastExport.type} viety: {lastExport.filename}
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 <Text style={{ fontWeight: 'bold' }}>Viennit:</Text> CSV-tiedostot sisältävät kaikki pilot-tiedot analyysiin ja
            raportoitiin. Voit avata ne taulukkolaskentaohjelmalla.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>📋 Saatavilla olevat vientivälineet</Text>

        <View style={styles.card}>
          <Text style={styles.description}>
            ✓ Varausten yksityiskohdat{'\n'}✓ Pilot-mittarit (30d){'\n'}✓ Riita-asiat ja todisteet{'\n'}✓ Arvostelut ja näkyvyys{'\n'}
            ✓ Hallinnollinen audit-loki
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
