import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useLanguage } from '../contexts/LanguageContext';

export default function WeatherWarning({ windSpeed, isSafe, location = 'Nallikari', onSwapLocation }) {
  const { lang } = useLanguage();
  const [swapped, setSwapped] = useState(false);

  const isWindyLocation = location.toLowerCase().includes('nallikari') || location.toLowerCase().includes('mer');
  const shelteredSpot = 'Tuira (Oulujoki)';

  const handleSwap = () => {
    setSwapped(true);
    if (onSwapLocation) {
      onSwapLocation('Tuira (Oulujoki)');
    }
  };

  return (
    <View style={styles.guaranteeContainer} accessibilityLabel="Sään varasuunnitelma">
      <View style={styles.badgeRow}>
        <Icon name="shield" size={16} color="#0e6962" style={{ marginRight: 6 }} accessibilityLabel="Turvallisuuskuvake" />
        <Text style={styles.badgeText}>
          {lang === 'fi' ? '100 % SÄÄN TAKUU & VARASUUNNITELMA' : '100% WEATHER GUARANTEE & BACKUP PLAN'}
        </Text>
      </View>

      <Text style={styles.guaranteeTitle}>
        {lang === 'fi' ? 'Varaa täysin ilman sääriskiä' : 'Book completely risk-free'}
      </Text>

      <Text style={styles.guaranteeText}>
        {lang === 'fi'
          ? `Jos tuulennopeus Oulussa (${location}) ylittää 7 m/s, voit siirtää ajankohtaa ilmaiseksi tai perua varauksen 100 % ilmaisella palautuksella.`
          : `If wind speed at ${location} exceeds 7 m/s, change your date for free or cancel with 100% refund.`}
      </Text>

      {/* 2. INTERACTIVE WEATHER BACKUP PLAN LOCATION SWAP */}
      {isWindyLocation && (
        <View style={styles.backupPlanCard}>
          <View style={styles.backupHeaderRow}>
            <Icon name="wind" size={16} color="#0e6962" style={{ marginRight: 6 }} accessibilityLabel="Tuulitori" />
            <Text style={styles.backupTitle}>
              {lang === 'fi' ? 'Tuulista Nallikarissa? Vaihda suojaisempaan noutopaikkaan' : 'Windy at Nallikari? Switch to sheltered spot'}
            </Text>
          </View>

          <Text style={styles.backupDesc}>
            {lang === 'fi'
              ? `Oulujoen suisto Tuirassa on saarten ansiosta tyyni vaikka merellä tuulisi. Vaihda noutopisteeksi ${shelteredSpot} yhdellä klikkauksella:`
              : `Tuira estuary on Oulu River is calm and sheltered from sea wind. Switch pick-up spot to ${shelteredSpot} in 1-click:`}
          </Text>

          {swapped ? (
            <View style={styles.swappedSuccessBox}>
              <Icon name="check-circle" size={16} color="#0e6962" style={{ marginRight: 6 }} />
              <Text style={styles.swappedSuccessText}>
                {lang === 'fi' ? `Noutopiste vaihdettu: ${shelteredSpot} (Suojaisa)` : `Pick-up spot changed to: ${shelteredSpot}`}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.swapButton}
              onPress={handleSwap}
              activeOpacity={0.8}
              accessibilityLabel="Vaihda noutopaikaksi Tuira"
              accessibilityRole="button"
            >
              <Icon name="refresh-cw" size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.swapButtonText}>
                {lang === 'fi' ? `Vaihda noutopaikaksi ${shelteredSpot} →` : `Switch pick-up spot to ${shelteredSpot} →`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {isSafe === false ? (
        <View style={styles.warningAlertBox}>
          <View style={styles.alertHeaderRow}>
            <Icon name="alert-triangle" size={14} color="#856404" style={{ marginRight: 6 }} />
            <Text style={styles.alertTitle}>SÄÄHUOMIO (Tuuli {windSpeed || '8-12'} m/s)</Text>
          </View>
          <Text style={styles.alertText}>
            Tuulennopeus on koholla merellä. Voit tehdä varauksen normaalisti sääntakuun piiriin tai valita tyynemmän kellonajan Oulujoella.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  guaranteeContainer: {
    backgroundColor: '#e6f7f5',
    borderColor: '#15948b',
    borderWidth: 1.5,
    padding: 16,
    borderRadius: 18,
    marginVertical: 12,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  badgeText: { color: '#0e6962', fontWeight: '800', fontSize: 11, letterSpacing: 0.5, uppercase: true },
  guaranteeTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 6 },
  guaranteeText: { color: '#4a6070', fontSize: 12, lineHeight: 18 },

  // BACKUP PLAN CARD & 1-CLICK LOCATION SWAP
  backupPlanCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#15948b'
  },
  backupHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backupTitle: { fontSize: 13, fontWeight: '800', color: '#0f2f3d' },
  backupDesc: { fontSize: 12, color: '#4a6070', lineHeight: 17, marginBottom: 10 },
  swapButton: {
    minHeight: 44,
    backgroundColor: '#15948b',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14
  },
  swapButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
  swappedSuccessBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7f5',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#15948b'
  },
  swappedSuccessText: { color: '#0e6962', fontSize: 12, fontWeight: '800' },

  warningAlertBox: {
    backgroundColor: '#fff3cd',
    borderColor: '#ffeeba',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginTop: 10
  },
  alertHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  alertTitle: { color: '#856404', fontWeight: '800', fontSize: 12 },
  alertText: { color: '#856404', fontSize: 11, lineHeight: 15 }
});
