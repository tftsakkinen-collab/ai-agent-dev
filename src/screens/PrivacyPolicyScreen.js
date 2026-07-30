import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Tietosuojaseloste" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>GearSpot Tietosuojaseloste</Text>
        <Text style={styles.text}>Viimeksi päivitetty: 26. heinäkuuta 2026</Text>

        <Text style={styles.h2}>1. Rekisterinpitäjä</Text>
        <Text style={styles.text}>GearSpot FI (Y-tunnus: 1234567-8){'\n'}Sähköposti: privacy@gearspot.fi</Text>

        <Text style={styles.h2}>2. Kerättävät tiedot</Text>
        <Text style={styles.text}>Keräämme palvelun toimittamisen kannalta pakolliset tiedot, joita ovat:{'\n'}- Sähköpostiosoite (kirjautumista varten){'\n'}- Nimi ja puhelinnumero (vuokraustilanteiden kommunikaatioon){'\n'}- Laitteiston lokitiedot (virheiden jäljittämiseen)</Text>

        <Text style={styles.h2}>3. Tietojen käyttö ja luovuttaminen</Text>
        <Text style={styles.text}>Käyttäjien tietoja käytetään yksinomaan varauksien hallintaan ja palvelun parantamiseen. Emme myy käyttäjätietoja ulkopuolisille. Maksujen käsittelyssä käytämme Stripe Inc:n palveluita, joille siirtyy maksutapahtumaan liittyvät tiedot. Maksukorttien tietoja ei tallenneta GearSpotin omille palvelimille.</Text>

        <Text style={styles.h2}>4. Tietojen säilytysaika ja oikeudet</Text>
        <Text style={styles.text}>Säilytämme varaus- ja käyttäjätietoja niin kauan kuin tilisi on aktiivinen. Sinulla on oikeus (GDPR-asetuksen mukaisesti) vaatia tietojesi poistamista (&quot;oikeus tulla unohdetuksi&quot;), oikaisemista tai siirtämistä olemalla meihin yhteydessä.</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: '#0f2f3d', marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700', color: '#15948b', marginTop: 24, marginBottom: 8 },
  text: { fontSize: 15, color: '#4a5568', lineHeight: 22 }
});
