import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

export default function ReviewScreen({ navigation, route }) {
  const { showToast } = useToast();
  const { targetType, targetId, targetName } = route.params || {};
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const data = await fetchJson(`/api/reviews?targetType=${targetType}&targetId=${targetId}`);
      setReviews(data);
      setUnauthorized(false);
    } catch (error) {
      setReviews([]);
      setUnauthorized(error.message === 'Unauthorized');
    }
  };

  const submitReview = async () => {
    if (!rating) return showToast('Valitse arvosana');

    try {
      const result = await fetchJson('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, rating: Number(rating), comment })
      });
      setComment('');
      setRating('5');
      fetchReviews();
      showToast('Arvostelu lähetetty', `Kiitos arvostelusta ${result.reviewer}!`);
    } catch (error) {
      if (error.message === 'Unauthorized') {
        setUnauthorized(true);
      } else {
        showToast('Arvostelu epäonnistui', error.message);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Arvostelut"
          subtitle={targetName}
          actionLabel="Kirjaudu"
          onAction={() => navigation.navigate('Auth')}
        />
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Ei arvosteluja vielä.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.reviewer}>{item.reviewer}</Text>
              <Text style={styles.rating}>Arvio: {item.rating}/5</Text>
              <Text style={styles.comment}>{item.comment}</Text>
            </View>
          )}
        />
        <View style={styles.form}>
          <Text style={styles.section}>Jätä oma arvostelu</Text>
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
          {unauthorized && <Text style={styles.error}>Sinun täytyy kirjautua ensin.</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={submitReview}>
            <Text style={styles.primaryButtonText}>Lähetä arvostelu</Text>
          </TouchableOpacity>
          {unauthorized && (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Auth')}>
              <Text style={styles.secondaryButtonText}>Kirjaudu</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#0f2f3d', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#556b7a', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 12 },
  reviewer: { fontWeight: '700', marginBottom: 4, fontSize: 15, color: '#0f2f3d' },
  rating: { marginBottom: 8, color: '#15948b' },
  comment: { color: '#556b7a', lineHeight: 20 },
  form: { marginTop: 22 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: '#0f2f3d' },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 14, padding: 12, backgroundColor: '#f8fbfc', marginBottom: 12 },
  commentInput: { minHeight: 100, textAlignVertical: 'top' },
  error: { color: '#c0392b', marginBottom: 12 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  secondaryButton: { marginTop: 10, borderColor: '#15948b', borderWidth: 1, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#15948b', fontWeight: '700' },
  emptyText: { color: '#777', textAlign: 'center', marginVertical: 16 }
});
