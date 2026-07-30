import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useToast } from '../contexts/ToastContext';
import WeatherWarning from '../components/WeatherWarning';

export default function GroupBookingScreen({ navigation }) {
  const [groupSize, setGroupSize] = useState(6);
  const [eventType, setEventType] = useState('Polttarit / Bachelor Party');
  const [locationName, setLocationName] = useState('Nallikari Beach, Oulu');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [needInstructor, setNeedInstructor] = useState(true);
  const [needDelivery, setNeedDelivery] = useState(true);

  const { showToast } = useToast();

  const pricePerBoardPerDay = 45;
  const instructorFee = needInstructor ? 60 : 0;
  const deliveryFee = needDelivery ? 20 : 0;
  const totalEstimatedPrice = groupSize * pricePerBoardPerDay + instructorFee + deliveryFee;

  const submitGroupRequest = () => {
    if (!contactName.trim() || !contactEmail.trim()) {
      return showToast('Täytä yhteystiedot', 'Nimi ja sähköposti ovat pakollisia ryhmävarauksessa.');
    }

    showToast(
      '🎉 Ryhmävarauspyyntö lähetetty!',
      `Kiitos! Olemme sinuun yhteydessä sähköpostitse (${contactEmail}) 2 tunnin sisällä.`
    );
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="🎉 Ryhmävaraukset & Tiimipäivät"
          subtitle="Varaa SUP-laudat ja ohjaaja ryhmällesi (4–20 henkilöä)"
          onBack={() => navigation.goBack()}
        />

        <WeatherWarning location={locationName} />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 1. Valitse ryhmäkoko & Tapahtuma</Text>
          
          <Text style={styles.label}>Osallistujamäärä ({groupSize} henkilöä)</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => setGroupSize(Math.max(4, groupSize - 1))}>
              <Text style={styles.counterBtnText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.counterValue}>{groupSize} laudaa</Text>
            <TouchableOpacity style={styles.counterBtn} onPress={() => setGroupSize(Math.min(25, groupSize + 1))}>
              <Text style={styles.counterBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Tapahtuman tyyppi</Text>
          <View style={styles.chipRow}>
            {['Polttarit', 'Yrityksen tiimipäivä', 'Syntymäpäivät', 'Kaveriporukka'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.chip, eventType.includes(type) && styles.chipSelected]}
                onPress={() => setEventType(type)}
              >
                <Text style={[styles.chipText, eventType.includes(type) && styles.chipTextSelected]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏄 2. Ryhmäpaketin lisäpalvelut</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setNeedInstructor(!needInstructor)}
          >
            <View style={[styles.checkbox, needInstructor && styles.checkboxSelected]}>
              {needInstructor ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.checkboxTextCol}>
              <Text style={styles.checkboxTitle}>🏄 Aloittelijoiden pikaohjaus &amp; vetäjä (+60 € ryhmä)</Text>
              <Text style={styles.checkboxDesc}>Ammattitaitoinen ohjaaja opastaa tekniikan rannalla ennen vesille lähtöä.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setNeedDelivery(!needDelivery)}
          >
            <View style={[styles.checkbox, needDelivery && styles.checkboxSelected]}>
              {needDelivery ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.checkboxTextCol}>
              <Text style={styles.checkboxTitle}>🚗 Kuljetus suoraan valitsemallesi rannalle (+20 € ryhmä)</Text>
              <Text style={styles.checkboxDesc}>Toimitamme kaikki {groupSize} laudat täytettyinä rannalle ja haemme pois.</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.priceSummaryBox}>
            <Text style={styles.priceLabel}>ARVIOITU KOKONAISHINTA ({groupSize} HLÖ):</Text>
            <Text style={styles.priceValue}>{totalEstimatedPrice} €</Text>
            <Text style={styles.perPersonText}>({Math.round(totalEstimatedPrice / groupSize)} € / henkilö)</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📞 3. Varaajan yhteystiedot</Text>

          <Text style={styles.label}>Nimi *</Text>
          <TextInput style={styles.input} value={contactName} onChangeText={setContactName} placeholder="Matti Meikäläinen" />

          <Text style={styles.label}>Sähköposti *</Text>
          <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} placeholder="matti@yritys.fi" keyboardType="email-address" />

          <Text style={styles.label}>Puhelinnumero</Text>
          <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} placeholder="040 123 4567" keyboardType="phone-pad" />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={submitGroupRequest}>
          <Text style={styles.primaryButtonText}>Lähetä ryhmävarauspyyntö ({totalEstimatedPrice} €) →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2ebf0' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#0f2f3d', marginBottom: 6, marginTop: 6 },
  counterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  counterBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#15948b', justifyContent: 'center', alignItems: 'center' },
  counterBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '800' },
  counterValue: { marginHorizontal: 20, fontSize: 18, fontWeight: '800', color: '#0f2f3d' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#f0f4f7', borderWidth: 1, borderColor: '#d2dfa6' },
  chipSelected: { backgroundColor: '#15948b', borderColor: '#15948b' },
  chipText: { color: '#4a6070', fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#ffffff', fontWeight: '800' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, marginBottom: 6 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#15948b', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2, backgroundColor: '#fff' },
  checkboxSelected: { backgroundColor: '#15948b' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  checkboxTextCol: { flex: 1 },
  checkboxTitle: { fontSize: 13, fontWeight: '800', color: '#0f2f3d' },
  checkboxDesc: { fontSize: 11, color: '#687e8c', marginTop: 2 },
  priceSummaryBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 2, borderTopColor: '#15948b', alignItems: 'flex-end' },
  priceLabel: { fontSize: 11, fontWeight: '800', color: '#0f2f3d', uppercase: true },
  priceValue: { fontSize: 24, fontWeight: '900', color: '#15948b' },
  perPersonText: { fontSize: 11, color: '#687e8c', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#f8fafc', color: '#0f2f3d', marginBottom: 6 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' }
});
