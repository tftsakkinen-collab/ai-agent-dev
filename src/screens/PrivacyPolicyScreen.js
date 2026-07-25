import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, View } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Tietosuojaseloste" subtitle="Miten käsittelemme tietojasi" />
        <View style={styles.card}>
          <Text style={styles.heading}>1. Kerättävät tiedot</Text>
          <Text style={styles.paragraph}>
            Keräämme palvelun tarjoamiseksi tarpeellisia tietoja, kuten sähköpostiosoitteen, nimen ja puhelinnumeron.
            Lisäksi keräämme tietoja tehdyistä varauksista ja arvosteluista.
          </Text>

          <Text style={styles.heading}>2. Tietojen käyttö</Text>
          <Text style={styles.paragraph}>
            Tietoja käytetään palvelun tarjoamiseen, käyttäjien väliseen viestintään (esim. varauksen yhteydessä)
            sekä palvelun laadun ja turvallisuuden parantamiseen.
          </Text>

          <Text style={styles.heading}>3. Tietojen luovutus</Text>
          <Text style={styles.paragraph}>
            Tietoja ei säännönmukaisesti luovuteta kolmansille osapuolille, paitsi niiltä osin kuin se on tarpeen
            varauksen toteuttamiseksi (esim. omistajan ja vuokraajan välinen kommunikaatio) tai lain niin vaatiessa.
          </Text>

          <Text style={styles.heading}>4. Tietoturva</Text>
          <Text style={styles.paragraph}>
            Tietojasi säilytetään turvallisesti ja niihin on pääsy vain palvelun ylläpidolla ja soveltuvin osin
            toisen osapuolen (vuokraaja/omistaja) toimesta varauksen yhteydessä.
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
