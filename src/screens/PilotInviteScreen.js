import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getProfile, createInviteCode, validateInviteCode, listInviteCodes } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4, textTransform: 'uppercase' },
  textInput: {
    borderWidth: 1,
    borderColor: '#D0D0D0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  successCard: {
    backgroundColor: '#D4EDDA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#C3E6CB',
  },
  successText: { fontSize: 14, color: '#155724', fontWeight: '500' },
  codeBox: {
    backgroundColor: '#F0F0F0',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#333',
  },
  codeText: { fontFamily: 'monospace', fontSize: 13, color: '#333' },
  usageBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
  },
  usageText: { fontSize: 13, color: '#1565C0', lineHeight: 18 },
  listItem: {
    backgroundColor: '#FFF',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  listItemCode: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  listItemMeta: { fontSize: 11, color: '#666' },
});

export default function PilotInviteScreen() {
  const [profile, setProfile] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCodeEmail, setNewCodeEmail] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const profileData = await getProfile();
      setProfile(profileData);

      const codesData = await listInviteCodes().catch(() => []);
      setCodes(codesData);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (!newCodeEmail.trim()) {
      Alert.alert('Virhe', 'Syötä sähköpostiosoite');
      return;
    }

    try {
      const result = await createInviteCode(newCodeEmail.trim());
      Alert.alert('Onnistui', `Kutsukoodi luotu: ${result.code}`);
      setNewCodeEmail('');
      await loadData();
    } catch (error) {
      Alert.alert('Virhe', error.message);
    }
  };

  const handleValidateCode = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Virhe', 'Syötä kutsukood');
      return;
    }

    try {
      setValidating(true);
      const result = await validateInviteCode(inviteCode.trim());
      setValidationResult(result);
      Alert.alert('Tulos', result.valid ? 'Kutsukoodi on kelvollinen!' : 'Kutsukoodi ei kelpaa');
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  const isAdmin = profile?.email?.includes('admin') || profile?.email?.includes('pilot');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Pilot-kutsut" subtitle="Hallinnoi Gearspot-pilottiin pääsyn kutsuja" />

        <View style={styles.card}>
          <Text style={styles.label}>Profiili</Text>
          <Text style={styles.codeText}>{profile?.email}</Text>
          {isAdmin && <Text style={[styles.codeText, { color: '#4CAF50', marginTop: 4 }]}>✓ Admin</Text>}
        </View>

        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Luo uusi kutsukoodi</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Vastaanottajan sähköposti</Text>
              <TextInput
                style={styles.textInput}
                placeholder="user@example.com"
                value={newCodeEmail}
                onChangeText={setNewCodeEmail}
              />
              <TouchableOpacity style={styles.button} onPress={handleCreateCode}>
                <Text style={styles.buttonText}>Luo kutsukoodi</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Luodut kutsukoodit ({codes.length})</Text>
            {codes.length === 0 ? (
              <Text style={styles.label}>Ei luotuja koodeja vielä</Text>
            ) : (
              codes.map((code) => (
                <View key={code.id} style={styles.listItem}>
                  <Text style={styles.listItemCode}>{code.code}</Text>
                  <Text style={styles.listItemMeta}>Kohde: {code.email}</Text>
                  <Text style={styles.listItemMeta}>Status: {code.used ? 'Käytetty' : 'Aktiivinen'}</Text>
                  <Text style={styles.listItemMeta}>Luotu: {new Date(code.createdAt).toLocaleDateString('fi-FI')}</Text>
                </View>
              ))
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>Validoi kutsukoodi</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Kutsukoodisi</Text>
          <TextInput
            style={styles.textInput}
            placeholder="ABC123DEF456"
            value={inviteCode}
            onChangeText={setInviteCode}
            editable={!validating}
          />
          <TouchableOpacity style={[styles.button, validating && { opacity: 0.5 }]} onPress={handleValidateCode} disabled={validating}>
            <Text style={styles.buttonText}>{validating ? 'Tarkistetaan...' : 'Validoi koodi'}</Text>
          </TouchableOpacity>

          {validationResult && (
            <View style={validationResult.valid ? styles.successCard : { backgroundColor: '#FFE6E6', borderRadius: 8, padding: 12 }}>
              <Text style={validationResult.valid ? styles.successText : { color: '#C00', fontWeight: '500' }}>
                {validationResult.valid ? '✓ Kutsukoodi hyväksytty! Voit käyttää palvelua.' : '✗ Kutsukoodi ei kelpaa'}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.usageBox}>
          <Text style={styles.usageText}>
            💡 <Text style={{ fontWeight: 'bold' }}>Pilot-käyttäjät:</Text> Käytä kutsukoodia kirjautuessasi. Koodi aktivoi pilot-tilillesi
            pääsyn.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
