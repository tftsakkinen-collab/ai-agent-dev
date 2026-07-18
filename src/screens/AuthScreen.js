import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthScreen({ navigation }) {
  const [email, setEmail] = useState('');

  const login = async () => {
    if (!email) return Alert.alert('Anna sähköposti');

    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      if (json.token) {
        await AsyncStorage.setItem('token', json.token);
        Alert.alert('Kirjautuminen onnistui');
        navigation.navigate('Home');
      } else {
        Alert.alert('Kirjautuminen epäonnistui');
      }
    } catch (e) {
      Alert.alert('Kirjautuminen epäonnistui');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirjaudu sähköpostilla (mock)</Text>
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <Button title="Kirjaudu" onPress={login} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 }
});
