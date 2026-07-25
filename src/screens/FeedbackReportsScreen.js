import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const statuses = ['new', 'in_progress', 'resolved'];
const priorities = ['low', 'medium', 'high'];

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function FeedbackReportsScreen() {
  const { showToast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const loadReports = async () => {
    try {
      setError('');
      const data = await fetchJson('/api/feedback-reports');
      setReports(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  const updateReport = async (reportId, payload) => {
    const updated = await fetchJson(`/api/feedback-reports/${reportId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setReports((current) => current.map((report) => (report.id === reportId ? updated : report)));
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredReports = reports.filter((report) => {
    const statusOk = statusFilter === 'all' || (report.status || 'new') === statusFilter;
    const priorityOk = priorityFilter === 'all' || (report.priority || 'medium') === priorityFilter;
    return statusOk && priorityOk;
  });

  const exportSummary = async () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      filters: { status: statusFilter, priority: priorityFilter },
      total: filteredReports.length,
      reports: filteredReports.map((item) => ({
        id: item.id,
        message: item.message,
        status: item.status || 'new',
        priority: item.priority || 'medium',
        routeName: item.routeName || '-',
        createdAt: item.createdAt || null
      }))
    };

    const text = JSON.stringify(payload, null, 2);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      showToast('Yhteenveto kopioitu', 'Raporttien yhteenveto kopioitiin leikepöydälle.');
      return;
    }

    showToast('Yhteenveto', text.slice(0, 1800));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScreenHeader
          title="Raportit"
          subtitle="Uusimmat virheet ja palautteet testaajilta"
        />

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Raporttien lataus epaonnistui</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); loadReports(); }}>
              <Text style={styles.retryButtonText}>Yrita uudelleen</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.toolbarCard}>
          <Text style={styles.controlLabel}>Status-suodatin</Text>
          <View style={styles.controlRow}>
            {['all', ...statuses].map((value) => (
              <TouchableOpacity
                key={`status-filter-${value}`}
                style={[styles.controlButton, statusFilter === value && styles.controlButtonActive]}
                onPress={() => setStatusFilter(value)}
              >
                <Text style={[styles.controlButtonText, statusFilter === value && styles.controlButtonTextActive]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.controlLabel}>Priority-suodatin</Text>
          <View style={styles.controlRow}>
            {['all', ...priorities].map((value) => (
              <TouchableOpacity
                key={`priority-filter-${value}`}
                style={[styles.controlButton, priorityFilter === value && styles.controlButtonActive]}
                onPress={() => setPriorityFilter(value)}
              >
                <Text style={[styles.controlButtonText, priorityFilter === value && styles.controlButtonTextActive]}>{value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.exportButton} onPress={exportSummary}>
            <Text style={styles.exportButtonText}>Kopioi triage-yhteenveto</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredReports}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); loadReports(); }} />}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {loading ? 'Ladataan raportteja...' : 'Ei raportteja viela.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.message}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, styles[`priority_${item.priority || 'medium'}`]]}>
                  <Text style={styles.badgeText}>priority: {item.priority || 'medium'}</Text>
                </View>
                <View style={[styles.badge, styles[`status_${item.status || 'new'}`]]}>
                  <Text style={styles.badgeText}>status: {item.status || 'new'}</Text>
                </View>
              </View>
              <Text style={styles.cardMeta}>Reitti: {item.routeName || '-'}</Text>
              <Text style={styles.cardMeta}>Konteksti: {item.context || '-'}</Text>
              <Text style={styles.cardMeta}>Aika: {formatDate(item.createdAt)}</Text>
              {item.reporterEmail ? <Text style={styles.cardMeta}>Lahettaja: {item.reporterEmail}</Text> : null}
              {item.currentUrl ? <Text style={styles.cardMeta}>URL: {item.currentUrl}</Text> : null}
              {item.viewport ? <Text style={styles.cardMeta}>Viewport: {item.viewport}</Text> : null}
              {item.userAgent ? <Text style={styles.cardDetail}>User-Agent: {item.userAgent}</Text> : null}
              {item.errorDetails ? <Text style={styles.cardDetail}>Virhetiedot: {item.errorDetails}</Text> : null}
              <Text style={styles.controlLabel}>Paivita tila</Text>
              <View style={styles.controlRow}>
                {statuses.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.controlButton, item.status === value && styles.controlButtonActive]}
                    onPress={() => updateReport(item.id, { status: value })}
                  >
                    <Text style={[styles.controlButtonText, item.status === value && styles.controlButtonTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.controlLabel}>Paivita prioriteetti</Text>
              <View style={styles.controlRow}>
                {priorities.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.controlButton, item.priority === value && styles.controlButtonActive]}
                    onPress={() => updateReport(item.id, { priority: value })}
                  >
                    <Text style={[styles.controlButtonText, item.priority === value && styles.controlButtonTextActive]}>{value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { flex: 1, padding: 16, paddingBottom: 28 },
  errorCard: { backgroundColor: '#fff3f1', borderWidth: 1, borderColor: '#f1c8c0', borderRadius: 16, padding: 16, marginBottom: 16 },
  errorTitle: { color: '#7b2d26', fontWeight: '800', marginBottom: 6 },
  errorText: { color: '#7b2d26', marginBottom: 12 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#7b2d26', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  retryButtonText: { color: '#fff', fontWeight: '700' },
  toolbarCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e3eaef', padding: 14, marginBottom: 12 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#e3eaef' },
  cardTitle: { color: '#0f2f3d', fontSize: 16, fontWeight: '800', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  badge: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  priority_low: { backgroundColor: '#6c8a9b' },
  priority_medium: { backgroundColor: '#d2871f' },
  priority_high: { backgroundColor: '#b54030' },
  status_new: { backgroundColor: '#23485d' },
  status_in_progress: { backgroundColor: '#15948b' },
  status_resolved: { backgroundColor: '#4f7d3b' },
  cardMeta: { color: '#556b7a', marginBottom: 4, lineHeight: 20 },
  cardDetail: { color: '#385160', marginTop: 8, lineHeight: 20 },
  controlLabel: { color: '#385160', fontWeight: '700', marginTop: 12, marginBottom: 8 },
  controlRow: { flexDirection: 'row', flexWrap: 'wrap' },
  controlButton: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
  controlButtonActive: { backgroundColor: '#0f2f3d', borderColor: '#0f2f3d' },
  controlButtonText: { color: '#385160', fontWeight: '700', textTransform: 'capitalize' },
  controlButtonTextActive: { color: '#fff' },
  exportButton: { backgroundColor: '#0f2f3d', borderRadius: 12, alignItems: 'center', paddingVertical: 11, marginTop: 8 },
  exportButtonText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#777', textAlign: 'center', marginTop: 24 }
});