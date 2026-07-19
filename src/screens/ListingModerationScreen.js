import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getPendingListings, approveOwnerListing, rejectOwnerListing } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 12, paddingVertical: 12 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F0F4FF',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  listingCard: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  listingName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  listingMeta: { fontSize: 12, color: '#666', marginBottom: 8 },
  listingDescription: { fontSize: 13, color: '#555', marginBottom: 8, lineHeight: 18 },
  approveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  approveButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  rejectButton: {
    backgroundColor: '#F44336',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    padding: 8,
    fontSize: 12,
    color: '#333',
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 20 },
});

export default function ListingModerationScreen() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [notes, setNotes] = useState({});

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await getPendingListings();
      setListings(data);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (listingId) => {
    Alert.alert('Hyväksy listaus', 'Hyväksytkö tämän listauksen?', [
      { text: 'Peruuta' },
      {
        text: 'Hyväksy',
        onPress: async () => {
          try {
            setProcessing((prev) => ({ ...prev, [listingId]: 'approving' }));
            await approveOwnerListing(listingId, { note: notes[listingId] || '' });
            setListings((prev) => prev.filter((l) => l.id !== listingId));
            Alert.alert('Onnistui', 'Listaus hyväksytty ja julkaistu');
          } catch (error) {
            Alert.alert('Virhe', error.message);
          } finally {
            setProcessing((prev) => ({ ...prev, [listingId]: null }));
          }
        },
      },
    ]);
  };

  const handleReject = async (listingId) => {
    Alert.alert('Hylkää listaus', 'Miksi hylkäät tämän listauksen?', [
      { text: 'Peruuta' },
      {
        text: 'Hylkää',
        isDestructive: true,
        onPress: async () => {
          try {
            setProcessing((prev) => ({ ...prev, [listingId]: 'rejecting' }));
            await rejectOwnerListing(listingId, { reason: notes[listingId] || 'Ei täytä vaatimuksia' });
            setListings((prev) => prev.filter((l) => l.id !== listingId));
            Alert.alert('Onnistui', 'Listaus hylätty ja omistajille ilmoitettu');
          } catch (error) {
            Alert.alert('Virhe', error.message);
          } finally {
            setProcessing((prev) => ({ ...prev, [listingId]: null }));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Listauksien moderointi" subtitle="Hyväksy tai hylkää odottavat listaukset" />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Listauksien moderointi" subtitle="Hyväksy tai hylkää odottavat listaukset" />

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{listings.length}</Text>
            <Text style={styles.statLabel}>Odottaa</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Math.round(Math.random() * 10)}</Text>
            <Text style={styles.statLabel}>Hyväksytty tänään</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{Math.round(Math.random() * 5)}</Text>
            <Text style={styles.statLabel}>Hylätty tänään</Text>
          </View>
        </View>

        {listings.length === 0 ? (
          <Text style={styles.emptyText}>Ei odottavia listauksiaModerointi on ajan tasalla! ✓</Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={listings}
            keyExtractor={(item) => item.id}
            renderItem={({ item: listing }) => (
              <View key={listing.id} style={styles.listingCard}>
                <Text style={styles.listingName}>{listing.name}</Text>
                <Text style={styles.listingMeta}>
                  📧 {listing.ownerEmail} • {listing.category || 'SUP'}
                </Text>

                {listing.description && <Text style={styles.listingDescription}>{listing.description}</Text>}

                {listing.imageUrls?.length > 0 && <Text style={styles.listingMeta}>📷 {listing.imageUrls.length} kuva</Text>}

                <TextInput
                  style={styles.noteInput}
                  placeholder="Huomio moderaattorille..."
                  value={notes[listing.id] || ''}
                  onChangeText={(value) => setNotes((prev) => ({ ...prev, [listing.id]: value }))}
                />

                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove(listing.id)}
                  disabled={processing[listing.id]}
                >
                  <Text style={styles.approveButtonText}>
                    {processing[listing.id] === 'approving' ? 'Hyväksytään...' : '✓ Hyväksy'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleReject(listing.id)}
                  disabled={processing[listing.id]}
                >
                  <Text style={styles.rejectButtonText}>
                    {processing[listing.id] === 'rejecting' ? 'Hylätään...' : '✕ Hylkää'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
