import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { fetchWithAuth } from '../lib/api';

export default function ProfileScreen() {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    fetchWithAuth('http://localhost:3000/api/bookings')
      .then(r => r.json())
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Omat varaukset</Text>
      <FlatList
        data={bookings}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.productId}</Text>
            <Text>{item.name} — {item.email}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  item: { padding: 8, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontWeight: '600' }
});
