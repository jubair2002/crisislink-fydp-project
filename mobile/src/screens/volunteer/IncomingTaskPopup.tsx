import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { ThemeColors } from '../../constants/themes';

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

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: c.overlay,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    card: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: c.border,
      gap: 10,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
    headerTitle: { fontSize: 16, fontWeight: '800', color: c.textPrimary },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
    label: { color: c.textSecondary, fontSize: 13 },
    value: { color: c.textPrimary, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
    timerText: { marginTop: 8, textAlign: 'center', color: c.danger, fontWeight: '700' },
    actions: { marginTop: 8, flexDirection: 'row', gap: 10 },
    btn: {
      flex: 1,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
    },
    declineBtn: {
      backgroundColor: c.dangerSurface,
      borderWidth: 1,
      borderColor: c.dangerSurfaceBorder,
    },
    acceptBtn: { backgroundColor: c.primary },
    btnText: { fontSize: 14, fontWeight: '800' },
  });

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
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
    if (s === 'critical') return colors.danger;
    if (s === 'high') return colors.accent;
    if (s === 'medium') return colors.warning;
    return colors.success;
  }, [severity, colors]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="flash-outline" size={20} color={colors.danger} />
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
              <Text style={[styles.btnText, { color: colors.danger }]}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={onAccept}>
              <Text style={[styles.btnText, { color: colors.onPrimary }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
