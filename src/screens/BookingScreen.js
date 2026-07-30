import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson, getProfile } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import WeatherWarning from '../components/WeatherWarning';
import { useStripe } from '@stripe/stripe-react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useLanguage } from '../contexts/LanguageContext';

const ADD_ON_OPTIONS = [
  { id: 'vest', name: 'Pelastusliivit (koko S/M/L/XL)', price: 5 },
  { id: 'drybag', name: 'Vedenpitävä kuivasäkki puhelimelle & avaimille', price: 3 },
  { id: 'coaching', name: 'Aloittelijan pikaohjaus / tekniikkaperehdytys', price: 15 },
  { id: 'delivery', name: 'Kuljetus suoraan rannalle (Nallikari/Tuira/Hietasaari)', price: 10 }
];

const PAYMENT_METHODS = [
  {
    id: 'stripe',
    name: 'Maksukortti (Stripe)',
    sub: 'Visa, Mastercard, Apple Pay, Google Pay',
    badge: '💳 Kortti',
    badgeBg: '#0f2f3d',
    badgeColor: '#ffffff'
  },
  {
    id: 'epassi',
    name: 'Epassi (Liikuntaetu)',
    sub: 'Maksa suoraan Epassi-sovelluksella tai verkossa',
    badge: '💚 Epassi',
    badgeBg: '#e6f7f5',
    badgeColor: '#0e6962'
  },
  {
    id: 'smartum',
    name: 'Smartum (Liikuntasaldo)',
    sub: 'Maksa SmartumPay-sovelluksella toimipaikalle GearSpot',
    badge: '🔴 Smartum',
    badgeBg: '#fee2e2',
    badgeColor: '#991b1b'
  },
  {
    id: 'edenred',
    name: 'Edenred (Virkistysetu)',
    sub: 'Edenred-kortti / MyEdenred -ohjeistus sähköpostiin',
    badge: '🟠 Edenred',
    badgeBg: '#ffedd5',
    badgeColor: '#c2410c'
  }
];

