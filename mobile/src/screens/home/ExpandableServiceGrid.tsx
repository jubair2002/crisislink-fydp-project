import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';

const PAGE_PAD = 16;
const CARD_INNER_PAD = 14;
const ROW_GAP = 12;
const ICON_SIZE = 52;

/** Exactly 4 columns × 2 rows when collapsed */
const COLS = 4;
const COLLAPSED_ROWS = 2;
const COLLAPSED_COUNT = COLS * COLLAPSED_ROWS;

export type HomeServiceItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

type Props = {
  title?: string;
  items: HomeServiceItem[];
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/** Collapsed: 2 rows of 4 services. Expanded: all rows of 4. */
export function ExpandableServiceGrid({ title = 'Services', items }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { width: screenW } = useWindowDimensions();

  const visible = expanded ? items : items.slice(0, Math.min(COLLAPSED_COUNT, items.length));
  const showToggle = items.length > COLLAPSED_COUNT;

  const rows = useMemo(() => chunk(visible, COLS), [visible]);

  const cardInnerW = screenW - PAGE_PAD * 2 - CARD_INNER_PAD * 2;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>{title}</Text>
      <View style={[styles.card, { maxWidth: screenW - PAGE_PAD * 2 }]}>
        <View style={[styles.grid, { width: cardInnerW }]}>
          {rows.map((row, rowIdx) => (
            <View
              key={`row-${rowIdx}`}
              style={[styles.row, rowIdx < rows.length - 1 ? { marginBottom: ROW_GAP } : null]}
            >
              {row.map((s, colIdx) => (
                <TouchableOpacity
                  key={`${rowIdx}-${colIdx}-${s.label}`}
                  style={styles.cell}
                  onPress={s.onPress}
                  activeOpacity={0.82}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name={s.icon} size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.label} numberOfLines={2}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {row.length < COLS
                ? Array.from({ length: COLS - row.length }).map((_, padIdx) => (
                    <View key={`pad-${rowIdx}-${padIdx}`} style={styles.cellPlaceholder} />
                  ))
                : null}
            </View>
          ))}
        </View>
        {showToggle ? (
          <TouchableOpacity style={styles.toggleRow} onPress={() => setExpanded((v) => !v)} activeOpacity={0.75}>
            <Text style={styles.toggleText}>{expanded ? 'Show less' : 'See all services'}</Text>
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 18,
    paddingHorizontal: PAGE_PAD,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: CARD_INNER_PAD,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  grid: {
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    gap: 10,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  cellPlaceholder: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
