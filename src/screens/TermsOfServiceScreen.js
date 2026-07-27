import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Käyttöehdot" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.h1}>GearSpot – SUP-lautojen vuokrauksen käyttöehdot</Text>
        <Text style={styles.text}>Viimeksi päivitetty: 26. heinäkuuta 2026</Text>

        <Text style={styles.h2}>1. Palvelun kuvaus</Text>
        <Text style={styles.text}>GearSpot on alusta, joka yhdistää SUP-lautojen omistajat (Vuokraajat) ja vuokraajat (Käyttäjät). GearSpot ei omista vuokrattavia lautoja, vaan toimii ainoastaan välittäjänä ja maksujen käsittelijänä.</Text>

        <Text style={styles.h2}>2. Käyttäjän velvollisuudet</Text>
        <Text style={styles.text}>- Käyttäjän tulee noudattaa paikallisia vesiliikennesääntöjä.{'\n'}- Käyttäjä on velvollinen pitämään yllään pelastusliivejä koko vuokrauksen ajan.{'\n'}- Käyttäjä vastaa laudan katoamisesta tai tahallisesta vahingoittamisesta koko vuokra-ajan ja vakuusmaksun puitteissa.</Text>

        <Text style={styles.h2}>3. Vuokraajan (Omistajan) velvollisuudet</Text>
        <Text style={styles.text}>- Omistajan tulee varmistaa, että vuokrattava kalusto on turvallista ja käyttökuntoista.{'\n'}- Omistaja sitoutuu antamaan asianmukaiset turvallisuusohjeet luovutuksen yhteydessä.</Text>

        <Text style={styles.h2}>4. Maksut, varaukset ja peruutukset</Text>
        <Text style={styles.text}>- Maksut käsitellään Stripe-palvelun kautta.{'\n'}- Peruutuksista, jotka tehdään alle 24 tuntia ennen varausta, veloitetaan 50 % varauksen arvosta.{'\n'}- GearSpot pidättää oikeuden periä pantin, mikäli palautuksessa havaitaan vaurioita, jotka eivät olleet olemassa luovutuksen hetkellä.</Text>

        <Text style={styles.h2}>5. Vastuuvapaus</Text>
        <Text style={styles.text}>Vesiurheiluun liittyy riskejä. GearSpot ei ole vastuussa mistään henkilö- tai omaisuusvahingoista, jotka tapahtuvat vuokra-aikana. Käyttäjä ymmärtää vesillä liikkumisen riskit ja toimii omalla vastuullaan.</Text>
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
