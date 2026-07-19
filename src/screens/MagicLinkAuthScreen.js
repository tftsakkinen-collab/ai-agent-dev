import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenHeader from '../components/ScreenHeader';
import { getAuthProviderStatus, requestMagicLink, verifyMagicLink } from '../lib/api';

export default function MagicLinkAuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [stage, setStage] = useState('email'); // email | verify
  const [loading, setLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await getAuthProviderStatus();
        setProviderStatus(status);
      } catch {
        setProviderStatus(null);
      }
    })();
  }, []);

  const handleRequestLink = async () => {
    const trimmed = String(email).trim().toLowerCase();
    if (!trimmed || !/^[^@]+@[^@]+\.[a-z]{2,}$/.test(trimmed)) {
      Alert.alert('Virheellinen sähköposti', 'Syötä kelvollinen sähköpostiosoite.');
      return;
    }

    try {
      setLoading(true);
      await requestMagicLink(trimmed);
      Alert.alert('Lähetetty', 'Magic link lähetetty sähköpostiisi.');
      setStage('verify');
    } catch (error) {
      Alert.alert('Haku epäonnistui', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      Alert.alert('Syötä koodi', 'Kopioi sähköpostiviestistä saatu koodi.');
      return;
    }

    try {
      setLoading(true);
      await verifyMagicLink(verificationCode, email);
      Alert.alert('Kirjautunut!', 'Tervetuloa GearSpot-sovellukseen.');
      navigation.replace('Home');
    } catch (error) {
      Alert.alert('Varmennus epäonnistui', error.message);
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  if (stage === 'email') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <ScreenHeader
            title="Kirjaudu magic linkillä"
            subtitle="Sähköpostiisi lähetetään turvallinen linkki"
          />
          <View style={styles.card}>
            <Text style={styles.label}>Sähköpostiosoite</Text>
            <TextInput
              style={styles.input}
              placeholder="nimi@example.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleRequestLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Lähetä magic link</Text>
              )}
            </TouchableOpacity>
          </View>
          {providerStatus ? (
            <View style={styles.metaCard}>
              <Text style={styles.metaText}>Provider: {providerStatus.provider}</Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ScreenHeader
          title="Vahvista kirjautuminen"
          subtitle="Kopioi sähköpostiviestistä saatu koodi alle"
        />
        <View style={styles.card}>
          <Text style={styles.label}>Vahvistuskoodi</Text>
          <TextInput
            style={styles.input}
            placeholder="Syötä koodi"
            placeholderTextColor="#999"
            value={verificationCode}
            onChangeText={setVerificationCode}
            editable={!loading}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Vahvista</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setStage('email')} disabled={loading}>
            <Text style={styles.secondaryButtonText}>Takaisin</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e3eaef', padding: 16 },
  metaCard: { marginTop: 16, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e3eaef' },
  label: { fontWeight: '700', color: '#0f2f3d', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: '#fff', color: '#000' },
  primaryButton: { backgroundColor: '#15948b', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 10, borderWidth: 1, borderColor: '#d2dce4', borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  secondaryButtonText: { color: '#264655', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  metaText: { color: '#556b7a', fontSize: 14 }
});
