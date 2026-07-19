import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getAdminDisputes, getAuthAuditLogs, resolveAdminDispute } from '../lib/api';

export default function AdminOpsScreen() {
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeStatus, setActiveStatus] = useState('open');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [disputeData, auditData] = await Promise.all([
        getAdminDisputes(activeStatus),
        getAuthAuditLogs(30)
      ]);
      setDisputes(disputeData || []);
      setAuditLogs(auditData || []);
    } catch (error) {
      Alert.alert('Admin-datan haku epäonnistui', error.message);
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolve = async (bookingId, resolutionStatus) => {
    try {
      await resolveAdminDispute(
        bookingId,
        resolutionStatus,
        resolutionStatus === 'resolved' ? 'Resolved via admin panel' : 'Rejected via admin panel',
        true
      );
      Alert.alert('Päivitetty', `Dispute merkittiin tilaan: ${resolutionStatus}`);
      loadData();
    } catch (error) {
      Alert.alert('Disputen päivitys epäonnistui', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Admin Ops" subtitle="Dispute moderation ja auth audit" actionLabel="Päivitä" onAction={loadData} />

        <View style={styles.filterRow}>
          {['open', 'resolved', 'rejected', 'all'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterChip, activeStatus === status && styles.filterChipActive]}
              onPress={() => setActiveStatus(status)}
            >
              <Text style={[styles.filterChipText, activeStatus === status && styles.filterChipTextActive]}>{status}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Disputet ({activeStatus})</Text>
          {loading ? <Text style={styles.metaText}>Ladataan...</Text> : null}
          {!disputes.length ? <Text style={styles.metaText}>Ei disputeja tällä suodattimella.</Text> : null}
          {disputes.map((item) => (
            <View key={item.id} style={styles.disputeItem}>
              <Text style={styles.itemTitle}>{item.product?.name || item.productId}</Text>
              <Text style={styles.metaText}>Booking: {item.id}</Text>
              <Text style={styles.metaText}>Stage: {item.bookingStage} · Resolution: {item.disputeResolutionStatus || 'open'}</Text>
              <Text style={styles.metaText}>Reason: {item.disputeReason || 'n/a'}</Text>
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.successButton} onPress={() => handleResolve(item.id, 'resolved')}>
                  <Text style={styles.successButtonText}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.warnButton} onPress={() => handleResolve(item.id, 'rejected')}>
                  <Text style={styles.warnButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Auth audit (uusin 30)</Text>
          {!auditLogs.length ? <Text style={styles.metaText}>Ei audit-merkintöjä.</Text> : null}
          {auditLogs.map((entry) => (
            <View key={entry.id} style={styles.logItem}>
              <Text style={styles.logEvent}>{entry.event}</Text>
              <Text style={styles.metaText}>{entry.email || '-'} · {entry.ip || '-'}</Text>
              <Text style={styles.metaText}>{new Date(entry.timestamp).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
  filterChip: {
    borderWidth: 1,
    borderColor: '#d8e1e8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#fff'
  },
  filterChipActive: { borderColor: '#15948b', backgroundColor: '#e8f7f5' },
  filterChipText: { color: '#456172', fontWeight: '700', textTransform: 'capitalize' },
  filterChipTextActive: { color: '#0e6d66' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2eaef'
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 10 },
  disputeItem: { borderTopWidth: 1, borderTopColor: '#eef3f6', paddingTop: 12, marginTop: 10 },
  itemTitle: { fontWeight: '700', color: '#0f2f3d', marginBottom: 4 },
  metaText: { color: '#5d7280', lineHeight: 19 },
  actionRow: { flexDirection: 'row', marginTop: 10 },
  successButton: {
    backgroundColor: '#15948b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8
  },
  successButtonText: { color: '#fff', fontWeight: '700' },
  warnButton: {
    backgroundColor: '#fff3f0',
    borderWidth: 1,
    borderColor: '#efc5b8',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  warnButtonText: { color: '#b34b2a', fontWeight: '700' },
  logItem: { borderTopWidth: 1, borderTopColor: '#eef3f6', paddingTop: 10, marginTop: 10 },
  logEvent: { color: '#153848', fontWeight: '700' }
});
