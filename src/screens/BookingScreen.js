import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';

export default function BookingScreen({ route, navigation }) {
  const { product } = route.params || {};
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const submit = async () => {
    if (!name || !email) return Alert.alert('Täytä nimi ja sähköposti');
    if (!product) return Alert.alert('Tuote puuttuu');

    try {
      await fetchJson('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, name, email })
      });
      Alert.alert('Varaus tehty');
      navigation.navigate('Home');
    } catch (error) {
      if (error.message === 'Unauthorized') {
        return Alert.alert('Kirjaudu ensin sisään', 'Varausten tekeminen vaatii kirjautumisen.');
      }
      Alert.alert('Varauksen luonti epäonnistui', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Varaus" subtitle={product?.name || 'Valitse tuote'} />
        <View style={styles.card}>
          <Text style={styles.title}>Varaa</Text>
          <Text style={styles.productName}>{product?.name}</Text>
          <Text style={styles.label}>Nimi</Text>
          <TextInput placeholder="Nimi" value={name} onChangeText={setName} style={styles.input} />
          <Text style={styles.label}>Sähköposti</Text>
          <TextInput placeholder="Sähköposti" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />
          <TouchableOpacity style={styles.submitButton} onPress={submit}>
            <Text style={styles.submitText}>Varaa nyt</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e3eaef', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 4 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  productName: { fontSize: 16, color: '#4a5568', marginBottom: 16 },
  label: { color: '#556b7a', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#f7fbfc' },
  warningText: { color: '#c0392b', marginTop: 8, textAlign: 'center' },
  submitButton: { marginTop: 20, backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: '700' }
});
