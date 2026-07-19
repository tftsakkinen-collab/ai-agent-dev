import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { createOwnerListing } from '../lib/api';

export default function BecomeHostScreen({ navigation }) {
  const [boardName, setBoardName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('Oulu');
  const [pricePerHour, setPricePerHour] = useState('15');
  const [pricePerDay, setPricePerDay] = useState('60');
  const [providerName, setProviderName] = useState('');
  const [photoList, setPhotoList] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!boardName.trim() || !description.trim() || !locationName.trim()) {
      Alert.alert('Täydennä tiedot', 'Nimi, kuvaus ja sijainti ovat pakollisia.');
      return;
    }

    const photos = photoList
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    if (!photos.length) {
      Alert.alert('Lisää vähintään yksi kuva', 'Lisää yksi kuvalinkki per rivi.');
      return;
    }

    try {
      setSaving(true);
      await createOwnerListing({
        name: boardName.trim(),
        short: description.trim(),
        locationName: locationName.trim(),
        pricePerHour: Number(pricePerHour),
        pricePerDay: Number(pricePerDay),
        providerName: providerName.trim(),
        photos
      });
      Alert.alert('Ilmoitus julkaistu', 'SUP-lautasi näkyy nyt etusivun tarjonnassa.');
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Julkaisu epäonnistui', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Ala vuokraajaksi" subtitle="Lisää oma SUP-lauta vuokralle Oulun alueelle" />

        <View style={styles.card}>
          <Text style={styles.label}>SUP-laudan nimi</Text>
          <TextInput style={styles.input} value={boardName} onChangeText={setBoardName} placeholder="Esim. Red Paddle 10'6" />

          <Text style={styles.label}>Kuvaus</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Kunto, mukana tulevat varusteet, nouto-ohje"
            multiline
          />

          <Text style={styles.label}>Sijainti</Text>
          <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="Esim. Nallikari, Oulu" />

          <Text style={styles.label}>Näyttönimi vuokraajalle</Text>
          <TextInput style={styles.input} value={providerName} onChangeText={setProviderName} placeholder="Esim. Sannan SUP" />

          <View style={styles.row}>
            <View style={styles.colLeft}>
              <Text style={styles.label}>Hinta / tunti</Text>
              <TextInput style={styles.input} value={pricePerHour} onChangeText={setPricePerHour} keyboardType="numeric" />
            </View>
            <View style={styles.colRight}>
              <Text style={styles.label}>Hinta / päivä</Text>
              <TextInput style={styles.input} value={pricePerDay} onChangeText={setPricePerDay} keyboardType="numeric" />
            </View>
          </View>

          <Text style={styles.label}>Kuvat (kuvalinkki per rivi)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={photoList}
            onChangeText={setPhotoList}
            placeholder="https://.../sup1.jpg\nhttps://.../sup2.jpg"
            multiline
          />

          <TouchableOpacity style={[styles.primaryButton, saving && styles.buttonDisabled]} onPress={submit} disabled={saving}>
            <Text style={styles.primaryButtonText}>{saving ? 'Julkaistaan...' : 'Julkaise vuokralle'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e3eaef', padding: 16 },
  label: { fontWeight: '700', color: '#0f2f3d', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#fff' },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  colLeft: { flex: 1, marginRight: 6 },
  colRight: { flex: 1, marginLeft: 6 },
  primaryButton: { marginTop: 16, backgroundColor: '#15948b', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 }
});
