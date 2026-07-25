import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function FavoriteItem({ favId, onPress }) {
  return (
    <TouchableOpacity style={styles.item} onPress={onPress}>
      <Text style={styles.itemTitle}>{favId}</Text>
      <Text style={styles.itemMeta}>Tallennettu suosikkeihin</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f1f4f6' },
  itemTitle: { fontWeight: '700', marginBottom: 4, color: '#0f2f3d' },
  itemMeta: { color: '#556b7a', lineHeight: 20 },
});
