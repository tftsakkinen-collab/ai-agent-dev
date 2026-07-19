import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenHeader from '../components/ScreenHeader';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  sectionText: { fontSize: 14, lineHeight: 20, color: '#666', marginBottom: 12 },
  disclaimerBox: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    padding: 12,
    borderRadius: 4,
    marginVertical: 12,
  },
  disclaimerText: { fontSize: 13, color: '#856404', lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginVertical: 8,
  },
  toggleLabel: { fontSize: 14, color: '#333', fontWeight: '500' },
  acceptButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  acceptButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  declineButton: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  declineButtonText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
});

export default function TermsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeLiability, setAgreeLiability] = useState(false);
  const [agreeData, setAgreeData] = useState(false);

  const canAccept = agreeTerms && agreeLiability && agreeData;

  const handleAccept = () => {
    if (!canAccept) {
      Alert.alert('Virhe', 'Sinun täytyy hyväksyä kaikki ehdot jatkaaksesi.');
      return;
    }
    Alert.alert('Kiitos', 'Olet hyväksynyt Gearspot-palvelun ehdot.');
    navigation.goBack();
  };

  const handleDecline = () => {
    Alert.alert('Peruutus', 'Paluu palvelun valintaan.');
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Palvelun ehdot" subtitle="Lue ja hyväksy Gearspot-palvelun ehdot" />

        <Text style={styles.sectionTitle}>1. Palvelun kuvaus</Text>
        <Text style={styles.sectionText}>
          Gearspot on verkkopalvelu, joka mahdollistaa käyttäjille sup-lautajensa vuokraamisen muille käyttäjille.
          Palvelu tarjoaa alustan lister ja vuokraajien välisten kauppatransaktioiden helpottamiseksi.
        </Text>

        <Text style={styles.sectionTitle}>2. Käyttäjien vastuu</Text>
        <Text style={styles.sectionText}>
          Käyttäjät ovat vastuussa kaikista heidän tekemistään toimista palvelussa. Vuokraaja on vastuussa
          vuokraamansa omaisuuden hyvästä huolenpidosta. Lister on vastuussa oman omaisuutensa oikeasta
          kuvauksesta.
        </Text>

        <Text style={styles.sectionTitle}>3. Irtisanoutuminen</Text>
        <Text style={styles.sectionText}>
          Gearspot voi irtisanoa palvelun käytön milloin tahansa ilman varoitusta, jos käyttäjä rikkoo näitä
          ehtoja tai harjoittaa väärinkäyttöä.
        </Text>

        <Text style={styles.sectionTitle}>4. Omaisuusvaateet ja vakuutus</Text>
        <Text style={styles.sectionText}>
          Käyttäjät voivat jättää omaisuusvaatimuksen tai riitatapauksen. Gearspot toimii välimiehena näiden
          tapausten ratkaisemiseksi, mutta ei ole vastuussa vapauttamisesta. Suosittelemme ottamaan vakuutuksen
          omaisuuksillenne.
        </Text>

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerText}>
            ⚠️ Gearspot ei ole vastuussa omaisuuksien katoamisesta, vaurioista tai varasteluista. Kaikki
            transaktiot tapahtuvat käyttäjien omalla riskillä.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Hyväksynnät</Text>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hyväksyn palvelun ehdot</Text>
          <Switch value={agreeTerms} onValueChange={setAgreeTerms} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hyväksyn vastuuvapautuslausekkeen</Text>
          <Switch value={agreeLiability} onValueChange={setAgreeLiability} />
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Hyväksyn yksityisyyden- ja datakäytön politiikan</Text>
          <Switch value={agreeData} onValueChange={setAgreeData} />
        </View>

        <TouchableOpacity style={[styles.acceptButton, !canAccept && { opacity: 0.5 }]} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Hyväksy ja jatka</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
          <Text style={styles.declineButtonText}>Peruuta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
