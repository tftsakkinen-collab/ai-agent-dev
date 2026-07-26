import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';

import { login, requestLoginCode, verifyLoginCode } from '../lib/api';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location?.search) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const emailFromLink = String(params.get('email') || '').trim();
    if (emailFromLink && !email) {
      setEmail(emailFromLink);
    }
  }, [email]);

  const handleQuickLogin = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return Alert.alert('Anna sähköposti');

    try {
      setLoading(true);
      await login(normalizedEmail);
      Alert.alert('Kirjautuminen onnistui');
      navigation.navigate('Home');
    } catch (e) {
      Alert.alert('Nopea kirjautuminen epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCode = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return Alert.alert('Anna sähköposti');

    try {
      setLoading(true);
      const response = await requestLoginCode(normalizedEmail);
      setCodeRequested(true);
      if (response.devCode) {
        Alert.alert('Koodi lähetetty (dev)', `Koodisi on ${response.devCode}`);
      } else {
        Alert.alert('Koodi lähetetty', 'Tarkista sähköposti ja syötä 6-numeroinen koodi.');
      }
    } catch (e) {
      Alert.alert('Koodin lähetys epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return Alert.alert('Anna sähköposti');
    if (!code || code.length < 6) return Alert.alert('Anna 6-numeroinen koodi');

    try {
      setLoading(true);
      await verifyLoginCode(normalizedEmail, code);
      Alert.alert('Kirjautuminen onnistui');
      navigation.navigate('Home');
    } catch (e) {
      Alert.alert('Kirjautuminen epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirjaudu sähköpostilla</Text>
      <Text style={styles.subtitle}>Jos linkin kautta jumittaa, käytä nopeaa kirjautumista ja jatka suoraan sovellukseen.</Text>
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />

      <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleQuickLogin} disabled={loading}>
        <Text style={styles.primaryButtonText}>{loading ? 'Kirjaudutaan...' : 'Nopea kirjautuminen'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => setCodeRequested((prev) => !prev)}>
        <Text style={styles.secondaryButtonText}>{codeRequested ? 'Piilota koodikirjautuminen' : 'Käytä koodikirjautumista'}</Text>
      </TouchableOpacity>

      {codeRequested ? (
        <>
          <TextInput
            placeholder="6-numeroinen koodi"
            value={code}
            onChangeText={setCode}
            style={styles.input}
            keyboardType="number-pad"
            maxLength={6}
          />
          <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleVerifyCode} disabled={loading}>
            <Text style={styles.primaryButtonText}>Vahvista ja kirjaudu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRequestCode}>
            <Text style={styles.secondaryButtonText}>Lähetä koodi uudelleen</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.ghostButton} onPress={handleRequestCode}>
          <Text style={styles.ghostButtonText}>Lähetä kirjautumiskoodi</Text>
        </TouchableOpacity>
      )}

      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>Käyttämällä palvelua hyväksyt</Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
            <Text style={styles.legalLink}>Käyttöehdot</Text>
          </TouchableOpacity>
          <Text style={styles.legalText}> ja </Text>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.legalLink}>Tietosuojaselosteen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f8fb' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#0f2f3d' },
  subtitle: { color: '#4c6372', marginBottom: 14, lineHeight: 20 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 14, padding: 14, marginBottom: 16, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  secondaryButton: { marginTop: 10, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#c9d5df', backgroundColor: '#fff' },
  secondaryButtonText: { color: '#0f2f3d', fontWeight: '700' },
  ghostButton: { marginTop: 10, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  ghostButtonText: { color: '#15948b', fontWeight: '700' },
  legalContainer: { marginTop: 40, alignItems: 'center' },
  legalText: { color: '#7a8b94', fontSize: 13 },
  legalLinks: { flexDirection: 'row', marginTop: 4 },
  legalLink: { color: '#15948b', fontSize: 13, textDecorationLine: 'underline' }
});
