import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getHostProfile, updateHostProfile } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 16, paddingVertical: 12 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 12, color: '#666', fontWeight: '500' },
  value: { fontSize: 13, color: '#333', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    fontSize: 13,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#34C759' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
  badgeGreen: { backgroundColor: '#D4EDDA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4 },
  badgeGreenText: { fontSize: 12, color: '#155724', fontWeight: '500' },
});

export default function HostProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getHostProfile();
      setProfile(data);
      setCompanyName(data.companyName || '');
      setDescription(data.description || '');
      setBankAccount(data.bankAccount ? '****' + data.bankAccount.slice(-4) : '');
      setLoading(false);
    } catch (error) {
      Alert.alert('Virhe', 'Profiilin lataus epäonnistui');
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!companyName.trim()) {
      Alert.alert('Virhe', 'Yrityksen nimi vaaditaan');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateHostProfile({
        companyName: companyName.trim(),
        description: description.trim(),
        bankAccount: bankAccount.trim() === '' ? null : bankAccount
      });
      setProfile(updated);
      setEditing(false);
      Alert.alert('Onnistui', 'Profiili päivitetty');
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#34C759" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Isännän profiili" subtitle={profile?.email || ''} />

        {profile?.totalListings > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Tilastot</Text>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.totalListings || 0}</Text>
                <Text style={styles.statLabel}>Listaukset</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.totalBookings || 0}</Text>
                <Text style={styles.statLabel}>Varaukset</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.responseRate || 0}%</Text>
                <Text style={styles.statLabel}>Vastaus %</Text>
              </View>
            </View>
          </View>
        )}

        {!editing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🏢 Yritystiedot</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Sähköposti</Text>
                <Text style={styles.value}>{profile?.email || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Yrityksen nimi</Text>
                <Text style={styles.value}>{profile?.companyName || 'Määrittelemätön'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Vahvistettu isäntä</Text>
                {profile?.verifiedAt ? (
                  <View style={styles.badgeGreen}>
                    <Text style={styles.badgeGreenText}>✓ Kyllä</Text>
                  </View>
                ) : (
                  <Text style={styles.value}>Ei</Text>
                )}
              </View>
              {profile?.description && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Kuvaus</Text>
                  <Text style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{profile.description}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.buttonText}>✏️ Muokkaa profiilia</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Muokkaa profiilia</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Yrityksen nimi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Yrityksen nimi"
                value={companyName}
                onChangeText={setCompanyName}
                editable={!saving}
              />

              <Text style={styles.label}>Kuvaus</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Kerro yrityksestäsi..."
                value={description}
                onChangeText={setDescription}
                editable={!saving}
                multiline
              />

              <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={saving}>
                <Text style={styles.buttonText}>{saving ? 'Tallennetaan...' : '💾 Tallenna'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
