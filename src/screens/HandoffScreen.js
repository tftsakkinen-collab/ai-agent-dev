import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { confirmBookingHandoff, getBooking } from '../lib/api';

export default function HandoffScreen({ route, navigation }) {
  const { bookingId, actor } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

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

  const handleConfirm = async () => {
    try {
      setConfirming(true);
      await confirmBookingHandoff(bookingId, actor);
      Alert.alert('Vahvistettu', `${actor === 'owner' ? 'Omistaja' : 'Vuokraaja'} vahvisti nouto/luovutuksen.`);
      navigation.replace('Booking', { bookingId, tab: 'details' });
    } catch (error) {
      Alert.alert('Vahvistus epäonnistui', error.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Nouto" subtitle="Ladataan..." />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Virhe" subtitle="Varausta ei löytynyt" />
      </SafeAreaView>
    );
  }

  const isOwner = actor === 'owner';
  const otherConfirmed = isOwner ? booking.handoffConfirmedByRenterAt : booking.handoffConfirmedByOwnerAt;
  const currentConfirmed = isOwner ? booking.handoffConfirmedByOwnerAt : booking.handoffConfirmedByRenterAt;
  const lockboxCode = booking.handoffCode && isOwner ? booking.handoffCode : '***';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title={isOwner ? 'Noutovalmius' : 'Nouto-kuititus'}
          subtitle={isOwner ? 'Vahvista lauta noudettavaksi' : 'Vahvista että olet noutanut lauan'}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Varaustiedot</Text>
          <Text style={styles.itemText}>{booking.product?.name}</Text>
          <Text style={styles.metaText}>Pvm: {new Date(booking.startDate).toLocaleDateString('fi-FI')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Noutotapa</Text>
          <Text style={styles.itemText}>{booking.handoffMethod === 'lockbox_code' ? 'Lukkolaatikko' : 'Henkilökohtainen'}</Text>
          {booking.handoffMethod === 'lockbox_code' && (
            <>
              <Text style={styles.label} />
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{lockboxCode}</Text>
              </View>
              <Text style={styles.metaText}>Koodi näkyy vain kun molemmat osapuolet ovat vahvistaneet.</Text>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vahvistusten tila</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Omistaja:</Text>
            <Text style={[styles.statusValue, booking.handoffConfirmedByOwnerAt && styles.confirmed]}>
              {booking.handoffConfirmedByOwnerAt ? '✓ Vahvistettu' : 'Odottaa'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Vuokraaja:</Text>
            <Text style={[styles.statusValue, booking.handoffConfirmedByRenterAt && styles.confirmed]}>
              {booking.handoffConfirmedByRenterAt ? '✓ Vahvistettu' : 'Odottaa'}
            </Text>
          </View>
        </View>

        {!currentConfirmed && (
          <TouchableOpacity
            style={[styles.primaryButton, confirming && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <Text style={styles.primaryButtonText}>{confirming ? 'Vahvistetaan...' : 'Vahvista'}</Text>
          </TouchableOpacity>
        )}

        {currentConfirmed && !otherConfirmed && (
          <View style={styles.card}>
            <Text style={styles.metaText}>
              Odotamme {isOwner ? 'vuokraajan' : 'omistajan'} vahvistusta...
            </Text>
          </View>
        )}

        {currentConfirmed && otherConfirmed && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>✓ Molemmat osapuolet vahvistaneet! Vuokraus voi alkaa.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e3eaef', padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 8 },
  itemText: { fontSize: 16, fontWeight: '700', color: '#0f2f3d', marginBottom: 4 },
  label: { fontWeight: '700', color: '#0f2f3d', marginBottom: 8 },
  metaText: { color: '#556b7a', lineHeight: 20 },
  codeBox: { backgroundColor: '#f0f4f7', borderRadius: 12, padding: 14, marginVertical: 10, borderWidth: 2, borderColor: '#d5dde3' },
  codeText: { fontSize: 28, fontWeight: '900', color: '#15948b', textAlign: 'center', fontFamily: 'monospace' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#edf2f5' },
  statusLabel: { fontWeight: '700', color: '#0f2f3d' },
  statusValue: { color: '#a0a8b0' },
  confirmed: { color: '#15948b', fontWeight: '700' },
  primaryButton: { backgroundColor: '#15948b', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  successCard: { backgroundColor: '#e8f7f5', borderRadius: 16, borderWidth: 2, borderColor: '#15948b', padding: 16, marginTop: 12 },
  successText: { color: '#0e6d66', fontWeight: '700', textAlign: 'center' }
});
