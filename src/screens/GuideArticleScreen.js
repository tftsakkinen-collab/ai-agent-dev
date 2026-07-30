import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';

const GUIDES_DATA = {
  'paras-sup-reitti-oulussa': {
    title: 'Paras SUP-reitti Oulussa — 3 Suosituinta Reittiä Oulujoella ja Merellä',
    subtitle: 'AEO/SEO-opas: Reittikuvaukset, noutopisteet, virtaamat ja turvallisuusvinkit',
    answerBox: 'Oulun paras ja suosituin SUP-reitti aloittelijoille ja rennolle retkelle on Oulujoen suistoalue Tuiran uimarannalta Ämmänsaaren ja Koivusaaren ympäri (noin 3,5 km). Merimaisemia ja Nallikarin hiekkarantoja etsivälle paras reitti on Nallikari–Hietasaari-kierros (noin 5 km tyynellä säällä).',
    content: [
      {
        heading: '1. Tuiran suisto & Oulujoki (3,5 km) — Paras aloittelijoille',
        body: 'Oulujoki tarjoaa tyynet vedet ja suojaisat saaret suppailuun. Tuiran uimarannalta lähtevä reitti kiertää Hupisaarten ja Mustasaaren kauniissa maisemissa. Vesi on suojassa kovalta merituulelta.'
      },
      {
        heading: '2. Nallikari & Hietasaaren rannikko (5 km) — Paras merimaisemille',
        body: 'Nallikarin hiekkarannat ja Hietasaaren luontopolkujen rannat tarjoavat kirkasta merivettä ja upeita auringonlaskuja. Merellä suppailtaessa kannattaa tarkistaa tuulennopeus ja suunta.'
      },
      {
        heading: '3. Kuivasjärvi & Linnanmaa (2,5 km) — Paras tyynille järvivesille',
        body: 'Kuivasjärvi on matala ja tyyni järvi Oulun pohjoispuolella. Erinomainen paikka perheille, koiran kanssa suppailuun ja rauhalliseen tekniikkaharjoitteluun.'
      }
    ],
    faq: [
      { q: 'Tarvitseeko Oulujoella suppailuun lupaa?', a: 'Ei tarvitse. Jokamiehenoikeudet koskevat myös vesistöissä liikkumista. Huomioi kuitenkin suistoalueen muut veneilijät.' },
      { q: 'Mistä voin vuokrata SUP-laudan Oulussa?', a: 'Voit vuokrata laudan suoraan GearSpot.xyz-palvelusta Nallikarista, Tuirasta, Hietasaaresta tai Kuivasjärveltä.' }
    ]
  },
  'nallikari-vai-hietasaari': {
    title: 'Nallikari vai Hietasaari — Kumpa Oulun SUP-paikka Sopii Sinulle?',
    subtitle: 'Vertailu: Rantaolosuhteet, tuuli, palvelut ja laudan nouto',
    answerBox: 'Valitse Nallikari, jos haluat upeat hiekkarannat, ravintolapalvelut ja avoimen merimaiseman. Valitse Hietasaari tai Tuira, jos haluat suojaisempaa vettä, vähemmän aallokkoa ja rauhallisemman luontoreitin.',
    content: [
      {
        heading: 'Nallikari — Merellinen hiekkaranta ja laajat vedet',
        body: 'Nallikari on Oulun tunnetuin uimaranta. Se tarjoaa laajan matalan hiekkapohjan ja loistavat puitteet aurinkoisen päivän suppailuun. Tuulisella säällä merelle voi muodostua aallokkoa.'
      },
      {
        heading: 'Hietasaari & Tuira — Tyynempi joen ja saariston suoja',
        body: 'Hietasaari ja Tuiran suistoalue tarjoavat suojaa tuulelta. Jos etsit tyyntä vettä ja rentoa melontaa saarten lomassa, Hietasaari on varma valinta.'
      }
    ],
    faq: [
      { q: 'Voiko Nallikarissa suppailla tuulisella säällä?', a: 'Yli 7 m/s tuulessa Nallikariin muodostuu aallokkoa. Tällöin suosittelemme siirtymistä Tuiran suojaiselle Oulujoelle.' }
    ]
  }
};

export default function GuideArticleScreen({ route, navigation }) {
  const { slug = 'paras-sup-reitti-oulussa' } = route.params || {};
  const article = GUIDES_DATA[slug] || GUIDES_DATA['paras-sup-reitti-oulussa'];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Oulun SUP-Opas" onBack={() => navigation.goBack()} />

        <View style={styles.articleHeader}>
          <Text style={styles.badgeText}>📖 AEO / SEO OULUN SUP-OPAS</Text>
          <Text style={styles.title}>{article.title}</Text>
          <Text style={styles.subtitle}>{article.subtitle}</Text>
        </View>

        {/* DIRECT ANSWER BOX FOR AEO/GOOGLE AI SEARCH */}
        <View style={styles.answerBox}>
          <Text style={styles.answerBoxTitle}>⚡ NOPEA VASTAUS (AI / SEARCH):</Text>
          <Text style={styles.answerBoxText}>{article.answerBox}</Text>
        </View>

        {article.content.map((sec, idx) => (
          <View key={idx} style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>{sec.heading}</Text>
            <Text style={styles.sectionBody}>{sec.body}</Text>
          </View>
        ))}

        {/* FAQ SECTION WITH SCHEMA SUPPORT */}
        <View style={styles.faqCard}>
          <Text style={styles.faqTitle}>❓ Usein Kysytyt Kysymykset (FAQ)</Text>
          {article.faq.map((item, idx) => (
            <View key={idx} style={styles.faqItem}>
              <Text style={styles.faqQuestion}>Q: {item.q}</Text>
              <Text style={styles.faqAnswer}>A: {item.a}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.primaryButtonText}>Selaa Oulun vapaat SUP-laudat →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },
  articleHeader: { marginBottom: 16 },
  badgeText: { color: '#15948b', fontSize: 11, fontWeight: '900', letterSpacing: 0.5, uppercase: true, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f2f3d', lineHeight: 28, marginBottom: 6 },
  subtitle: { fontSize: 13, color: '#687e8c', lineHeight: 18 },
  answerBox: { backgroundColor: '#e6f7f5', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#15948b' },
  answerBoxTitle: { fontSize: 11, fontWeight: '900', color: '#0e6962', uppercase: true, marginBottom: 6 },
  answerBoxText: { fontSize: 13, color: '#0f2f3d', lineHeight: 20, fontWeight: '600' },
  sectionCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2ebf0' },
  sectionHeading: { fontSize: 15, fontWeight: '800', color: '#0f2f3d', marginBottom: 6 },
  sectionBody: { fontSize: 13, color: '#4a6070', lineHeight: 20 },
  faqCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2ebf0' },
  faqTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 12 },
  faqItem: { marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f5f8' },
  faqQuestion: { fontSize: 13, fontWeight: '800', color: '#0f2f3d', marginBottom: 2 },
  faqAnswer: { fontSize: 12, color: '#4a6070', lineHeight: 18 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' }
});
