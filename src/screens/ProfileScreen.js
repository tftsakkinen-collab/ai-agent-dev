import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson, getProfile, logout } from '../lib/api';

export default function ProfileScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    fetchMyData();
  }, []);

  const fetchMyData = async () => {
    try {
      const [profileData, bookingsData, reviewsData] = await Promise.all([
        getProfile(),
        fetchJson('/api/bookings'),
        fetchJson('/api/reviews/renter')
      ]);
      setProfile(profileData);
      setBookings(bookingsData);
      setReviews(reviewsData);
      setLoginRequired(false);
    } catch (error) {
      setLoginRequired(true);
      setProfile(null);
      setBookings([]);
      setReviews([]);
    }
  };

  const handleLogout = async () => {
    await logout();
    setLoginRequired(true);
    setProfile(null);
    setBookings([]);
    setReviews([]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Profiili"
          subtitle={profile ? `Tervehdys, ${profile.email}` : 'Kirjaudu sisään nähdäksesi varauksesi'}
          actionLabel={profile ? 'Kirjaudu ulos' : 'Kirjaudu'}
          onAction={profile ? handleLogout : () => navigation.navigate('Auth')}
        />
        {loginRequired ? (
          <View style={styles.card}>
            <Text style={styles.info}>Kirjaudu sisään nähdäksesi varaukset ja arvostelut.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.primaryButtonText}>Kirjaudu</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Omat varaukset</Text>
              <FlatList
                data={bookings}
                keyExtractor={(i) => i.id}
                ListEmptyComponent={<Text style={styles.emptyText}>Ei varauksia.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <Text style={styles.itemTitle}>{item.productId}</Text>
                    <Text style={styles.itemMeta}>{item.name} — {item.email}</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sinulle annetut arvostelut</Text>
              <FlatList
                data={reviews}
                keyExtractor={(i) => i.id}
                ListEmptyComponent={<Text style={styles.emptyText}>Ei arvosteluja vielä.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <Text style={styles.itemTitle}>{item.reviewer} — {item.rating}/5</Text>
                    <Text style={styles.itemMeta}>{item.comment}</Text>
                  </View>
                )}
              />
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('RenterReview')}>
              <Text style={styles.primaryButtonText}>Arvioi vuokraaja</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, color: '#0f2f3d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#e3eaef' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f2f3d' },
  info: { color: '#556b7a', marginBottom: 16, lineHeight: 22 },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f4f6' },
  itemTitle: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  itemMeta: { color: '#556b7a', lineHeight: 20 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#777', marginTop: 8 }
});
