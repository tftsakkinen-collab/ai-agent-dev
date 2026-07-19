import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { login } from '../lib/api';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const handleLogin = async () => {
    if (!email) return Alert.alert('Anna sähköposti');

    try {
      await login(email);
      Alert.alert('Kirjautuminen onnistui');
      navigation.navigate('Home');
    } catch (e) {
      Alert.alert('Kirjautuminen epäonnistui', e.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirjaudu sähköpostilla (mock)</Text>
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
        <Text style={styles.primaryButtonText}>Kirjaudu</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f8fb' },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 16, color: '#0f2f3d' },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 14, padding: 14, marginBottom: 16, backgroundColor: '#fff' },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' }
});
