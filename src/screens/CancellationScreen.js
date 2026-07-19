import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { cancelBooking } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  warningCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: { fontSize: 12, color: '#856404', lineHeight: 18 },
  section: { marginTop: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  label: { fontSize: 12, color: '#666', fontWeight: '500', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
    marginBottom: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { fontSize: 12, color: '#666' },
  rowValue: { fontSize: 12, fontWeight: '600', color: '#333' },
  button: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  buttonSecondary: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: '#333', fontSize: 12, fontWeight: '500' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

export default function CancellationScreen({ route }) {
  const booking = route?.params?.booking || null;
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [canceling, setCanceling] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <ScreenHeader title="Peru varaus" subtitle="Ei varausta valittu" />
          <View style={styles.warningCard}>
            <Text style={styles.warningText}>Avaa varaus nähdäksesi perumisvaihtoehdot.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const handleCancel = async () => {
    if (!reason.trim()) {
      Alert.alert('Virhe', 'Perumistapahtuman syy vaaditaan');
      return;
    }

    try {
      setCanceling(true);
      await cancelBooking(booking.id, {
        reason: reason.trim(),
        feedback: feedback.trim()
      });
      Alert.alert('Onnistui', 'Varaus peruttu', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back
          }
        }
      ]);
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setCanceling(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Peru varaus" subtitle={booking?.product?.name || 'Varaus'} />

        <View style={styles.warningCard}>
          <Text style={styles.warningText}>
            ⚠️ Varauksen peruuntuminen voi johtaa maksujen palautukseen tai muihin seurauksiin. Varmistu ennen jatkamista.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Varauksen tiedot</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tuote</Text>
              <Text style={styles.rowValue}>{booking?.product?.name || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Tila</Text>
              <Text style={styles.rowValue}>{booking?.bookingStage || '-'}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Luotu</Text>
              <Text style={styles.rowValue}>{new Date(booking?.createdAt).toLocaleDateString('fi-FI')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>❌ Perumisen tiedot</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Perumisen syy *</Text>
            <TextInput
              style={styles.input}
              placeholder="Kerro miksi haluat perua varauksen..."
              value={reason}
              onChangeText={setReason}
              editable={!canceling}
              multiline
            />

            <Text style={styles.label}>Palaute (valinnainen)</Text>
            <TextInput
              style={[styles.input, { minHeight: 60 }]}
              placeholder="Muuta palautetta..."
              value={feedback}
              onChangeText={setFeedback}
              editable={!canceling}
              multiline
            />

            <TouchableOpacity
              style={[styles.button, canceling && { opacity: 0.5 }]}
              onPress={handleCancel}
              disabled={canceling}
            >
              <Text style={styles.buttonText}>{canceling ? 'Perutaan...' : '❌ Vahvista peruutus'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonSecondary} disabled={canceling}>
              <Text style={styles.buttonSecondaryText}>Takaisin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
