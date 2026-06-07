import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { ThemeColors } from '../../constants/themes';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';

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

const createStyles = (c: ThemeColors) => ({
  section: {
    marginBottom: 18,
    paddingHorizontal: PAGE_PAD,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: c.textPrimary,
    marginBottom: 12,
  },
  card: {
    alignSelf: 'stretch' as const,
    backgroundColor: c.card,
    borderRadius: 16,
    padding: CARD_INNER_PAD,
    borderWidth: 1,
    borderColor: c.border,
  },
  grid: {
    alignSelf: 'center' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    width: '100%' as const,
    gap: 10,
  },
  cell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center' as const,
  },
  cellPlaceholder: {
    flex: 1,
    minWidth: 0,
  },
  iconCircle: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: c.textPrimary,
    textAlign: 'center' as const,
    lineHeight: 14,
    width: '100%' as const,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: c.primary,
  },
});

/** Collapsed: 2 rows of 4 services. Expanded: all rows of 4. */
export function ExpandableServiceGrid({ title = 'Services', items }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { width: screenW } = useWindowDimensions();
  const styles = useThemedStyles(createStyles);
  const { colors } = useTheme();

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
                    <Ionicons name={s.icon} size={22} color={colors.primary} />
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
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}
