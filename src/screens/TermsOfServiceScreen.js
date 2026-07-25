import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Käyttöehdot" subtitle="Gearspot palvelun käyttöehdot" />
        <View style={styles.card}>
          <Text style={styles.heading}>1. Palvelun tarkoitus</Text>
          <Text style={styles.paragraph}>
            Gearspot on vertaisvuokrausalusta, joka yhdistää tavaroiden (esim. SUP-lautojen) omistajat ja vuokraajat.
            Palveluntarjoaja (Gearspot) ei omista vuokrattavia tavaroita, vaan toimii ainoastaan välittäjänä.
          </Text>

          <Text style={styles.heading}>2. Käyttäjän vastuut</Text>
          <Text style={styles.paragraph}>
            Vuokraaja sitoutuu käyttämään vuokrattua välinettä huolellisesti ja palauttamaan sen sovitussa kunnossa
            ja sovitussa ajassa. Omistaja vastaa siitä, että vuokrattava väline on turvallinen ja vastaa kuvausta.
          </Text>

          <Text style={styles.heading}>3. Maksut ja pantit</Text>
          <Text style={styles.paragraph}>
            Vuokrauksesta voidaan periä ennalta määritetty pantti, joka palautetaan vuokrauksen päätyttyä,
            mikäli väline palautetaan vahingoittumattomana.
          </Text>

          <Text style={styles.heading}>4. Vahingonkorvaukset</Text>
          <Text style={styles.paragraph}>
            Tahallinen vahinko tai huolimattomuudesta johtuva rikkoutuminen voi johtaa korvausvastuuseen.
            Mahdolliset kiistatilanteet ratkaistaan alustan dispute-prosessin kautta.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#e3eaef' },
  heading: { fontSize: 18, fontWeight: 'bold', color: '#0f2f3d', marginTop: 15, marginBottom: 8 },
  paragraph: { color: '#4d6371', lineHeight: 22, marginBottom: 10 }
});
