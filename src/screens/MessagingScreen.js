import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getMessages, sendMessage } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12 },
  messageList: { flex: 1, paddingHorizontal: 12 },
  messageBubbleOwn: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
    maxWidth: '75%',
  },
  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 4,
    maxWidth: '75%',
  },
  messageTextOwn: { color: '#fff', fontSize: 13 },
  messageTextOther: { color: '#333', fontSize: 13 },
  messageTime: { fontSize: 11, color: '#999', marginTop: 2 },
  inputContainer: { paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E8E8E8' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: { fontSize: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyStateText: { fontSize: 14, color: '#999' },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

export default function MessagingScreen({ route }) {
  const bookingId = route?.params?.bookingId || null;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [bookingId]);

  const loadMessages = async () => {
    try {
      if (!bookingId) {
        setMessages([]);
        setLoading(false);
        return;
      }
      const data = await getMessages(bookingId);
      setMessages(data || []);
      setLoading(false);
    } catch (error) {
      console.warn('Viestien lataus epäonnistui:', error.message);
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    if (!bookingId) {
      Alert.alert('Virhe', 'Varauksen ID puuttuu');
      return;
    }

    try {
      setSending(true);
      await sendMessage(bookingId, messageText.trim());
      setMessageText('');
      await loadMessages();
    } catch (error) {
      Alert.alert('Virhe', error.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (!bookingId) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Viestit" subtitle="Valitse varaus" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Avaa varaus nähdäksesi viestit</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ScreenHeader title="Viestit" subtitle={`Varaus ${bookingId.slice(0, 8)}`} />
      </View>

      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Ei viestejä. Aloita keskustelu!</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={item.isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther}>
              <Text style={item.isOwn ? styles.messageTextOwn : styles.messageTextOther}>{item.text}</Text>
              <Text style={styles.messageTime}>{new Date(item.createdAt).toLocaleTimeString('fi-FI')}</Text>
            </View>
          )}
          contentContainerStyle={styles.messageList}
        />
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Kirjoita viesti..."
            value={messageText}
            onChangeText={setMessageText}
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, sending && { opacity: 0.5 }]}
            onPress={handleSendMessage}
            disabled={sending || !messageText.trim()}
          >
            <Text style={styles.sendButtonText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
