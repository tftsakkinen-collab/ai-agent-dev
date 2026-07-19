import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ScreenHeader from '../components/ScreenHeader';
import { getNotifications, markNotificationRead } from '../lib/api';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { paddingHorizontal: 12, paddingVertical: 12 },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  filterChip: {
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  filterChipActive: { backgroundColor: '#007AFF' },
  filterChipText: { fontSize: 12, color: '#333', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  notificationItem: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationItemRead: {
    backgroundColor: '#F5F5F5',
    borderLeftColor: '#CCC',
  },
  notificationContent: { flex: 1, marginRight: 12 },
  notificationTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  notificationMessage: { fontSize: 13, color: '#666', lineHeight: 18, marginBottom: 4 },
  notificationMeta: { fontSize: 11, color: '#999' },
  notificationIcon: { fontSize: 20 },
  markReadButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    alignItems: 'center',
  },
  markReadButtonText: { fontSize: 11, color: '#333', fontWeight: 'bold' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 40 },
  loading: { justifyContent: 'center', alignItems: 'center', padding: 40 },
});

const NOTIFICATION_TYPES = {
  booking_confirmed: { icon: '📅', title: 'Varaus vahvistettu' },
  handoff_requested: { icon: '🔐', title: 'Luovutus pyydetty' },
  return_initiated: { icon: '↩️', title: 'Palautus aloitettu' },
  review_pending: { icon: '⭐', title: 'Arvostelua odotetaan' },
  dispute_opened: { icon: '⚠️', title: 'Riita-asia avattu' },
  deposit_held: { icon: '💳', title: 'Vakuus pidätetty' },
  listing_approved: { icon: '✅', title: 'Listaus hyväksytty' },
  message: { icon: '💬', title: 'Viesti' },
};

export default function NotificationCenterScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unread');

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.warn('Notifikaatioiden haku epäonnistui:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await markNotificationRead(notificationId);
      await loadNotifications();
    } catch (error) {
      Alert.alert('Virhe', error.message);
    }
  };

  const filtered = notifications.filter((n) => (filter === 'unread' ? !n.read : n.read));
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Notifikaatiot" subtitle={`${unreadCount} lukematta`} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <ScreenHeader title="Notifikaatiot" subtitle={`${unreadCount} lukematta`} />

        <View style={styles.filterRow}>
          {['unread', 'read', 'all'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                {f === 'unread' ? '🔔 Lukematta' : f === 'read' ? '✓ Luettu' : 'Kaikki'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>
            {filter === 'unread' ? 'Ei lukemattomia notifikaatioita' : 'Ei notifikaatioita tällä suodattimella'}
          </Text>
        ) : (
          <FlatList
            scrollEnabled={false}
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item: notification }) => {
              const typeInfo = NOTIFICATION_TYPES[notification.type] || {
                icon: '🔔',
                title: 'Notifikaatio',
              };
              return (
                <View style={[styles.notificationItem, notification.read && styles.notificationItemRead]}>
                  <View style={styles.notificationContent}>
                    <Text style={styles.notificationIcon}>{typeInfo.icon}</Text>
                    <Text style={styles.notificationTitle}>{typeInfo.title}</Text>
                    <Text style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationMeta}>
                      {new Date(notification.createdAt).toLocaleDateString('fi-FI')}
                    </Text>
                  </View>
                  {!notification.read && (
                    <TouchableOpacity
                      style={styles.markReadButton}
                      onPress={() => handleMarkRead(notification.id)}
                    >
                      <Text style={styles.markReadButtonText}>Lue</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
