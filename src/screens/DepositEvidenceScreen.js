import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getBooking, submitBookingEvidence } from '../lib/api';

export default function DepositEvidenceScreen({ route, navigation }) {
  const { bookingId, phase } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const phaseLabels = {
    before: 'Ennen vuokrausta',
    after: 'Vuokrauksen jälkeen'
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getBooking(bookingId);
        setBooking(data);
      } catch (error) {
        Alert.alert('Varauksen haku epäonnistui', error.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  const handleSubmitEvidence = async () => {
    const photos = photoUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);

    if (!photos.length) {
      Alert.alert('Lisää kuvia', 'Lisää vähintään yksi kuvalinkki per rivi.');
      return;
    }

    try {
      setSubmitting(true);
      await submitBookingEvidence(bookingId, phase, photos);
      Alert.alert('Kuvatodisteet tallennettu', `${phaseLabels[phase]} -kuvat on kirjattu.`);
      navigation.replace('Booking', { bookingId, tab: 'details' });
    } catch (error) {
      Alert.alert('Tallennus epäonnistui', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Todisteet" subtitle="Ladataan..." />
      </SafeAreaView>
    );
  }

  const depositAmount = booking?.depositAmount || 0;
  const phaseLabel = phaseLabels[phase] || phase;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title={phaseLabel}
          subtitle="Lataa kuvatodisteet vakuudelle"
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Varaustiedot</Text>
          <Text style={styles.itemText}>{booking?.product?.name}</Text>
          <Text style={styles.metaText}>Vakuus: {depositAmount} €</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{phaseLabel} -kuvat</Text>
          <Text style={styles.label}>Kuvien URL-osoitteet (yksi per rivi)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="https://example.com/photo1.jpg&#10;https://example.com/photo2.jpg"
            placeholderTextColor="#999"
            value={photoUrls}
            onChangeText={setPhotoUrls}
            editable={!submitting}
            multiline
          />

          <Text style={styles.label}>Lisätiedot (vapaaehtoinen)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Merkitse esiin nousseet vauriot tai erityispiirteet"
            placeholderTextColor="#999"
            value={notes}
            onChangeText={setNotes}
            editable={!submitting}
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmitEvidence}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Tallennetaan...' : 'Tallenna todisteet'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Vakuuden käsittely</Text>
          <Text style={styles.infoText}>
            Kuvat tallennetaan molempia osapuolia varten. Jos erimielisyys vakuuden palautuksesta, admin käyttää näitä kuvia ratkaisussa.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e3eaef', padding: 16, marginBottom: 12 },
  infoCard: { backgroundColor: '#f0f7f7', borderRadius: 16, borderWidth: 1, borderColor: '#d0e2df', padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 8 },
  itemText: { fontSize: 16, fontWeight: '700', color: '#0f2f3d', marginBottom: 4 },
  label: { fontWeight: '700', color: '#0f2f3d', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#fff', color: '#000' },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  metaText: { color: '#556b7a', lineHeight: 20 },
  primaryButton: { marginTop: 16, backgroundColor: '#15948b', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  infoTitle: { fontWeight: '800', color: '#0e6d66', marginBottom: 8 },
  infoText: { color: '#556b7a', lineHeight: 20 }
});
