import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson, submitBookingReview, getBookingReviews } from '../lib/api';

export default function ReviewScreen({ navigation, route }) {
  const { bookingId, actor } = route.params || {};
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState('5');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviews();
  }, [bookingId]);

  const fetchReviews = async () => {
    try {
      const data = await getBookingReviews(bookingId);
      setReviews(data || []);
    } catch (error) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!rating || !comment.trim()) {
      Alert.alert('Täytä kaikki kentät', 'Arvosana ja kommentti ovat pakollisia.');
      return;
    }

    try {
      setSubmitting(true);
      await submitBookingReview(bookingId, actor, Number(rating), comment.trim());
      Alert.alert('Arvostelu lähetetty', 'Arvostelusi on tallennettu. Se julkaistaan kun molemmat osapuolet ovat jättäneet arvostelunsa.');
      setComment('');
      setRating('5');
      fetchReviews();
    } catch (error) {
      Alert.alert('Arvostelu epäonnistui', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const visibleReviews = reviews.filter((r) => r.visibility === 'visible');
  const hiddenReviews = reviews.filter((r) => r.visibility === 'hidden');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader
          title="Arvostelut"
          subtitle={actor === 'owner' ? 'Arvioi vuokraaja' : 'Arvioi vuokraaja'}
        />

        {!loading && visibleReviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Julkaisitut arvostelut</Text>
            {visibleReviews.map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <Text style={styles.reviewer}>{review.actor === 'owner' ? 'Omistaja' : 'Vuokraaja'}</Text>
                <Text style={styles.rating}>⭐ {review.rating}/5</Text>
                <Text style={styles.comment}>{review.comment}</Text>
              </View>
            ))}
          </View>
        )}

        {hiddenReviews.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Odottavia arvosteluja ({hiddenReviews.length})</Text>
            <Text style={styles.metaText}>Arvostelut julkaistaan kun molemmat osapuolet ovat jättäneet omat arvostelunsa.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Jätä oma arvostelu</Text>
          <Text style={styles.label}>Arvosana</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[styles.starButton, Number(rating) >= num && styles.starButtonActive]}
                onPress={() => setRating(String(num))}
              >
                <Text style={styles.starButtonText}>⭐</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingDisplay}>{rating}/5</Text>

          <Text style={styles.label}>Kommentti</Text>
          <TextInput
            style={[styles.input, styles.commentInput]}
            placeholder="Kerro kokemuksestasi..."
            value={comment}
            onChangeText={setComment}
            editable={!submitting}
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            onPress={submitReview}
            disabled={submitting}
          >
            <Text style={styles.primaryButtonText}>{submitting ? 'Lähetetään...' : 'Lähetä arvostelu'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ Double-blind arvostelut</Text>
          <Text style={styles.infoText}>Arvostelut ovat piilossa kunnes molemmat osapuolet ovat jättäneet omat arvostelunsä. Näin estetään kosto-arvostelut.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e3eaef', marginBottom: 12 },
  infoCard: { backgroundColor: '#f0f7f7', borderRadius: 16, borderWidth: 1, borderColor: '#d0e2df', padding: 16, marginTop: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f2f3d', marginBottom: 10 },
  reviewItem: { borderTopWidth: 1, borderTopColor: '#eef3f6', paddingTop: 10, marginTop: 10 },
  reviewer: { fontWeight: '700', marginBottom: 4, fontSize: 15, color: '#0f2f3d' },
  rating: { marginBottom: 4, color: '#15948b', fontWeight: '700' },
  comment: { color: '#556b7a', lineHeight: 20 },
  label: { fontWeight: '700', color: '#0f2f3d', marginBottom: 8, marginTop: 12 },
  ratingRow: { flexDirection: 'row', marginBottom: 8 },
  starButton: { marginRight: 8, padding: 8, borderRadius: 8, backgroundColor: '#f0f4f7' },
  starButtonActive: { backgroundColor: '#ffd700' },
  starButtonText: { fontSize: 24 },
  ratingDisplay: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#15948b', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d5dde3', borderRadius: 12, padding: 12, backgroundColor: '#fff', color: '#000', marginBottom: 12 },
  commentInput: { minHeight: 100, textAlignVertical: 'top' },
  metaText: { color: '#556b7a', lineHeight: 20 },
  primaryButton: { backgroundColor: '#15948b', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '700' },
  buttonDisabled: { opacity: 0.6 },
  infoTitle: { fontWeight: '800', color: '#0e6d66', marginBottom: 8 },
  infoText: { color: '#556b7a', lineHeight: 20 }
});
