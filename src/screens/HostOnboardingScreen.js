import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { submitHostOnboarding } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  progressBar: {
    height: 4,
    backgroundColor: '#E8E8E8',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 2,
  },
  section: { marginTop: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  sectionNumber: { fontSize: 12, color: '#999', marginBottom: 12 },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  description: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 12 },
  label: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
    marginBottom: 12,
  },
  checkbox: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxActive: { backgroundColor: '#007AFF' },
  checkboxCheckmark: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  checkboxLabel: { fontSize: 12, color: '#333', flex: 1 },
  button: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

export default function HostOnboardingScreen() {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeLiability, setAgreeLiability] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNext = () => {
    if (step === 1) {
      if (!companyName.trim()) {
        Alert.alert('Virhe', 'Yrityksen nimi vaaditaan');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!bankAccount.trim()) {
        Alert.alert('Virhe', 'Pankkitilin numero vaaditaan');
        return;
      }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!agreeTerms || !agreeLiability) {
      Alert.alert('Virhe', 'Kaikki ehdot tulee hyväksyä');
      return;
    }

    try {
      setSubmitting(true);
      await submitHostOnboarding({
        companyName: companyName.trim(),
        description: description.trim(),
        bankAccount: bankAccount.trim(),
        termsAccepted: true,
        liabilityAccepted: true,
      });
      Alert.alert(
        'Onnistui',
        'Onnittelut! Olet nyt isäntä. Odotatamme hyväksyntää.',
        [{ text: 'OK', onPress: () => {} }]
      );
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const progress = (step / 3) * 100;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Isännän perehdytys" subtitle="Aloita omien tuotteiden vuokraus" />

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {step === 1 && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏢 Vaihe 1: Yritystiedot</Text>
              <Text style={styles.sectionNumber}>1 / 3</Text>
              <View style={styles.card}>
                <Text style={styles.description}>
                  Kerro meille yrityksestäsi. Näillä tiedoilla esittelemme sinut vuokraajille.
                </Text>
                <Text style={styles.label}>Yrityksen nimi *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Esim. 'Oulu Water Sports'"
                  value={companyName}
                  onChangeText={setCompanyName}
                />

                <Text style={styles.label}>Kuvaus</Text>
                <TextInput
                  style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="Kerro yrityksestäsi, kokemuksestasi ja tarjoamistasi palveluista..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                  <Text style={styles.buttonText}>Seuraava →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {step === 2 && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💳 Vaihe 2: Pankkitili</Text>
              <Text style={styles.sectionNumber}>2 / 3</Text>
              <View style={styles.card}>
                <Text style={styles.description}>
                  Lisää pankkitili maksusi vastaanottamista varten. Turvamme kaikki maksut.
                </Text>
                <Text style={styles.label}>IBAN-numero *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="FI00 0000 0000 0000 00"
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  autoCapitalize="characters"
                />

                <View style={styles.checkbox}>
                  <TouchableOpacity
                    style={[styles.checkboxBox, agreeTerms && styles.checkboxBoxActive]}
                    onPress={() => setAgreeTerms(!agreeTerms)}
                  >
                    {agreeTerms && <Text style={styles.checkboxCheckmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Hyväksyn palvelun ehdot</Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleNext}>
                  <Text style={styles.buttonText}>Seuraava →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Vaihe 3: Vahvistus</Text>
              <Text style={styles.sectionNumber}>3 / 3</Text>
              <View style={styles.card}>
                <Text style={styles.description}>
                  Tarkista tiedot ja hyväksy lopulliset ehdot isännyydelle.
                </Text>

                <Text style={{ fontSize: 12, color: '#666', marginBottom: 12, fontWeight: '600' }}>
                  📋 Yhteenveto:
                </Text>
                <Text style={{ fontSize: 12, color: '#333', marginBottom: 4 }}>• Yritys: {companyName}</Text>
                <Text style={{ fontSize: 12, color: '#333', marginBottom: 12 }}>• Pankkitili: ****{bankAccount.slice(-4)}</Text>

                <View style={styles.checkbox}>
                  <TouchableOpacity
                    style={[styles.checkboxBox, agreeLiability && styles.checkboxBoxActive]}
                    onPress={() => setAgreeLiability(!agreeLiability)}
                  >
                    {agreeLiability && <Text style={styles.checkboxCheckmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Hyväksyn vastuusäännöt ja vakuutusehdot</Text>
                </View>

                <TouchableOpacity
                  style={[styles.button, (submitting || !agreeLiability) && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={submitting || !agreeLiability}
                >
                  <Text style={styles.buttonText}>
                    {submitting ? 'Lähetetään...' : '🚀 Vahvista ja aloita'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 10, alignItems: 'center' }}
                  onPress={() => setStep(2)}
                  disabled={submitting}
                >
                  <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '500' }}>← Takaisin</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
