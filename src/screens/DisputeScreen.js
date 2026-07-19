import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';
import { getBooking, submitBookingDispute, getBookingDisputes } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  sectionText: { fontSize: 14, lineHeight: 20, color: '#666', marginBottom: 12 },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4, textTransform: 'uppercase' },
  textInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#E74C3C',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  successCard: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  successText: { fontSize: 14, color: '#155724', fontWeight: '500' },
  evidenceImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#EEE',
    borderRadius: 6,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  evidenceText: { fontSize: 13, color: '#666', marginBottom: 12 },
  disputeItem: {
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disputeTitle: { fontSize: 14, fontWeight: 'bold', color: '#856404' },
  disputeReason: { fontSize: 13, color: '#856404', marginTop: 4 },
  disputeDate: { fontSize: 12, color: '#A68D00', marginTop: 4 },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 20 },
});

const DISPUTE_REASONS = [
  'Vastuun epäselvyys',
  'Välineen vaurio',
  'Välineen puuttuminen',
  'Ei palautettu ajallaan',
  'Muu',
];

export default function DisputeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { bookingId } = route.params || {};

  const [booking, setBooking] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState('');

  useEffect(() => {
    loadDisputes();
  }, [bookingId]);

  const loadDisputes = async () => {
    try {
      setLoading(true);
      const bookingData = await getBooking(bookingId);
      setBooking(bookingData);

      const disputesData = await getBookingDisputes(bookingId);
      setDisputes(disputesData);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!reason || !description.trim()) {
      Alert.alert('Virhe', 'Täytä syy ja kuvaus');
      return;
    }

    try {
      setSubmitting(true);
      const photos = evidenceUrls
        .split('\n')
        .map((url) => url.trim())
        .filter(Boolean);

      await submitBookingDispute(bookingId, {
        reason,
        description: description.trim(),
        evidencePhotos: photos,
      });

      Alert.alert('Onnistui', 'Riita-asia lähetetty käsiteltäväksi. Admin tarkistaa todisteet.');
      setReason('');
      setDescription('');
      setEvidenceUrls('');
      setShowForm(false);
      await loadDisputes();
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setSubmitting(false);
    }
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
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Riita-asianhallinta" subtitle={`Varaus: ${booking?.id}`} />

        {booking?.bookingStage === 'disputed' && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>✓ Riita-asia on avoinna. Admin käsittelee sitä.</Text>
          </View>
        )}

        {disputes.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Avoimet riita-asiat</Text>
            {disputes.map((dispute) => (
              <View key={dispute.id} style={styles.disputeItem}>
                <Text style={styles.disputeTitle}>{dispute.reason}</Text>
                <Text style={styles.disputeReason}>{dispute.description}</Text>
                {dispute.evidencePhotos?.length > 0 && (
                  <Text style={styles.evidenceText}>📎 {dispute.evidencePhotos.length} todiste</Text>
                )}
                <Text style={styles.disputeDate}>{new Date(dispute.createdAt).toLocaleDateString('fi-FI')}</Text>
              </View>
            ))}
          </>
        )}

        {!showForm && disputes.length === 0 && (
          <>
            <Text style={styles.sectionTitle}>Ongelmia varauksen kanssa?</Text>
            <TouchableOpacity style={styles.button} onPress={() => setShowForm(true)}>
              <Text style={styles.buttonText}>Avaa riita-asia</Text>
            </TouchableOpacity>
          </>
        )}

        {showForm && (
          <>
            <Text style={styles.sectionTitle}>Riita-asian avaaminen</Text>

            <View style={styles.card}>
              <Text style={styles.label}>Syy</Text>
              <View>
                {DISPUTE_REASONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 8,
                      backgroundColor: reason === r ? '#E3F2FD' : 'transparent',
                      borderRadius: 4,
                      borderWidth: reason === r ? 2 : 0,
                      borderColor: '#2196F3',
                      marginBottom: 4,
                    }}
                    onPress={() => setReason(r)}
                  >
                    <Text style={{ color: reason === r ? '#2196F3' : '#666', fontWeight: reason === r ? 'bold' : 'normal' }}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Kuvaus</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Kerro mitä tapahtui..."
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Todistekuvat (URL:t, yksi per rivi)</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
                multiline
                numberOfLines={3}
                value={evidenceUrls}
                onChangeText={setEvidenceUrls}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitDispute}
              disabled={submitting}
            >
              <Text style={styles.buttonText}>{submitting ? 'Lähetetään...' : 'Lähetä riita-asia'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ paddingVertical: 12, alignItems: 'center', backgroundColor: '#E8E8E8', borderRadius: 8 }}
              onPress={() => setShowForm(false)}
            >
              <Text style={{ color: '#333', fontWeight: 'bold' }}>Peruuta</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
