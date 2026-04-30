import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface IncomingTaskPopupProps {
  visible: boolean;
  disasterType: string;
  severity: string;
  distanceKm: number | null;
  taskType: string;
  onAccept: () => void;
  onDecline: () => void;
  onTimeout: () => void;
  timeoutSeconds?: number;
}

export default function IncomingTaskPopup({
  visible,
  disasterType,
  severity,
  distanceKm,
  taskType,
  onAccept,
  onDecline,
  onTimeout,
  timeoutSeconds = 30,
}: IncomingTaskPopupProps) {
  const [secondsLeft, setSecondsLeft] = useState(timeoutSeconds);

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(timeoutSeconds);
  }, [timeoutSeconds, visible]);

  useEffect(() => {
    if (!visible) return;
    if (secondsLeft <= 0) {
      onTimeout();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((p) => p - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, visible, onTimeout]);

  const severityColor = useMemo(() => {
    const s = severity.toLowerCase();
    if (s === 'critical') return '#B91C1C';
    if (s === 'high') return '#DC2626';
    if (s === 'medium') return '#D97706';
    return '#15803D';
  }, [severity]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="flash-outline" size={20} color="#B91C1C" />
            <Text style={styles.headerTitle}>Incoming emergency task</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Disaster</Text>
            <Text style={styles.value}>{disasterType.replace(/_/g, ' ')}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Severity</Text>
            <Text style={[styles.value, { color: severityColor, textTransform: 'capitalize' }]}>
              {severity}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Distance</Text>
            <Text style={styles.value}>
              {distanceKm === null ? 'Unknown' : `${distanceKm.toFixed(2)} km`}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Task</Text>
            <Text style={styles.value}>{taskType.replace(/_/g, ' ')}</Text>
          </View>

          <Text style={styles.timerText}>Auto-decline in {secondsLeft}s</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={onDecline}>
              <Text style={[styles.btnText, { color: '#991B1B' }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={onAccept}>
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  label: { color: Colors.textSecondary, fontSize: 13 },
  value: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  timerText: { marginTop: 8, textAlign: 'center', color: '#B91C1C', fontWeight: '700' },
  actions: { marginTop: 8, flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  declineBtn: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  acceptBtn: { backgroundColor: Colors.primary },
  btnText: { fontSize: 14, fontWeight: '800' },
});
