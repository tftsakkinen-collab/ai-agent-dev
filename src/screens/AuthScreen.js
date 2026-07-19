import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { requestLoginCode, verifyLoginCode } from '../lib/api';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeRequested, setCodeRequested] = useState(false);

  const handleRequestCode = async () => {
    if (!email) return Alert.alert('Anna sähköposti');

    try {
      const response = await requestLoginCode(email);
      setCodeRequested(true);
      if (response.devCode) {
        Alert.alert('Koodi lähetetty (dev)', `Koodisi on ${response.devCode}`);
      } else {
        Alert.alert('Koodi lähetetty', 'Tarkista kirjautumiskoodi palvelun lokista.');
      }
    } catch (e) {
      Alert.alert('Koodin lähetys epäonnistui', e.message);
    }
  };

  const handleVerifyCode = async () => {
    if (!email) return Alert.alert('Anna sähköposti');
    if (!code || code.length < 6) return Alert.alert('Anna 6-numeroinen koodi');

    try {
      await verifyLoginCode(email, code);
      Alert.alert('Kirjautuminen onnistui');
      navigation.navigate('Home');
    } catch (e) {
      Alert.alert('Kirjautuminen epäonnistui', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirjaudu sähköpostilla</Text>
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
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
          <TouchableOpacity style={styles.primaryButton} onPress={handleVerifyCode}>
            <Text style={styles.primaryButtonText}>Vahvista ja kirjaudu</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleRequestCode}>
            <Text style={styles.secondaryButtonText}>Lähetä koodi uudelleen</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={handleRequestCode}>
          <Text style={styles.primaryButtonText}>Lähetä kirjautumiskoodi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f8fb' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#0f2f3d' },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 14, padding: 14, marginBottom: 16, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 10, paddingVertical: 12, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#c9d5df', backgroundColor: '#fff' },
  secondaryButtonText: { color: '#0f2f3d', fontWeight: '700' }
});
