import React, { useEffect, useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { reportIssue } from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function ReportIssueButton({
  routeName,
  context = 'general_feedback',
  errorDetails = '',
  initialMessage = '',
  initialPriority = 'medium',
  floating = true
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [reporterEmail, setReporterEmail] = useState('');
  const [priority, setPriority] = useState(initialPriority);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMessage(initialMessage);
  }, [initialMessage]);

  const reset = () => {
    setVisible(false);
    setReporterEmail('');
    setPriority(initialPriority);
    if (!initialMessage) {
      setMessage('');
    }
  };

  const submit = async () => {
    if (!message.trim() && !errorDetails) {
      Alert.alert('Kuvaa ongelma', 'Kirjoita lyhyt kuvaus ongelmasta ennen lahetysta.');
      return;
    }

    setSending(true);

    try {
      await reportIssue({
        message: message.trim() || 'Automatic error report',
        reporterEmail: reporterEmail.trim(),
        routeName,
        context,
        errorDetails,
        priority
      });
      Alert.alert('Raportti lahetetty', 'Kiitos. Ongelma kirjattiin jatkokasittelyyn.');
      reset();
    } catch (error) {
      Alert.alert('Lahetys epaonnistui', error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, floating ? styles.floatingTrigger : styles.inlineTrigger]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.triggerText}>{t('reportIssue')}</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={reset}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Virhe- tai palauteraportti</Text>
            <Text style={styles.subtitle}>Laheta ongelma yhdella napilla. Reitti: {routeName || 'unknown'}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              value={message}
              onChangeText={setMessage}
              placeholder="Mita tapahtui ja mita yritit tehda?"
            />
            <TextInput
              style={styles.input}
              value={reporterEmail}
              onChangeText={setReporterEmail}
              placeholder="Sahkoposti (valinnainen)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.priorityLabel}>Prioriteetti</Text>
            <View style={styles.priorityRow}>
              {['low', 'medium', 'high'].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.priorityButton, priority === value && styles.priorityButtonActive]}
                  onPress={() => setPriority(value)}
                >
                  <Text style={[styles.priorityButtonText, priority === value && styles.priorityButtonTextActive]}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
                <Text style={styles.secondaryButtonText}>Sulje</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryButton, sending && styles.disabledButton]} onPress={submit} disabled={sending}>
                <Text style={styles.primaryButtonText}>{sending ? 'Lahetetaan...' : 'Laheta'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    backgroundColor: '#0f2f3d',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#23485d',
    justifyContent: 'center',
    alignItems: 'center'
  },
  floatingTrigger: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6
  },
  inlineTrigger: {
    alignSelf: 'center',
    marginTop: 12
  },
  triggerText: {
    color: '#fff',
    fontWeight: '700'
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 47, 61, 0.52)',
    justifyContent: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f2f3d',
    marginBottom: 8
  },
  subtitle: {
    color: '#556b7a',
    lineHeight: 20,
    marginBottom: 14
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#f8fbfc',
    marginBottom: 12
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: 'top'
  },
  priorityLabel: {
    color: '#556b7a',
    fontWeight: '700',
    marginBottom: 8
  },
  priorityRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  priorityButton: {
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: '#fff'
  },
  priorityButtonActive: {
    backgroundColor: '#0f2f3d',
    borderColor: '#0f2f3d'
  },
  priorityButtonText: {
    color: '#385160',
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  priorityButtonTextActive: {
    color: '#fff'
  },
  actionRow: {
    flexDirection: 'row',
    justify: 'space-between'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d5dde3',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: '#385160',
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#15948b',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700'
  },
  disabledButton: {
    opacity: 0.6
  }
});