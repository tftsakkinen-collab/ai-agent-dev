import React from 'react';
import { View, StyleSheet } from 'react-native';

export default function SkeletonCard() {
  return (
    <View style={styles.card} accessibilityLabel="Ladataan sisältöä" accessibilityRole="progressbar">
      <View style={styles.headerRow}>
        <View style={styles.titleLine} />
        <View style={styles.badgeLine} />
      </View>
      <View style={styles.subTitleLine} />
      <View style={styles.descLine} />
      <View style={styles.descLineShort} />
      <View style={styles.metaRow}>
        <View style={styles.ratingBox} />
        <View style={styles.priceBox} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 140,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2ebf0',
    opacity: 0.6
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  titleLine: { width: '55%', height: 18, backgroundColor: '#e2ebf0', borderRadius: 6 },
  badgeLine: { width: '25%', height: 18, backgroundColor: '#e6f7f5', borderRadius: 6 },
  subTitleLine: { width: '40%', height: 12, backgroundColor: '#e2ebf0', borderRadius: 4, marginBottom: 12 },
  descLine: { width: '90%', height: 12, backgroundColor: '#e2ebf0', borderRadius: 4, marginBottom: 6 },
  descLineShort: { width: '65%', height: 12, backgroundColor: '#e2ebf0', borderRadius: 4, marginBottom: 14 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f5f8' },
  ratingBox: { width: '35%', height: 24, backgroundColor: '#e6f7f5', borderRadius: 8 },
  priceBox: { width: '30%', height: 24, backgroundColor: '#e2ebf0', borderRadius: 8 }
});
