import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { fetchJson } from '../lib/api';

export default function RenterReviewScreen() {
  const [renterEmail, setRenterEmail] = useState('');
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');

  const loadReviews = async () => {
    if (!renterEmail) return Alert.alert('Anna vuokraajan sähköposti.');
    try {
      const data = await fetchJson(`/api/reviews?targetType=renter&targetId=${encodeURIComponent(renterEmail)}`);
      setReviews(data);
    } catch (e) {
      if (e.message === 'Unauthorized') {
        Alert.alert('Kirjaudu sisään ensin.');
      } else {
        Alert.alert('Arvostelujen lataus epäonnistui', e.message);
      }
    }
  };

  const submitReview = async () => {
    if (!renterEmail) return Alert.alert('Anna vuokraajan sähköposti.');
    if (!rating) return Alert.alert('Anna arvosana.');

    try {
      await fetchJson('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'renter', targetId: renterEmail, rating: Number(rating), comment })
      });
      setComment('');
      setRating('5');
      Alert.alert('Arvostelu tallennettu');
      loadReviews();
    } catch (e) {
      if (e.message === 'Unauthorized') {
        Alert.alert('Kirjaudu sisään ensin.');
      } else {
        Alert.alert('Arvostelun luonti epäonnistui', e.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Vuokraajan arvostelu</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Vuokraajan sähköposti</Text>
          <TextInput
            style={styles.input}
            placeholder="esim. jari@example.com"
            value={renterEmail}
            onChangeText={setRenterEmail}
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.fetchButton} onPress={loadReviews}>
            <Text style={styles.fetchButtonText}>Lataa arvostelut</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.section}>Arvostelut</Text>
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Ei arvosteluja.</Text>}
          renderItem={({ item }) => (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewer}>{item.reviewer}</Text>
              <Text style={styles.rating}>Arvio: {item.rating}/5</Text>
              <Text style={styles.comment}>{item.comment}</Text>
            </View>
          )}
        />

        <View style={styles.card}>
          <Text style={styles.section}>Lisää arvostelu</Text>
          <TextInput
            style={[styles.input, styles.commentInput]}
            placeholder="Arvostelusi"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Arvosana 1-5"
            value={rating}
            onChangeText={setRating}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.primaryButton} onPress={submitReview}>
            <Text style={styles.primaryButtonText}>Lähetä vuokraaja-arvostelu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, color: '#0f2f3d' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 16 },
  label: { color: '#556b7a', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 14, padding: 12, backgroundColor: '#f8fbfc', marginBottom: 12 },
  commentInput: { minHeight: 100, textAlignVertical: 'top' },
  fetchButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  fetchButtonText: { color: '#fff', fontWeight: '700' },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f2f3d' },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 12 },
  reviewer: { fontWeight: '700', marginBottom: 4 },
  rating: { color: '#15948b', marginBottom: 8 },
  comment: { color: '#556b7a', lineHeight: 20 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  emptyText: { color: '#777', marginBottom: 16, textAlign: 'center' }
});
