import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getAdminDisputes, getAdminListings, getAdminPilotMetrics, getAuthAuditLogs, getAuthProviderStatus, getListingModerationThroughput, moderateAdminListing, resolveAdminDispute } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function AdminOpsScreen() {
  const { showToast } = useToast();
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
      showToast('Admin-datan haku epäonnistui', error.message);
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
      showToast('Listing päivitetty', `Tila: ${moderationStatus}`);
      loadData();
    } catch (error) {
      showToast('Listingin päivitys epäonnistui', error.message);
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
      showToast('Päivitetty', `Dispute merkittiin tilaan: ${resolutionStatus}`);
      loadData();
    } catch (error) {
      showToast('Disputen päivitys epäonnistui', error.message);
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