export default function BookingScreen({ route, navigation }) {
  const { lang, t } = useLanguage();
  const { product, selectedDate, selectedTime } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentLocation, setCurrentLocation] = useState(product?.locationName || 'Nallikari Beach, Oulu');
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [edenredCode, setEdenredCode] = useState('');
  const { showToast } = useToast();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [termsAccepted, setTermsAccepted] = useState(Boolean(route?.params?.termsAccepted));
  const [safetyAccepted, setSafetyAccepted] = useState(Boolean(route?.params?.safetyAccepted));
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    getProfile()
      .then((profile) => setEmail(profile.email || ''))
      .catch(() => setEmail(''));
  }, []);

  const basePriceNum = parseInt((product?.price || '').replace(/[^0-9]/g, '')) || 25;
  const addOnsTotal = selectedAddOns.reduce((sum, addOnId) => {
    const item = ADD_ON_OPTIONS.find(a => a.id === addOnId);
    return sum + (item ? item.price : 0);
  }, 0);
  const totalPriceNum = basePriceNum + addOnsTotal;

  const toggleAddOn = (id) => {
    if (selectedAddOns.includes(id)) {
      setSelectedAddOns(selectedAddOns.filter(a => a !== id));
    } else {
      setSelectedAddOns([...selectedAddOns, id]);
    }
  };

  const submit = async () => {
    if (!name) return showToast(lang === 'fi' ? 'Täytä nimi' : 'Enter full name');
    if (!email) return showToast(lang === 'fi' ? 'Kirjaudu sisään' : 'Log in first', 'Tarvitsemme vahvistetun sähköpostin varaukselle.');
    if (!termsAccepted || !safetyAccepted) return showToast(lang === 'fi' ? 'Hyväksynnät puuttuvat' : 'Accept terms', 'Hyväksy ehdot ja turvallisuus-checklist.');

    try {
      setLoading(true);
      const chosenAddOnsLabels = selectedAddOns.map(id => ADD_ON_OPTIONS.find(a => a.id === id)?.name).filter(Boolean);

      // EPASSI / SMARTUM / EDENRED BENEFIT VOUCHER HANDLING
      if (paymentMethod !== 'stripe') {
        await fetchJson('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product?.id,
            name,
            paymentMethod,
            edenredCode: paymentMethod === 'edenred' ? edenredCode : null,
            termsAccepted,
            safetyChecklistAccepted: safetyAccepted,
            selectedDate,
            selectedTime,
            locationName: currentLocation,
            addOns: chosenAddOnsLabels,
            totalPrice: `${totalPriceNum} €`
          })
        });

        showToast(
          lang === 'fi' ? `Varaus luotu (${paymentMethod.toUpperCase()})!` : `Booking created (${paymentMethod.toUpperCase()})!`,
          lang === 'fi'
            ? `Saat sähköpostiisi (${email}) maksuohjeet ${paymentMethod.toUpperCase()}-edun suorittamiseen.`
            : `Check your email (${email}) for ${paymentMethod.toUpperCase()} benefit payment instructions.`
        );
        navigation.navigate('Profile');
        return;
      }

      // STRIPE CREDIT CARD PAYMENT
      const booking = await fetchJson('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          name,
          paymentMethod: 'stripe',
          termsAccepted,
          safetyChecklistAccepted: safetyAccepted,
          selectedDate,
          selectedTime,
          locationName: currentLocation,
          addOns: chosenAddOnsLabels,
          totalPrice: `${totalPriceNum} €`
        })
      });

      if (!booking.clientSecret) {
         showToast('Varaus vahvistettu!', `Varaus lautaan ${product?.name} vahvistettu. Loppusumma: ${totalPriceNum} €.`);
         navigation.navigate('Profile');
         return;
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'GearSpot Oulu',
        paymentIntentClientSecret: booking.clientSecret,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          name: name,
          email: email,
        }
      });

      if (initError) {
        showToast('Virhe maksun alustuksessa', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') {
          showToast('Maksu peruutettu', 'Voit yrittää maksua uudelleen.');
        } else {
          showToast('Maksuepäonnistui', presentError.message);
        }
      } else {
        showToast('Maksu onnistui!', `Varaus vahvistettu lautaan ${product?.name}. Kuitti lähetetty sähköpostiin.`);
        navigation.navigate('Profile');
      }

    } catch (e) {
      showToast('Maksun alustus epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={lang === 'fi' ? 'Varaa ja maksa' : 'Book and pay'}
          subtitle={product?.name || 'SUP-lauta'}
          onBack={() => navigation.goBack()}
        />

        {/* 2. WEATHER WARNING WITH SMART 1-CLICK LOCATION SWAP */}
        <WeatherWarning
          location={currentLocation}
          onSwapLocation={(newLoc) => setCurrentLocation(newLoc)}
        />

        {/* PRICE SUMMARY CARD */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 {lang === 'fi' ? 'Varauksen yhteenveto' : 'Booking summary'}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tuote:</Text>
            <Text style={styles.summaryValue}>{product?.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Noutopiste:</Text>
            <Text style={styles.summaryValue}>{currentLocation}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ajankohta:</Text>
            <Text style={styles.summaryValue}>{selectedDate || 'Tänään'} klo {selectedTime || '12:00'}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowBorder]}>
            <Text style={styles.summaryLabel}>Laudan vuokrahinta:</Text>
            <Text style={styles.summaryValue}>{basePriceNum} €</Text>
          </View>
        </View>

        {/* ADD-ON EQUIPMENT UPSELL CHECKLIST */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏄 Lisävarusteet &amp; Palvelut (Valinnainen)</Text>
          <Text style={styles.cardSubtitle}>Ruksi mukaan haluamasi lisätarvikkeet vuokraukseen:</Text>

          {ADD_ON_OPTIONS.map(addOn => {
            const isSelected = selectedAddOns.includes(addOn.id);
            return (
              <TouchableOpacity
                key={addOn.id}
                style={[styles.addOnBox, isSelected && styles.addOnBoxSelected]}
                onPress={() => toggleAddOn(addOn.id)}
                activeOpacity={0.8}
              >
                <View style={styles.addOnLeft}>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected ? <Icon name="check" size={14} color="#fff" /> : null}
                  </View>
                  <Text style={[styles.addOnText, isSelected && styles.addOnTextSelected]}>
                    {addOn.name}
                  </Text>
                </View>
                <Text style={[styles.addOnPrice, isSelected && styles.addOnPriceSelected]}>
                  +{addOn.price} €
                </Text>
              </TouchableOpacity>
            );
          })}

          <View style={styles.totalPriceBox}>
            <Text style={styles.totalPriceLabel}>YHTEENSÄ MAKSETTAVA:</Text>
            <Text style={styles.totalPriceValue}>{totalPriceNum} €</Text>
          </View>
        </View>

        {/* 1. FINNISH SPORTS BENEFIT VOUCHER PAYMENT METHOD SELECTOR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 {lang === 'fi' ? 'Valitse maksutapa' : 'Select payment method'}</Text>
          <Text style={styles.cardSubtitle}>
            {lang === 'fi' ? 'Maksukortit sekä Epassi, Smartum ja Edenred liikuntaedut:' : 'Credit cards and Finnish sports benefit vouchers:'}
          </Text>

          {PAYMENT_METHODS.map((pm) => {
            const isSelected = paymentMethod === pm.id;
            return (
              <TouchableOpacity
                key={pm.id}
                style={[styles.paymentMethodBox, isSelected && styles.paymentMethodBoxSelected]}
                onPress={() => setPaymentMethod(pm.id)}
                activeOpacity={0.8}
                accessibilityLabel={`Maksutapa ${pm.name}`}
                accessibilityRole="button"
              >
                <View style={styles.pmLeftRow}>
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected ? <View style={styles.radioInnerCircle} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.pmTitleRow}>
                      <Text style={[styles.pmName, isSelected && styles.pmNameSelected]}>{pm.name}</Text>
                      <View style={[styles.pmBadge, { backgroundColor: pm.badgeBg }]}>
                        <Text style={[styles.pmBadgeText, { color: pm.badgeColor }]}>{pm.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.pmSub}>{pm.sub}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {paymentMethod === 'edenred' && (
            <View style={styles.edenredInputCard}>
              <Text style={styles.fieldLabel}>Edenred-tosite koodi / puhelinnumero (Valinnainen):</Text>
              <TextInput
                placeholder="esim. Edenred kuittikoodi #12345"
                value={edenredCode}
                onChangeText={setEdenredCode}
                style={styles.input}
              />
              <Text style={styles.edenredHint}>
                {lang === 'fi'
                  ? 'Edenred-maksu suoritetaan valitsemalla MyEdenred-sovelluksesta käyttöpaikaksi GearSpot. Lähetämme tarkat maksuohjeet sähköpostiisi.'
                  : 'Edenred payments are processed via MyEdenred app by choosing merchant GearSpot. Instructions sent to email.'}
              </Text>
            </View>
          )}
        </View>

        {/* CONTACT INFO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👤 Varaajan tiedot</Text>

          <Text style={styles.fieldLabel}>Koko nimi *</Text>
          <TextInput
            placeholder="Matti Meikäläinen"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.fieldLabel}>Sähköposti (vahvistukselle) *</Text>
          <TextInput
            placeholder="matti@example.com"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
          />
        </View>

        {/* TERMS & SAFETY CHECKLIST */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛡️ Turvallisuus &amp; Ehdot</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setTermsAccepted(!termsAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxSelected]}>
              {termsAccepted ? <Icon name="check" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Hyväksyn GearSpot-vuokrausehdot ja peruutussäännöt.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSafetyAccepted(!safetyAccepted)}
            activeOpacity={0.8}
          >
            <View style={[styles.checkbox, safetyAccepted && styles.checkboxSelected]}>
              {safetyAccepted ? <Icon name="check" size={14} color="#fff" /> : null}
            </View>
            <Text style={styles.checkboxLabel}>
              Vahvistan osaavani uida ja noudattavani vesiturvallisuusohjeita Oulun vesialueilla.
            </Text>
          </TouchableOpacity>
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={submit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              Vahvista varaus ({totalPriceNum} €) →
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2ebf0' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 6 },
  cardSubtitle: { fontSize: 12, color: '#687e8c', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryRowBorder: { borderTopWidth: 1, borderTopColor: '#f0f5f8', paddingTop: 8, marginTop: 4 },
  summaryLabel: { fontSize: 13, color: '#687e8c' },
  summaryValue: { fontSize: 13, fontWeight: '700', color: '#0f2f3d' },

  // PAYMENT METHODS
  paymentMethodBox: {
    minHeight: 54,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    justifyContent: 'center'
  },
  paymentMethodBoxSelected: { backgroundColor: '#e6f7f5', borderColor: '#15948b' },
  pmLeftRow: { flexDirection: 'row', alignItems: 'center' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#7a8e9c', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  radioCircleSelected: { borderColor: '#15948b' },
  radioInnerCircle: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#15948b' },
  pmTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  pmName: { fontSize: 14, fontWeight: '700', color: '#0f2f3d' },
  pmNameSelected: { color: '#0e6962', fontWeight: '800' },
  pmBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  pmBadgeText: { fontSize: 11, fontWeight: '800' },
  pmSub: { fontSize: 11, color: '#687e8c', marginTop: 2 },
  edenredInputCard: { backgroundColor: '#fff7ed', borderRadius: 12, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#ffedd5' },
  edenredHint: { fontSize: 11, color: '#c2410c', lineHeight: 16, marginTop: 6 },

  addOnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2ebf0'
  },
  addOnBoxSelected: { backgroundColor: '#e6f7f5', borderColor: '#15948b' },
  addOnLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  addOnText: { fontSize: 12, color: '#4a6070', fontWeight: '600', flex: 1 },
  addOnTextSelected: { color: '#0f2f3d', fontWeight: '800' },
  addOnPrice: { fontSize: 13, fontWeight: '700', color: '#687e8c' },
  addOnPriceSelected: { color: '#15948b', fontWeight: '800' },
  totalPriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#15948b'
  },
  totalPriceLabel: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', letterSpacing: 0.5 },
  totalPriceValue: { fontSize: 22, fontWeight: '900', color: '#15948b' },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#0f2f3d', marginBottom: 4, marginTop: 8 },
  input: { minHeight: 46, borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc', color: '#0f2f3d' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#15948b', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: '#fff' },
  checkboxSelected: { backgroundColor: '#15948b' },
  checkboxLabel: { fontSize: 12, color: '#4a6070', flex: 1, lineHeight: 17 },
  primaryButton: { minHeight: 50, backgroundColor: '#15948b', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' }
});
