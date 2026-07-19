import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
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

  const handleRefund = async (bookingId) => {
    try {
      await fetchJson(`/api/bookings/${bookingId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'customer_request' })
      });
      Alert.alert('Palautus kirjattu', 'Mock-palautus tehtiin onnistuneesti.');
      fetchMyData();
    } catch (error) {
      Alert.alert('Palautus epaonnistui', error.message);
    }
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
                    <Text style={styles.itemTitle}>{item.product?.name || item.productId}</Text>
                    <Text style={styles.itemMeta}>{item.name} — {item.email}</Text>
                    <Text style={styles.itemMeta}>Varaus: {item.bookingStatus} · Maksu: {item.paymentStatus}</Text>
                    <Text style={styles.itemMeta}>{item.paymentSummary}</Text>
                    {item.refundedAt ? <Text style={styles.itemMeta}>Palautettu: {new Date(item.refundedAt).toLocaleString()}</Text> : null}
                    {item.paymentStatus === 'paid' ? (
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRefund(item.id)}>
                        <Text style={styles.secondaryButtonText}>Tee mock-palautus</Text>
                      </TouchableOpacity>
                    ) : null}
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
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => navigation.navigate('FeedbackReports')}>
              <Text style={styles.secondaryActionButtonText}>Katso virheraportit</Text>
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
  secondaryActionButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#d7dfe6' },
  secondaryActionButtonText: { color: '#0f2f3d', fontWeight: '700' },
  secondaryButton: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#15948b', paddingVertical: 8, paddingHorizontal: 12 },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
  emptyText: { color: '#777', marginTop: 8 }
});
