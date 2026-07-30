import React, { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useLanguage } from '../contexts/LanguageContext';
import { postDemandLead } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import SkeletonCard from './SkeletonCard';

export default function ProductList({ products = [], loading = false, selectedLocation = 'Oulu', navigation }) {
  const { lang, t } = useLanguage();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

  const handleLeadSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      return showToast(
        lang === 'fi' ? 'Virheellinen sähköposti' : 'Invalid email',
        lang === 'fi' ? 'Syötä toimiva sähköpostiosoite.' : 'Please enter a valid email address.'
      );
    }

    setSubmittingLead(true);
    try {
      await postDemandLead(email.trim(), selectedLocation);
      setLeadSubmitted(true);
      showToast(
        lang === 'fi' ? 'Kiitos ilmoittautumisesta!' : 'Thank you for subscribing!',
        lang === 'fi'
          ? `Ilmoitamme sinulle heti kun ensimmäinen lauta vapautuu alueelle ${selectedLocation}.`
          : `We will notify you as soon as the first board becomes available in ${selectedLocation}.`
      );
    } catch (err) {
      showToast('Virhe', err.message);
    } finally {
      setSubmittingLead(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.listContainer}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const typeLabel = item.type ? item.type.replace('_', ' ') : 'Varuste';
    const providerName = item.provider?.name || 'GearSpot Oulu';
    const ratingValue = item.rating || 4.9;
    const reviewCount = item.reviewCount || 12;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation?.navigate('ProductDetail', { product: item })}
        activeOpacity={0.8}
        accessibilityLabel={`${item.name}, hinta ${item.price}`}
        accessibilityRole="button"
      >
        <View style={styles.cardHeader}>
          <View style={styles.nameColumn}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.locationRow}>
              <Icon name="map-pin" size={13} color="#556b7a" style={{ marginRight: 4 }} accessibilityLabel="Noutopiste" />
              <Text style={styles.provider}>{item.locationName || 'Oulu'} • {t('providerTag')}: {providerName}</Text>
            </View>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{typeLabel}</Text>
          </View>
        </View>

        <Text style={styles.desc} numberOfLines={2}>{item.short}</Text>

        <View style={styles.metaRow}>
          <View style={styles.ratingBadge}>
            <Icon name="star" size={13} color="#0e6962" style={{ marginRight: 4 }} accessibilityLabel="Arvostelutähdet" />
            <Text style={styles.ratingValue}>{ratingValue}</Text>
            <Text style={styles.reviewCount}>({reviewCount} {t('reviewsCount')})</Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>{t('priceFrom')}</Text>
            <Text style={styles.price}>{item.price}</Text>
          </View>
        </View>

        {Array.isArray(item.photos) && item.photos.length ? (
          <View style={styles.photoRow}>
            <Icon name="camera" size={12} color="#7a8e9c" style={{ marginRight: 4 }} accessibilityLabel="Valokuvat" />
            <Text style={styles.photoCount}>{item.photos.length} {t('photosCount')}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  // 1. ACTIVE DEMAND LEAD CAPTURE FORM WHEN NO PRODUCTS ARE AVAILABLE
  if (products.length === 0) {
    return (
      <View style={styles.leadCaptureCard} accessibilityLabel="Kysynnän ilmoittautumislomake">
        <View style={styles.leadHeaderRow}>
          <Icon name="bell" size={20} color="#0e6962" style={{ marginRight: 8 }} accessibilityLabel="Ilmoitusikoni" />
          <Text style={styles.leadTitle}>
            {lang === 'fi' ? 'Oletko ensimmäisten joukossa?' : 'Want to be notified first?'}
          </Text>
        </View>

        <Text style={styles.leadSubtitle}>
          {lang === 'fi'
            ? `Laudat ilmestyvät pian valitsemallesi alueelle (${selectedLocation}) — jätä sähköpostisi niin ilmoitamme heti kun ensimmäinen lauta on saatavilla lähelläsi.`
            : `SUP boards are arriving soon to ${selectedLocation} — leave your email and we will notify you the moment the first board becomes available near you.`}
        </Text>

        {leadSubmitted ? (
          <View style={styles.successBox}>
            <Icon name="check-circle" size={16} color="#0e6962" style={{ marginRight: 6 }} accessibilityLabel="Vahvistusilmoitus" />
            <Text style={styles.successText}>
              {lang === 'fi' ? 'Sähköposti tallennettu! Ilmoitamme sinulle ensimmäisenä.' : 'Email saved! We will notify you first.'}
            </Text>
          </View>
        ) : (
          <View style={styles.leadInputRow}>
            <TextInput
              style={styles.leadInput}
              placeholder={lang === 'fi' ? 'Anna sähköpostiosoitteesi...' : 'Enter your email...'}
              placeholderTextColor="#8699a6"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Sähköpostiosoitteen syöttökenttä"
            />
            <TouchableOpacity
              style={[styles.leadSubmitBtn, submittingLead && styles.disabledBtn]}
              onPress={handleLeadSubmit}
              disabled={submittingLead}
              accessibilityLabel="Ilmoita minulle"
              accessibilityRole="button"
            >
              <Text style={styles.leadSubmitBtnText}>
                {lang === 'fi' ? 'Ilmoita minulle' : 'Notify me'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {products.map((item) => (
        <React.Fragment key={item.id}>
          {renderItem({ item })}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: { marginTop: 8 },
  card: {
    minHeight: 140,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    shadowColor: '#0f2f3d',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nameColumn: { flex: 1, marginRight: 10 },
  name: { fontSize: 17, fontWeight: '800', marginBottom: 4, color: '#0f2f3d' },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  provider: { fontSize: 12, color: '#556b7a', fontWeight: '500' },
  typeBadge: { backgroundColor: '#e6f7f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#15948b' },
  typeText: { fontSize: 11, color: '#0e6962', fontWeight: '800', textTransform: 'uppercase' },
  desc: { color: '#4a6070', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f7f5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: '#15948b' },
  ratingValue: { color: '#0e6962', fontWeight: '800', fontSize: 13, marginRight: 4 },
  reviewCount: { color: '#0e6962', fontSize: 11, fontWeight: '700' },
  priceContainer: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, color: '#7a8e9c', fontWeight: '700' },
  price: { color: '#15948b', fontSize: 17, fontWeight: '800' },
  photoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  photoCount: { color: '#7a8e9c', fontSize: 11, fontWeight: '600' },

  // ACTIVE DEMAND LEAD CAPTURE FORM STYLES
  leadCaptureCard: {
    backgroundColor: '#e6f7f5',
    borderColor: '#15948b',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginVertical: 12,
    shadowColor: '#0f2f3d',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  leadHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  leadTitle: { fontSize: 17, fontWeight: '800', color: '#0f2f3d' },
  leadSubtitle: { fontSize: 13, color: '#4a6070', lineHeight: 20, marginBottom: 16 },
  leadInputRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  leadInput: {
    flex: 1,
    minWidth: 200,
    minHeight: 46,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#15948b',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0f2f3d'
  },
  leadSubmitBtn: {
    minHeight: 46,
    backgroundColor: '#15948b',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  leadSubmitBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  disabledBtn: { opacity: 0.6 },
  successBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#15948b' },
  successText: { color: '#0e6962', fontSize: 13, fontWeight: '800' }
});
