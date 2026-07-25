import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BookingItem({ item, navigation, renderActions }) {
  return (
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

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Chat', { bookingId: item.id, productTitle: item.product?.name })}>
            <Text style={styles.secondaryButtonText}>Viestit</Text>
        </TouchableOpacity>
        {/* Mock-palautus poistettu */}
      </View>

      {renderActions && renderActions(item)}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f4f6' },
  itemTitle: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  itemMeta: { color: '#556b7a', lineHeight: 20 },
  actionRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  secondaryButton: { borderRadius: 12, borderWidth: 1, borderColor: '#15948b', paddingVertical: 8, paddingHorizontal: 12 },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
});
