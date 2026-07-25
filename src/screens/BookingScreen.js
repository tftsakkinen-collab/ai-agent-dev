import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson, getProfile } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const paymentMethods = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'mobilepay', label: 'MobilePay' }
];

export default function BookingScreen({ route, navigation }) {
  const { showToast } = useToast();
  const { product, selectedDate, selectedTime } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0].id);
  const [cardLast4, setCardLast4] = useState('4242');
  const [termsAccepted, setTermsAccepted] = useState(Boolean(route?.params?.termsAccepted));
  const [safetyAccepted, setSafetyAccepted] = useState(Boolean(route?.params?.safetyAccepted));

  React.useEffect(() => {
    getProfile()
      .then((profile) => setEmail(profile.email || ''))
      .catch(() => setEmail(''));
  }, []);

  const submit = async () => {
    if (!name) return showToast('Täytä nimi');
    if (!email) return showToast('Kirjaudu ensin sisään', 'Tarvitsemme vahvistetun sähköpostin varaukselle.');
    if (!product) return showToast('Tuote puuttuu');
    if (cardLast4.trim().length < 4) return showToast('Täytä maksutavan tunniste', 'Anna vähintään 4 numeroa mock-maksua varten.');
    if (!termsAccepted || !safetyAccepted) return showToast('Hyväksynnät puuttuvat', 'Hyväksy ehdot ja turvallisuuschecklist ennen varausta.');

    try {
      const booking = await fetchJson('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          name,
          paymentMethod,
          cardLast4,
          termsAccepted,
          safetyChecklistAccepted: safetyAccepted,
          selectedDate,
          selectedTime
        })
      });
      showToast('Mock-maksu onnistui', `Varaus vahvistettu. Maksun tila: ${booking.paymentStatus}.`);
      navigation.navigate('Profile');
    } catch (error) {
      if (error.message === 'Unauthorized') {
        return showToast('Kirjaudu ensin sisään', 'Varausten tekeminen vaatii kirjautumisen.');
      }
      showToast('Varauksen luonti epäonnistui', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Varaus" subtitle={product?.name || 'Valitse tuote'} />
        <View style={styles.card}>
          <Text style={styles.title}>Varaa</Text>
          <Text style={styles.productName}>{product?.name}</Text>
          {selectedDate && selectedTime ? (
            <Text style={styles.selectedTimeText}>
              Aika: {selectedDate} klo {selectedTime}
            </Text>
          ) : null}
          <Text style={styles.info}>Tama on mock-kassa. Rahaa ei veloiteta, mutta kayttokokemus etenee kuten oikeassa maksussa.</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Varaus etenee nyt 3 vaiheessa</Text>
            <Text style={styles.summaryItem}>1. Tayta yhteystiedot</Text>
            <Text style={styles.summaryItem}>2. Vahvista mock-maksu</Text>
            <Text style={styles.summaryItem}>3. Tarkista vahvistus Profiilista ja testaa palautus</Text>
          </View>
          <Text style={styles.label}>Nimi</Text>
          <TextInput placeholder="Nimi" value={name} onChangeText={setName} style={styles.input} autoCapitalize="words" />
          <Text style={styles.label}>Sähköposti</Text>
          <TextInput placeholder="Kirjaudu nähdäksesi sähköpostin" value={email} style={styles.input} editable={false} />
          <Text style={styles.label}>Maksutapa</Text>
          <View style={styles.paymentMethodRow}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.paymentMethodButton, paymentMethod === method.id && styles.paymentMethodButtonActive]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <Text style={[styles.paymentMethodText, paymentMethod === method.id && styles.paymentMethodTextActive]}>{method.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.label}>Kortin tai lompakon 4 viimeista merkkiä</Text>
          <TextInput
            placeholder="4242"
            value={cardLast4}
            onChangeText={setCardLast4}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={4}
          />

          <View style={styles.consentCard}>
            <Text style={styles.summaryTitle}>Turvallisuus ja ehdot</Text>
            <TouchableOpacity style={styles.checkRow} onPress={() => setTermsAccepted((value) => !value)}>
              <Text style={[styles.checkBox, termsAccepted && styles.checkBoxActive]}>{termsAccepted ? '✓' : ' '}</Text>
              <Text style={styles.checkLabel}>Hyväksyn vuokrausehdot ja vastuun käytöstä.</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkRow} onPress={() => setSafetyAccepted((value) => !value)}>
              <Text style={[styles.checkBox, safetyAccepted && styles.checkBoxActive]}>{safetyAccepted ? '✓' : ' '}</Text>
              <Text style={styles.checkLabel}>Vahvistan SUP-turvallisuuslistan: liivit, sää, päiväsaika, alue.</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.submitButton} onPress={submit}>
            <Text style={styles.submitText}>Maksa ja vahvista varaus</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e3eaef', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  productName: { fontSize: 16, color: '#4a5568', marginBottom: 8 },
  selectedTimeText: { fontSize: 15, color: '#15948b', fontWeight: '600', marginBottom: 16 },
  info: { color: '#556b7a', lineHeight: 21, marginBottom: 4 },
  summaryCard: { backgroundColor: '#eef7f5', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#d4ebe7', marginTop: 12 },
  summaryTitle: { color: '#0f2f3d', fontWeight: '800', marginBottom: 8 },
  summaryItem: { color: '#385160', lineHeight: 20, marginBottom: 2 },
  consentCard: { backgroundColor: '#f8fbfd', borderRadius: 12, borderWidth: 1, borderColor: '#d7e2ea', padding: 12, marginTop: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkBox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#b8c8d3',
    borderRadius: 6,
    textAlign: 'center',
    textAlignVertical: 'center',
    marginRight: 10,
    color: '#fff',
    backgroundColor: '#fff'
  },
  checkBoxActive: { backgroundColor: '#15948b', borderColor: '#15948b' },
  checkLabel: { flex: 1, color: '#385160', lineHeight: 20 },
  label: { color: '#556b7a', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#f7fbfc' },
  paymentMethodRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  paymentMethodButton: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 999, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8, marginBottom: 8, backgroundColor: '#fff' },
  paymentMethodButtonActive: { borderColor: '#15948b', backgroundColor: '#e9f8f6' },
  paymentMethodText: { color: '#385160', fontWeight: '600' },
  paymentMethodTextActive: { color: '#15948b' },
  warningText: { color: '#c0392b', marginTop: 8, textAlign: 'center' },
  submitButton: { marginTop: 20, backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' }
});
