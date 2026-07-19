import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BrandLogo from './BrandLogo';

export default function ScreenHeader({ title, subtitle, actionLabel, onAction }) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <BrandLogo size={40} showText={false} />
        <View style={styles.titleWrapper}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {actionLabel ? (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  titleWrapper: { marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '800', color: '#0f2f3d' },
  subtitle: { fontSize: 13, color: '#556b7a', marginTop: 2 },
  actionButton: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#d7dee5' },
  actionText: { color: '#15948b', fontWeight: '700' }
});
