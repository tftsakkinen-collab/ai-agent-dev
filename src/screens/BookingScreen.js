import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { fetchWithAuth } from '../lib/api';

export default function BookingScreen({ route, navigation }) {
  const { product } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const submit = () => {
    if (!name || !email) return Alert.alert('Täytä nimi ja sähköposti');

    fetchWithAuth('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, name, email })
    })
      .then(res => res.json())
      .then(() => {
        Alert.alert('Varaus tehty');
        navigation.navigate('Home');
      })
      .catch(() => Alert.alert('Varauksen luonti epäonnistui'));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Varaa: {product?.name}</Text>
      <TextInput placeholder="Nimi" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
      <Button title="Varaa nyt" onPress={submit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12 }
});
