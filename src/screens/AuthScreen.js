import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';

import { requestLoginCode, verifyLoginCode } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function AuthScreen({ navigation }) {
  const { showToast } = useToast();
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



  const handleRequestCode = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return showToast('Anna sähköposti');

    try {
      setLoading(true);
      const response = await requestLoginCode(normalizedEmail);
      setCodeRequested(true);
      if (response.devCode) {
        showToast('Koodi lähetetty (dev)', `Koodisi on ${response.devCode}`);
      } else {
        showToast('Koodi lähetetty', 'Tarkista sähköposti ja syötä 6-numeroinen koodi.');
      }
    } catch (e) {
      showToast('Koodin lähetys epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return showToast('Anna sähköposti');
    if (!code || code.length < 6) return showToast('Anna 6-numeroinen koodi');

    try {
      setLoading(true);
      await verifyLoginCode(normalizedEmail, code);
      showToast('Kirjautuminen onnistui');
      navigation.navigate('Home');
    } catch (e) {
      showToast('Kirjautuminen epäonnistui', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirjaudu sähköpostilla</Text>
      <Text style={styles.subtitle}>Syötä sähköpostiosoitteesi saadaksesi kirjautumiskoodin.</Text>
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />

      {!codeRequested ? (
        <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleRequestCode} disabled={loading}>
          <Text style={styles.primaryButtonText}>{loading ? 'Lähetetään...' : 'Lähetä kirjautumiskoodi'}</Text>
        </TouchableOpacity>
      ) : (
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
            <Text style={styles.primaryButtonText}>{loading ? 'Vahvistetaan...' : 'Vahvista ja kirjaudu'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={handleRequestCode} disabled={loading}>
            <Text style={styles.ghostButtonText}>Lähetä koodi uudelleen</Text>
          </TouchableOpacity>
        </>
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
