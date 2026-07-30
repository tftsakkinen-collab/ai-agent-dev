import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Image } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  claimBookingDeposit,
  fetchJson,
  getBookingReviews,
  logout,
  releaseBookingDeposit,
  setupBookingDeposit,
  submitBookingReview,
  updateBookingLifecycle,
  uploadBookingEvidence
} from '../lib/api';

export default function ProfileScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [favorites, setFavorites] = useState([]);

  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    fetchMyData();
  }, [user]);

  const fetchMyData = async () => {
    if (!user) {
      setLoginRequired(true);
      setProfile(null);
      setBookings([]);
      setReviews([]);
      setFavorites([]);
      return;
    }

    setLoginRequired(false);
    setProfile(user);
    setEditName(user.name || '');
    setEditPhone(user.phone || '');

    try {
      const notifsResponse = await fetchJson('/api/notifications').catch(() => []);
      if (Array.isArray(notifsResponse)) setNotifications(notifsResponse);

      const [bookingsData, reviewsData, favoritesData] = await Promise.all([
        fetchJson('/api/bookings').catch(() => []),
        fetchJson('/api/reviews/renter').catch(() => []),
        fetchJson('/api/favorites').catch(() => []),
      ]);
      setFavorites(favoritesData || []);
      setBookings(bookingsData || []);
      setReviews(reviewsData || []);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await fetchJson('/api/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      setProfile({ ...profile, name: editName, phone: editPhone });
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Virhe', 'Profiilin päivitys epäonnistui');
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

  const runBookingAction = async (bookingId, actionName, actionFn) => {
    try {
      await actionFn();
      Alert.alert('Toiminto onnistui', actionName);
      fetchMyData();
    } catch (error) {
      Alert.alert('Toiminto epäonnistui', error.message);
    }
  };

  const renderBookingActions = (item) => {
    const actions = [];
    const stage = item.bookingStage;

    if (stage === 'approved') {
      actions.push(
        <TouchableOpacity
          key="handoff-setup"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Luovutustapa asetettu', () => updateBookingLifecycle(item.id, 'handoff/setup', { handoffMethod: 'in_person' }))}
        >
          <Text style={styles.microButtonText}>Aseta luovutus (in person)</Text>
        </TouchableOpacity>
      );
    }

    if (stage === 'awaiting_handoff' || stage === 'in_use') {
      actions.push(
        <TouchableOpacity
          key="handoff-owner"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Owner handoff vahvistettu', () => updateBookingLifecycle(item.id, 'handoff/confirm', { actor: 'owner' }))}
        >
          <Text style={styles.microButtonText}>Vahvista luovutus (owner)</Text>
        </TouchableOpacity>
      );
      actions.push(
        <TouchableOpacity
          key="handoff-renter"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Renter handoff vahvistettu', () => updateBookingLifecycle(item.id, 'handoff/confirm', { actor: 'renter' }))}
        >
          <Text style={styles.microButtonText}>Vahvista luovutus (renter)</Text>
        </TouchableOpacity>
      );
    }

    if (stage === 'in_use') {
      actions.push(
        <TouchableOpacity
          key="return-request"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Palautuspyyntö lähetetty', () => updateBookingLifecycle(item.id, 'return/request'))}
        >
          <Text style={styles.microButtonText}>Pyydä palautus</Text>
        </TouchableOpacity>
      );
    }

    if (stage === 'awaiting_return') {
      actions.push(
        <TouchableOpacity
          key="return-confirm"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Palautus vahvistettu', () => updateBookingLifecycle(item.id, 'return/confirm'))}
        >
          <Text style={styles.microButtonText}>Vahvista palautus</Text>
        </TouchableOpacity>
      );
    }

    if (stage === 'returned' || stage === 'disputed') {
      actions.push(
        <TouchableOpacity
          key="complete"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Varaus päätetty', () => updateBookingLifecycle(item.id, 'complete'))}
        >
          <Text style={styles.microButtonText}>Merkitse completed</Text>
        </TouchableOpacity>
      );
    }

    if (stage !== 'completed' && stage !== 'disputed') {
      actions.push(
        <TouchableOpacity
          key="dispute"
          style={[styles.microButton, styles.microButtonWarn]}
          onPress={() => runBookingAction(item.id, 'Riitautus avattu', () => updateBookingLifecycle(item.id, 'dispute', { reason: 'damage_suspected' }))}
        >
          <Text style={styles.microButtonWarnText}>Avaa riitautus</Text>
        </TouchableOpacity>
      );
    }

    if (item.depositStatus === 'not_required') {
      actions.push(
        <TouchableOpacity
          key="deposit-setup"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Pantti asetettu (120)', () => setupBookingDeposit(item.id, 120))}
        >
          <Text style={styles.microButtonText}>Aseta pantti 120 EUR</Text>
        </TouchableOpacity>
      );
    }

    if (item.depositStatus === 'held') {
      actions.push(
        <TouchableOpacity
          key="deposit-release"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Pantti vapautettu', () => releaseBookingDeposit(item.id))}
        >
          <Text style={styles.microButtonText}>Vapauta pantti</Text>
        </TouchableOpacity>
      );
      actions.push(
        <TouchableOpacity
          key="deposit-claim"
          style={[styles.microButton, styles.microButtonWarn]}
          onPress={() => runBookingAction(item.id, 'Pantti vaadittu osittain', () => claimBookingDeposit(item.id, 60, 'damage_after_rental'))}
        >
          <Text style={styles.microButtonWarnText}>Claim pantti 60 EUR</Text>
        </TouchableOpacity>
      );
    }

    actions.push(
      <TouchableOpacity
        key="evidence-before"
        style={styles.microButton}
        onPress={() => runBookingAction(item.id, 'Ennen-kuva lisätty', () => uploadBookingEvidence(item.id, 'before', [`https://example.com/before-${item.id}.jpg`]))}
      >
        <Text style={styles.microButtonText}>Lisää before-kuva</Text>
      </TouchableOpacity>
    );
    actions.push(
      <TouchableOpacity
        key="evidence-after"
        style={styles.microButton}
        onPress={() => runBookingAction(item.id, 'Jälkeen-kuva lisätty', () => uploadBookingEvidence(item.id, 'after', [`https://example.com/after-${item.id}.jpg`]))}
      >
        <Text style={styles.microButtonText}>Lisää after-kuva</Text>
      </TouchableOpacity>
    );

    if (stage === 'completed') {
      actions.push(
        <TouchableOpacity
          key="review-renter"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Renter-arvio lähetetty', () => submitBookingReview(item.id, 'renter', 5, 'Sujuva varauskokemus.'))}
        >
          <Text style={styles.microButtonText}>Lähetä renter-review</Text>
        </TouchableOpacity>
      );
      actions.push(
        <TouchableOpacity
          key="review-owner"
          style={styles.microButton}
          onPress={() => runBookingAction(item.id, 'Owner-arvio lähetetty', () => submitBookingReview(item.id, 'owner', 4, 'Palautus ajallaan.'))}
        >
          <Text style={styles.microButtonText}>Lähetä owner-review</Text>
        </TouchableOpacity>
      );
      actions.push(
        <TouchableOpacity
          key="review-check"
          style={styles.microButton}
          onPress={async () => {
            try {
              const data = await getBookingReviews(item.id);
              Alert.alert('Review näkyvyys', `Tila: ${data.visibility}\nArvioita näkyvissä: ${data.reviews?.length || 0}`);
              fetchMyData();
            } catch (error) {
              Alert.alert('Review-haku epäonnistui', error.message);
            }
          }}
        >
          <Text style={styles.microButtonText}>Tarkista review-tila</Text>
        </TouchableOpacity>
      );
    }

    return <View style={styles.actionGrid}>{actions}</View>;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Profiili"
          subtitle={profile ? `Tervehdys, ${profile.name || profile.email}` : 'Kirjaudu sisään nähdäksesi varauksesi'}
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.sectionTitle}>Omat tiedot</Text>
                <TouchableOpacity onPress={() => isEditing ? handleSaveProfile() : setIsEditing(true)}>
                  <Text style={{ color: '#15948b', fontWeight: 'bold' }}>{isEditing ? 'Tallenna' : 'Muokkaa'}</Text>
                </TouchableOpacity>
              </View>
              {isEditing ? (
                <View>
                  <Text style={styles.inputLabel}>Nimi</Text>
                  <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Etunimi Sukunimi" />
                  <Text style={styles.inputLabel}>Puhelinnumero</Text>
                  <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} placeholder="040 123 4567" keyboardType="phone-pad" />
                </View>
              ) : (
                <View>
                  <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                     <Image source={{uri: profile?.avatarUrl || 'https://via.placeholder.com/150'}} style={{width: 50, height: 50, borderRadius: 25, marginRight: 15}} />
                     <View>
                       <Text style={styles.info}>Nimi: {profile?.name || 'Ei asetettu'}</Text>
                       <Text style={styles.info}>Puhelin: {profile?.phone || 'Ei asetettu'}</Text>
                     </View>
                  </View>
                  <Text style={styles.info}>Sähköposti: {profile?.email}</Text>
                </View>
              )}
            </View>

            {favorites && favorites.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Suosikit</Text>
                {favorites.map(favId => (
                  <TouchableOpacity key={favId} style={styles.item} onPress={() => navigation.navigate('ProductDetail', { product: {id: favId} })}>
                    <Text style={styles.itemTitle}>{favId}</Text>
                    <Text style={styles.itemMeta}>Tallennettu suosikkeihin</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.card}>
            {notifications.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ilmoitukset</Text>
                {notifications.map(n => (
                  <View key={n.id} style={[styles.itemCard, !n.read && { borderColor: '#1abc9c', borderWidth: 2 }]}>
                    <Text style={styles.itemTitle}>{n.message}</Text>
                    <Text style={styles.itemMeta}>{new Date(n.createdAt).toLocaleString()}</Text>
                  </View>
                ))}
              </View>
            )}
              <Text style={styles.sectionTitle}>Omat varaukset</Text>
              <FlatList
                data={bookings}
                keyExtractor={(i) => i.id}
                ListEmptyComponent={<Text style={styles.emptyText}>Ei varauksia.</Text>}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <Text style={styles.itemTitle}>{item.product?.name || item.productId}</Text>
                    <Text style={styles.itemMeta}>{item.name} — {item.email}</Text>
                    {item.selectedDate && item.selectedTime ? (
                      <Text style={styles.itemMeta}>Aika: {item.selectedDate} klo {item.selectedTime}</Text>
                    ) : null}
                    <Text style={styles.itemMeta}>Varaus: {item.bookingStatus} · Maksu: {item.paymentStatus}</Text>
                    <Text style={styles.itemMeta}>Stage: {item.bookingStage || 'approved'}</Text>
                    <Text style={styles.itemMeta}>Pantti: {item.depositStatus || 'not_required'} ({item.depositAmount || 0} EUR)</Text>
                    {item.reviewFlow ? <Text style={styles.itemMeta}>Review näkyvyys: {item.reviewFlow.visibility}</Text> : null}
                    <Text style={styles.itemMeta}>{item.paymentSummary}</Text>
                    {item.refundedAt ? <Text style={styles.itemMeta}>Palautettu: {new Date(item.refundedAt).toLocaleString()}</Text> : null}
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Chat', { bookingId: item.id, productTitle: item.product?.name })}>
                        <Text style={styles.secondaryButtonText}>Viestit</Text>
                      </TouchableOpacity>
                    {item.paymentStatus === 'paid' ? (
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => handleRefund(item.id)}>
                        <Text style={styles.secondaryButtonText}>Tee mock-palautus</Text>
                      </TouchableOpacity>
                    ) : null}
                    {renderBookingActions(item)}
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
            <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('BecomeHost')}>
              <Text style={styles.primaryButtonText}>Ala vuokraajaksi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => navigation.navigate('FeedbackReports')}>
              <Text style={styles.secondaryActionButtonText}>Katso virheraportit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionButton} onPress={() => navigation.navigate('AdminOps')}>
              <Text style={styles.secondaryActionButtonText}>Avaa admin-työkalut</Text>
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
  info: { color: '#556b7a', marginBottom: 8, lineHeight: 22 },
  inputLabel: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  input: { borderWidth: 1, borderColor: '#d7dfe6', borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: '#f8fbfc' },
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f4f6' },
  itemTitle: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  itemMeta: { color: '#556b7a', lineHeight: 20 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryActionButton: { backgroundColor: '#fff', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#d7dfe6' },
  secondaryActionButtonText: { color: '#0f2f3d', fontWeight: '700' },
  secondaryButton: { alignSelf: 'flex-start', marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#15948b', paddingVertical: 8, paddingHorizontal: 12 },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  microButton: {
    borderWidth: 1,
    borderColor: '#cfd9df',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f8fbfd'
  },
  microButtonText: { color: '#284451', fontSize: 12, fontWeight: '700' },
  microButtonWarn: { borderColor: '#f2b4a9', backgroundColor: '#fff6f3' },
  microButtonWarnText: { color: '#b33b23', fontSize: 12, fontWeight: '700' },
  emptyText: { color: '#777', marginTop: 8 },

  section: { marginBottom: 20 },
  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#e3eaef' },

});
