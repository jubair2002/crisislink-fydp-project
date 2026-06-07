import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../contexts/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { CampaignCoverImage } from './CampaignCoverImage';
import type { CampaignRow } from '../types/home';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_PAD = 16;
export const CAMPAIGN_SLIDE_W = SCREEN_W - PAGE_PAD * 2;
export const CAMPAIGN_SLIDE_H = 220;
const AUTO_INTERVAL_MS = 5000;
const MAX_SLIDES = 5;

function CampaignCarouselSlide({ item }: { item: CampaignRow }) {
  const { colors } = useTheme();
  const styles = useThemedStyles((c) => ({
    slideCard: {
      overflow: 'hidden',
      backgroundColor: c.primarySurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
    },
    slideGradient: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'flex-end',
    },
    slideContent: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      paddingTop: 40,
    },
    slideTitle: { fontSize: 18, fontWeight: '800', color: c.white },
    slideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    slideLoc: { fontSize: 13, color: c.chevron, flex: 1 },
    slideProgressBg: {
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.25)',
      marginTop: 12,
      overflow: 'hidden',
    },
    slideProgressFg: { height: '100%', backgroundColor: c.white, borderRadius: 3 },
    slideBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 10,
      gap: 8,
    },
    slideAmt: { fontSize: 12, color: c.white, fontWeight: '600', flex: 1, opacity: 0.9 },
    slideCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    slideCtaText: { fontSize: 13, fontWeight: '700', color: c.onPrimary },
  }));

  const target = Math.max(1, item.target_amount || 1);
  const pct = Math.min(100, Math.round(((item.collected_amount || 0) / target) * 100));

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.slideCard, { width: CAMPAIGN_SLIDE_W, height: CAMPAIGN_SLIDE_H }]}
      onPress={() => router.push(`/(main)/campaigns/${item.id}`)}
    >
      <CampaignCoverImage uri={item.media_url} height={CAMPAIGN_SLIDE_H} rounded={16} />
      <LinearGradient
        colors={['transparent', colors.overlay, 'rgba(15,23,42,0.92)']}
        style={styles.slideGradient}
      >
        <View style={styles.slideContent}>
          <Text style={styles.slideTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.slideMetaRow}>
            <Ionicons name="location-outline" size={13} color={colors.chevron} />
            <Text style={styles.slideLoc} numberOfLines={1}>
              {item.location ?? 'Nationwide'}
            </Text>
          </View>
          <View style={styles.slideProgressBg}>
            <View style={[styles.slideProgressFg, { width: `${pct}%` }]} />
          </View>
          <View style={styles.slideBottomRow}>
            <Text style={styles.slideAmt}>
              {pct}% · {'\u09f3'}
              {Math.round(item.collected_amount ?? 0).toLocaleString()} / {'\u09f3'}
              {Math.round(item.target_amount ?? 0).toLocaleString()}
            </Text>
            <View style={styles.slideCta}>
              <Text style={styles.slideCtaText}>Donate</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.onPrimary} />
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

interface Props {
  campaigns: CampaignRow[];
}

export function CampaignCarousel({ campaigns }: Props) {
  const styles = useThemedStyles((c) => ({
    scroll: { width: CAMPAIGN_SLIDE_W },
    scrollContent: { alignItems: 'stretch' },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.iconMuted },
    dotOn: { backgroundColor: c.primary, width: 18 },
  }));

  const scrollRef = useRef<ScrollView>(null);
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => campaigns.slice(0, MAX_SLIDES), [campaigns]);

  const scrollToIndex = useCallback((index: number, animated = true) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, index));
    indexRef.current = clamped;
    setActiveIndex(clamped);
    scrollRef.current?.scrollTo({ x: clamped * CAMPAIGN_SLIDE_W, animated });
  }, [slides.length]);

  useEffect(() => {
    indexRef.current = 0;
    setActiveIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [slides.map((s) => s.id).join(',')]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const id = setInterval(() => {
      if (pausedRef.current) return;
      const next = (indexRef.current + 1) % slides.length;
      scrollToIndex(next, true);
    }, AUTO_INTERVAL_MS);

    return () => clearInterval(id);
  }, [slides.length, scrollToIndex]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / CAMPAIGN_SLIDE_W);
    indexRef.current = Math.max(0, Math.min(slides.length - 1, idx));
    setActiveIndex(indexRef.current);
    pausedRef.current = false;
  };

  if (slides.length === 0) return null;

  return (
    <View>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={CAMPAIGN_SLIDE_W}
        snapToAlignment="start"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          pausedRef.current = true;
        }}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {slides.map((item) => (
          <CampaignCarouselSlide key={item.id} item={item} />
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <TouchableOpacity
              key={slide.id}
              hitSlop={8}
              onPress={() => {
                pausedRef.current = true;
                scrollToIndex(i, true);
                setTimeout(() => {
                  pausedRef.current = false;
                }, AUTO_INTERVAL_MS);
              }}
            >
              <View style={[styles.dot, i === activeIndex && styles.dotOn]} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}
