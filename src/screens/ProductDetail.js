import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function ProductDetail({ route, navigation }) {
  const { product } = route.params || {};

  if (!product) return <Text>Tuotetta ei löydy.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{product.name}</Text>
      <Text style={styles.short}>{product.short}</Text>
      <Text style={styles.price}>{product.price}</Text>
      <Button title="Varaa" onPress={() => navigation.navigate('Booking', { product })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  short: { color: '#444', marginBottom: 8 },
  price: { color: '#111', marginBottom: 12 }
});
