import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export default function WeatherWarning({ windSpeed, isSafe, location }) {
  return (
    <View style={styles.guaranteeContainer}>
      <View style={styles.badgeRow}>
        <Icon name="shield" size={16} color="#0e6962" style={{ marginRight: 6 }} />
        <Text style={styles.badgeText}>100 % SÄÄN TAKUU SISÄLTYY VARAUKSEEN</Text>
      </View>
      <Text style={styles.guaranteeTitle}>Varaa täysin ilman sääriskiä</Text>
      <Text style={styles.guaranteeText}>
        Jos tuulennopeus Oulussa ({location || 'Nallikari/Tuira'}) ylittää 7 m/s tai sää muuttuu turvattomaksi varauksesi aikana, voit <Text style={styles.boldText}>siirtää ajankohtaa ilmaiseksi</Text> tai <Text style={styles.boldText}>perua varauksen 100 % ilmaisella palautuksella</Text>.
      </Text>

      {isSafe === false ? (
        <View style={styles.warningAlertBox}>
          <View style={styles.alertHeaderRow}>
            <Icon name="alert-triangle" size={14} color="#856404" style={{ marginRight: 6 }} />
            <Text style={styles.alertTitle}>SÄÄHUOMIO (Tuuli {windSpeed || '8-12'} m/s)</Text>
          </View>
          <Text style={styles.alertText}>
            Tuulennopeus on koholla. Voit tehdä varauksen normaalisti sääntakuun piiriin tai valita tyynemmän kellonajan Oulujoella.
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
    borderRadius: 16,
    marginVertical: 12,
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  badgeText: { color: '#0e6962', fontWeight: '800', fontSize: 11, letterSpacing: 0.5, uppercase: true },
  guaranteeTitle: { fontSize: 16, fontWeight: '800', color: '#0f2f3d', marginBottom: 6 },
  guaranteeText: { color: '#4a6070', fontSize: 12, lineHeight: 18 },
  boldText: { fontWeight: '800', color: '#0f2f3d' },
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
