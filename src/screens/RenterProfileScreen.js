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
import { getRenterProfile, updateRenterProfile } from '../lib/api';

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
  buttonSecondary: {
    backgroundColor: '#E8E8E8',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonSecondaryText: { color: '#333', fontSize: 12, fontWeight: '500' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  statLabel: { fontSize: 11, color: '#666', marginTop: 4 },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

export default function RenterProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getRenterProfile();
      setProfile(data);
      setFullName(data.fullName || '');
      setPhone(data.phone || '');
      setBio(data.bio || '');
      setLoading(false);
    } catch (error) {
      Alert.alert('Virhe', 'Profiilin lataus epäonnistui');
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Virhe', 'Nimi vaaditaan');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateRenterProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        bio: bio.trim()
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
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Vuokraajan profiili" subtitle={profile?.email || ''} />

        {profile?.totalBookings > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Tilastot</Text>
            <View style={styles.stats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.totalBookings || 0}</Text>
                <Text style={styles.statLabel}>Varaukset</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.averageRating || '-'}</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.disputes || 0}</Text>
                <Text style={styles.statLabel}>Riita-asiat</Text>
              </View>
            </View>
          </View>
        )}

        {!editing ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Profiilitiedot</Text>
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.label}>Sähköposti</Text>
                <Text style={styles.value}>{profile?.email || '-'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nimi</Text>
                <Text style={styles.value}>{profile?.fullName || 'Määrittelemätön'}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Puhelin</Text>
                <Text style={styles.value}>{profile?.phone || '-'}</Text>
              </View>
              {profile?.bio && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.label}>Kuvaus</Text>
                  <Text style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{profile.bio}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.button} onPress={() => setEditing(true)}>
              <Text style={styles.buttonText}>✏️ Muokkaa profiilia</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✏️ Muokkaa profiilia</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Nimi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Koko nimi"
                value={fullName}
                onChangeText={setFullName}
                editable={!saving}
              />

              <Text style={styles.label}>Puhelin</Text>
              <TextInput
                style={styles.input}
                placeholder="+358 40 123 4567"
                value={phone}
                onChangeText={setPhone}
                editable={!saving}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Kuvaus</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Kerro itsestäsi lyhyesti..."
                value={bio}
                onChangeText={setBio}
                editable={!saving}
                multiline
              />

              <TouchableOpacity
                style={[styles.button, saving && { opacity: 0.5 }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                <Text style={styles.buttonText}>{saving ? 'Tallennetaan...' : '💾 Tallenna muutokset'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.buttonSecondary}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={styles.buttonSecondaryText}>Peruuta</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Turvallisuus</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.buttonSecondary}>
              <Text style={styles.buttonSecondaryText}>🔑 Vaihda salasana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 8 }]}>
              <Text style={styles.buttonSecondaryText}>🚪 Kirjaudu ulos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
