import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getAdminDisputes, getAdminListings, getAdminPilotMetrics, getAuthAuditLogs, getAuthProviderStatus, getListingModerationThroughput, moderateAdminListing, resolveAdminDispute } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 12, paddingVertical: 8 },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  metricCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: '31%',
    alignItems: 'center'
  },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#007AFF', marginBottom: 4 },
  metricLabel: { fontSize: 11, color: '#666', textAlign: 'center' },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  filterChip: {
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6
  },
  filterChipActive: { backgroundColor: '#007AFF' },
  filterChipText: { fontSize: 12, color: '#333', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8'
  },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  itemTitle: { fontSize: 13, fontWeight: 'bold', color: '#222', marginBottom: 4 },
  metaText: { fontSize: 12, color: '#666', marginBottom: 2 },
  disputeItem: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    padding: 10,
    marginBottom: 8,
    borderRadius: 4
  },
  logItem: {
    backgroundColor: '#F5F5F5',
    padding: 8,
    marginBottom: 6,
    borderRadius: 4
  },
  logEvent: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  actionRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 6
  },
  successButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  successButtonText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  warnButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    alignItems: 'center'
  },
  warnButtonText: { fontSize: 12, color: '#fff', fontWeight: 'bold' }
});

export default function AdminOpsScreen() {
  const [disputes, setDisputes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pilotMetrics, setPilotMetrics] = useState(null);
  const [throughputMetrics, setThroughputMetrics] = useState(null);
  const [providerStatus, setProviderStatus] = useState(null);
  const [pendingListings, setPendingListings] = useState([]);
  const [activeStatus, setActiveStatus] = useState('open');
  const [listingStatusFilter, setListingStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [disputeData, auditData, metricsData, providerData, pendingData, throughputData] = await Promise.all([
        getAdminDisputes(activeStatus),
        getAuthAuditLogs(30),
        getAdminPilotMetrics(30),
        getAuthProviderStatus(),
        getAdminListings(listingStatusFilter),
        getListingModerationThroughput()
      ]);
      setDisputes(disputeData || []);
      setAuditLogs(auditData || []);
      setPilotMetrics(metricsData || null);
      setProviderStatus(providerData || null);
      setPendingListings(pendingData || []);
      setThroughputMetrics(throughputData || null);
    } catch (error) {
      Alert.alert('Admin-datan haku epäonnistui', error.message);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, listingStatusFilter]);

  const handleModerateListing = async (listingId, moderationStatus) => {
    try {
      await moderateAdminListing(
        listingId,
        moderationStatus,
        moderationStatus === 'approved' ? 'Approved via admin panel' : 'Rejected via admin panel'
      );
      Alert.alert('Listing päivitetty', `Tila: ${moderationStatus}`);
      loadData();
    } catch (error) {
      Alert.alert('Listingin päivitys epäonnistui', error.message);
    }
  };

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
        <ScreenHeader title="Admin Ops" subtitle="Pilot metrics & operations" actionLabel="Päivitä" onAction={loadData} />

        {/* KPI Cards */}
        {pilotMetrics && (
          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{pilotMetrics.metrics?.bookingCompletionRatePct || 0}%</Text>
              <Text style={styles.metricLabel}>Completion</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{pilotMetrics.metrics?.disputeRatePct || 0}%</Text>
              <Text style={styles.metricLabel}>Disputes</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{pilotMetrics.metrics?.averageReviewScore || '-'}</Text>
              <Text style={styles.metricLabel}>Avg Review</Text>
            </View>
          </View>
        )}

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
          <Text style={styles.sectionTitle}>Pilot metrics (30d)</Text>
          {!pilotMetrics ? <Text style={styles.metaText}>Ei metriikkadataa.</Text> : null}
          {pilotMetrics ? (
            <>
              <Text style={styles.metaText}>Booking completion: {pilotMetrics.metrics?.bookingCompletionRatePct ?? 0}%</Text>
              <Text style={styles.metaText}>Dispute rate: {pilotMetrics.metrics?.disputeRatePct ?? 0}%</Text>
              <Text style={styles.metaText}>Average review: {pilotMetrics.metrics?.averageReviewScore ?? '-'}</Text>
              <Text style={styles.metaText}>Resolution time (h): {pilotMetrics.metrics?.averageResolutionHours ?? '-'}</Text>
              <Text style={styles.metaText}>Listing to booking proxy: {pilotMetrics.metrics?.listingToBookingConversionProxyPct ?? 0}%</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Listing moderation throughput</Text>
          {!throughputMetrics ? <Text style={styles.metaText}>Ei throughput-dataa.</Text> : null}
          {throughputMetrics ? (
            <>
              <Text style={styles.metaText}>Total: {throughputMetrics.total || 0}</Text>
              <Text style={styles.metaText}>Pending: {throughputMetrics.pending || 0}</Text>
              <Text style={styles.metaText}>Approved: {throughputMetrics.approved || 0}</Text>
              <Text style={styles.metaText}>Rejected: {throughputMetrics.rejected || 0}</Text>
              <Text style={styles.metaText}>Avg time to approval: {throughputMetrics.avgTimeToApprovalMinutes ?? 0} min</Text>
              <Text style={styles.metaText}>Median time to approval: {throughputMetrics.medianTimeToApprovalMinutes ?? 0} min</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Auth provider</Text>
          {!providerStatus ? <Text style={styles.metaText}>Ei provider-dataa.</Text> : null}
          {providerStatus ? (
            <>
              <Text style={styles.metaText}>Provider: {providerStatus.provider}</Text>
              <Text style={styles.metaText}>Ready: {providerStatus.ready ? 'yes' : 'no'}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Listausmoderointi ({listingStatusFilter})</Text>
          <View style={styles.filterRow}>
            {['pending', 'approved', 'rejected', 'all'].map((status) => (
              <TouchableOpacity
                key={`listing-${status}`}
                style={[styles.filterChip, listingStatusFilter === status && styles.filterChipActive]}
                onPress={() => setListingStatusFilter(status)}
              >
                <Text style={[styles.filterChipText, listingStatusFilter === status && styles.filterChipTextActive]}>{status}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {!pendingListings.length ? <Text style={styles.metaText}>Ei listingeja tällä suodattimella.</Text> : null}
          {pendingListings.map((listing) => (
            <View key={listing.id} style={styles.disputeItem}>
              <Text style={styles.itemTitle}>{listing.name}</Text>
              <Text style={styles.metaText}>Sijainti: {listing.locationName || '-'}</Text>
              <Text style={styles.metaText}>Vuokraaja: {listing.provider?.name || listing.ownerEmail || '-'}</Text>
              <Text style={styles.metaText}>Tila: {listing.moderationStatus || 'pending'}</Text>
              {listingStatusFilter !== 'all' || listing.moderationStatus !== 'approved' ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity style={styles.successButton} onPress={() => handleModerateListing(listing.id, 'approved')}>
                    <Text style={styles.successButtonText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.warnButton} onPress={() => handleModerateListing(listing.id, 'rejected')}>
                    <Text style={styles.warnButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
