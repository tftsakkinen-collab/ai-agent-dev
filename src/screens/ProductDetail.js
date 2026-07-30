import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import Toast from '../components/Toast';
import ScreenHeader from '../components/ScreenHeader';
import { getFavorites, addFavorite, removeFavorite, fetchJson } from '../lib/api';
import Icon from 'react-native-vector-icons/Feather';

export default function ProductDetail({ route, navigation }) {
  const { product: initialProduct, productId: paramProductId, id: routeId } = route.params || {};
  const targetId = paramProductId || routeId || (initialProduct ? initialProduct.id : null);

  const [product, setProduct] = useState(initialProduct || null);
  const [loadingProduct, setLoadingProduct] = useState(!initialProduct && Boolean(targetId));

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // 2. FETCH PRODUCT INDEPENDENTLY FROM API BY URL PARAM ID
  useEffect(() => {
    if (targetId) {
      setLoadingProduct(!product);
      fetchJson('/api/products')
        .then((allProducts) => {
          const found = allProducts.find(p => String(p.id).toLowerCase() === String(targetId).toLowerCase());
          if (found) {
            setProduct(found);
          }
        })
        .catch((err) => {
          console.error('[ProductDetail] Error fetching product:', err);
        })
        .finally(() => {
          setLoadingProduct(false);
        });
    }
  }, [targetId]);

  useEffect(() => {
    checkFavorite();
  }, [product]);

  const checkFavorite = async () => {
    try {
      if (product) {
        const favs = await getFavorites();
        setIsFavorite(favs.includes(product.id));
      }
    } catch (e) {
      // Not logged in or error
    }
  };

  const toggleFavorite = async () => {
    try {
      if (!product) return;
      if (isFavorite) {
        await removeFavorite(product.id);
        setIsFavorite(false);
        setToastMessage('Poistettu suosikeista');
      } else {
        await addFavorite(product.id);
        setIsFavorite(true);
        setToastMessage('Lisätty suosikkeihin');
      }
      setToastVisible(true);
    } catch (e) {
      setToastMessage('Kirjaudu sisään ensin');
      setToastVisible(true);
    }
  };

  const today = new Date();
  const getDayStr = (offset) => {
    const d = new Date();
    d.setDate(today.getDate() + offset);
    return `${d.getDate()}.${d.getMonth() + 1}.`;
  };
  const dates = [
    `Tänään (${getDayStr(0)})`,
    `Huomenna (${getDayStr(1)})`,
    `Ylihuomenna (${getDayStr(2)})`
  ];
  const times = ['09:00 - 12:00', '12:00 - 15:00', '15:00 - 18:00', '18:00 - 21:00', 'Koko päivä'];

  if (loadingProduct) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#15948b" />
          <Text style={styles.loadingText}>Ladataan laudan tietoja...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Tuotetta ei löytynyt" onBack={() => navigation.goBack()} />
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundText}>Haluamaasi lautaa ({targetId || 'undefined'}) ei löytynyt valikoimasta.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.primaryButtonText}>Palaa etusivulle</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={product.name}
          actionLabel={isFavorite ? '❤️ Suosikki' : '🤍 Lisää suosikkeihin'}
          onAction={toggleFavorite}
          onBack={() => navigation.goBack()}
        />

        {Array.isArray(product.photos) && product.photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {product.photos.map((photo, index) => (
              <Image key={index} source={{ uri: photo }} style={styles.productPhoto} />
            ))}
          </ScrollView>
        ) : null}

        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>{product.type ? product.type.replace('_', ' ') : 'SUP-lauta'}</Text>
            </View>
          </View>
          <Text style={styles.provider}>Tarjoaja: {product.provider?.name || 'GearSpot Oulu'}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.price}>{product.price}</Text>
            <Text style={styles.rating}>★ {product.rating || 4.9} / 5</Text>
          </View>

          <Text style={styles.desc}>{product.description || product.short}</Text>

          {product.locationName ? (
            <View style={styles.locationContainer}>
              <Text style={styles.locationTitle}>📍 Noutopiste Oulussa:</Text>
              <Text style={styles.locationValue}>{product.locationName}</Text>
            </View>
          ) : null}

          {product.provider ? (
            <TouchableOpacity
              style={styles.providerCard}
              onPress={() => navigation.navigate('ProviderDetail', { provider: product.provider })}
            >
              <Text style={styles.providerCardTitle}>Tietoa vuokraajasta:</Text>
              <Text style={styles.providerCardName}>{product.provider.name}</Text>
              <Text style={styles.providerCardRating}>★ {product.provider.rating} / 5</Text>
              <Text style={styles.providerCardLink}>Katso vuokraajan kaikki kohteet →</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* CALENDAR & TIME SELECTOR */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 1. Valitse noutopäivämäärä</Text>
          <View style={styles.optionsRow}>
            {dates.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.optionChip, selectedDate === d && styles.optionChipSelected]}
                onPress={() => setSelectedDate(d)}
              >
                <Text style={[styles.optionText, selectedDate === d && styles.optionTextSelected]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.cardTitle, { marginTop: 16 }]}>⏰ 2. Valitse aikaikkuna</Text>
          <View style={styles.optionsRow}>
            {times.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.optionChip, selectedTime === t && styles.optionChipSelected]}
                onPress={() => setSelectedTime(t)}
              >
                <Text style={[styles.optionText, selectedTime === t && styles.optionTextSelected]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CONTINUE TO BOOKING */}
        <TouchableOpacity
          style={[styles.primaryButton, (!selectedDate || !selectedTime) && styles.buttonDisabled]}
          disabled={!selectedDate || !selectedTime}
          onPress={() =>
            navigation.navigate('Booking', {
              product,
              selectedDate,
              selectedTime
            })
          }
        >
          <Text style={styles.primaryButtonText}>
            {!selectedDate || !selectedTime ? 'Valitse päivä ja aika jatkaaksesi' : 'Jatka varaukseen & lisävarusteisiin →'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Toast message={toastMessage} visible={toastVisible} onDismiss={() => setToastVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f4f7' },
  container: { padding: 16, paddingBottom: 50 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 14, color: '#556b7a', fontSize: 14, fontWeight: '600' },
  notFoundContainer: { padding: 30, alignItems: 'center' },
  notFoundText: { color: '#4a6070', fontSize: 14, marginBottom: 20, textAlign: 'center' },
  photoScroll: { marginBottom: 16 },
  productPhoto: { width: 280, height: 180, borderRadius: 16, marginRight: 12 },
  card: { backgroundColor: '#ffffff', borderRadius: 18, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e2ebf0' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f2f3d', flex: 1, marginRight: 8 },
  typeBadge: { backgroundColor: '#e6f7f5', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#15948b' },
  typeText: { fontSize: 11, color: '#0e6962', fontWeight: '800', textTransform: 'uppercase' },
  provider: { fontSize: 12, color: '#556b7a', marginBottom: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  price: { fontSize: 20, fontWeight: '900', color: '#15948b' },
  rating: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  desc: { color: '#4a6070', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  locationContainer: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, marginBottom: 14, borderWidth: 1, borderColor: '#e2ebf0' },
  locationTitle: { fontSize: 12, fontWeight: '800', color: '#0f2f3d', marginBottom: 4 },
  locationValue: { fontSize: 13, color: '#4a6070', fontWeight: '600' },
  providerCard: { backgroundColor: '#f0f7fa', padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#cbe0eb' },
  providerCardTitle: { fontSize: 11, fontWeight: '800', color: '#556b7a', uppercase: true, marginBottom: 4 },
  providerCardName: { fontSize: 15, fontWeight: '800', color: '#0f2f3d' },
  providerCardRating: { fontSize: 12, fontWeight: '700', color: '#d97706', marginBottom: 6 },
  providerCardLink: { fontSize: 12, color: '#15948b', fontWeight: '800' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#0f2f3d', marginBottom: 10 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { backgroundColor: '#f0f4f7', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#d2dfa6' },
  optionChipSelected: { backgroundColor: '#15948b', borderColor: '#15948b' },
  optionText: { color: '#4a6070', fontSize: 13, fontWeight: '700' },
  optionTextSelected: { color: '#ffffff', fontWeight: '800' },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' }
});
