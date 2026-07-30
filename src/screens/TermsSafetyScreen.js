import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

const safetyChecklist = [
  'Kaytan aina pelastusliiveja SUP-laudalla.',
  'En lahde vesille myrsky- tai ukkosvaroituksella.',
  'Pysyn sovitulla alueella ja valoisaan aikaan.',
  'Noudatan kantavuusrajaa ja turvallista kayttoa.'
];

export default function TermsSafetyScreen({ navigation, route }) {
  const product = route?.params?.product || null;
  const selectedDate = route?.params?.selectedDate || null;
  const selectedTime = route?.params?.selectedTime || null;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  const canContinue = useMemo(() => termsAccepted && safetyAccepted, [termsAccepted, safetyAccepted]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Ehdot ja turvallisuus" subtitle={product?.name || 'SUP-vuokrauksen ehdot'} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vuokrausehdot (pilot)</Text>
          <Text style={styles.bodyText}>Vuokraaja on vastuussa varusteiden huolellisesta kaytosta ja palautuksesta sovitusti.</Text>
          <Text style={styles.bodyText}>Tahallinen vahinko, paihtyneena kaytto ja sovitun alueen ulkopuolinen kaytto voivat johtaa korvausvastuuseen.</Text>
          <Text style={styles.bodyText}>Mahdolliset vahingot ratkaistaan dispute-prosessin kautta todisteiden perusteella.</Text>

          <Text style={styles.sectionTitle}>SUP-turvallisuuschecklist</Text>
          {safetyChecklist.map((item) => (
            <Text key={item} style={styles.listItem}>• {item}</Text>
          ))}

          <TouchableOpacity style={styles.checkRow} onPress={() => setTermsAccepted((v) => !v)}>
            <Text style={[styles.checkBox, termsAccepted && styles.checkBoxActive]}>{termsAccepted ? '✓' : ' '}</Text>
            <Text style={styles.checkLabel}>Hyvaksy vuokrausehdot</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkRow} onPress={() => setSafetyAccepted((v) => !v)}>
            <Text style={[styles.checkBox, safetyAccepted && styles.checkBoxActive]}>{safetyAccepted ? '✓' : ' '}</Text>
            <Text style={styles.checkLabel}>Hyvaksy turvallisuuschecklist</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
            disabled={!canContinue}
            onPress={() => navigation.navigate('Booking', { product, termsAccepted: true, safetyAccepted: true, selectedDate, selectedTime })}
          >
            <Text style={styles.primaryButtonText}>Jatka varaukseen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3eaef', borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 10, marginTop: 8 },
  bodyText: { color: '#4d6371', lineHeight: 21, marginBottom: 8 },
  listItem: { color: '#4d6371', marginBottom: 5 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
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
  checkLabel: { color: '#37515f', fontWeight: '700' },
  primaryButton: { marginTop: 18, backgroundColor: '#15948b', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 }
});
