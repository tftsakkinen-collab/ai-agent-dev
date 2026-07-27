import React, { useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { fetchJson } from '../lib/api';

export default function ChatScreen({ route }) {
  const { bookingId, productTitle } = route.params;
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    fetchMyUser();
    fetchMessages();
    // In a real app, we'd use websockets or polling here.
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [bookingId]);

  const fetchMyUser = async () => {
      try {
          const user = await fetchJson('/api/me');
          setMyUserId(user.id);
      } catch(e) {
          console.warn(e);
      }
  };

  const fetchMessages = async () => {
    try {
      const data = await fetchJson(`/api/bookings/${bookingId}/messages`);
      setMessages(data);
    } catch (error) {
      console.warn("Failed to fetch messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    try {
      await fetchJson(`/api/bookings/${bookingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });
      setInputText('');
      fetchMessages();
    } catch (error) {
      console.warn("Failed to send message:", error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = item.senderId === myUserId;
    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>{item.text}</Text>
        <Text style={styles.timestamp}>{new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Viestit" subtitle={productTitle || `Varaus ${bookingId}`} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          inverted={false}
        />
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Kirjoita viesti..."
            multiline
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendButtonText}>Lähetä</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f4f8fb' },
  container: { flex: 1 },
  messageList: { padding: 16, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#15948b', borderBottomRightRadius: 4 },
  theirMessage: { alignSelf: 'flex-start', backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e3eaef' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  theirMessageText: { color: '#0f2f3d' },
  timestamp: { fontSize: 10, color: '#a0b0ba', alignSelf: 'flex-end', marginTop: 4 },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e3eaef', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#f4f8fb', borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, maxHeight: 100, minHeight: 40, borderWidth: 1, borderColor: '#d7dfe6' },
  sendButton: { marginLeft: 12, backgroundColor: '#15948b', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  sendButtonText: { color: '#fff', fontWeight: 'bold' }
});
