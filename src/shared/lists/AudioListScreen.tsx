/**
 * ============================================================
 * shared/lists/AudioListScreen.tsx — Audio List Screen Template
 * ============================================================
 *
 * The shared screen shell behind the flat audio-list routes (music, ASMR,
 * white noise, sleep sounds, …). It owns everything those screens share
 * byte-for-byte: the gradient + header scaffold, the FlatList with its
 * loading spinner and empty state, the sound-row card (icon tile + title /
 * description + DownloadButton + lock / play affordance), audio-URL
 * resolution, download-refresh tracking, paywall gating, and navigation.
 *
 * The consuming route is a thin composition:
 *
 *   <AudioListScreen
 *     items={sounds}
 *     loading={loading}
 *     title="ASMR"
 *     emptyIcon="ear-outline"
 *     emptyText="No ASMR available yet"
 *   />
 *
 * Boundary: lives in shared/, so it may depend on core/ (theme, ui, audio,
 * subscription) but NOT on any features/* module. Feature-specific data
 * (the items) and behavior come in through props.
 *
 * Scope note (Phase 6b): this template is shaped for the four near-identical
 * music list screens — the sleepyNight gradient, the sleep* palette, the
 * built-in sound card, and the default `/music/[id]` route. When sleep /
 * meditation adopt it in Phase 6c, parameterize the card shape (a renderItem
 * override) and the gradient/palette as those screens require.
 * ============================================================
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedView } from '../../core/ui/AnimatedView';
import { AnimatedPressable } from '../../core/ui/AnimatedPressable';
import { useTheme } from '../../core/theme/ThemeContext';
import { Theme } from '../../core/theme';
import { useSubscription } from '../../core/subscription/SubscriptionContext';
import { useAudioUrls } from '../../core/audio/useAudioUrlQueries';
import { DownloadButton } from '../../components/DownloadButton';
import { PaywallModal } from '../../components/PaywallModal';
import { getDownloadedContentIds } from '../../services/downloadService';

/**
 * Structural shape every audio-list item must satisfy. Both
 * `FirestoreMusicItem` and `FirestoreSleepSound` are assignable to this.
 */
export interface AudioListItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  audioPath: string;
  isFree?: boolean;
}

export interface AudioListScreenProps<T extends AudioListItem> {
  /** Resolved list items (from the feature's React Query hook). */
  items: T[];
  /** Whether the items query is still loading. */
  loading: boolean;
  /** Header title. */
  title: string;
  /** Icon shown in the empty state. */
  emptyIcon: keyof typeof Ionicons.glyphMap;
  /** Text shown in the empty state. */
  emptyText: string;
  /** Download-tracking content type. Defaults to 'sound' (all music lists). */
  downloadContentType?: string;
  /** Per-item destination. Defaults to the `/music/[id]` player route. */
  itemHref?: (item: T) => Href;
}

export function AudioListScreen<T extends AudioListItem>({
  items,
  loading,
  title,
  emptyIcon,
  emptyText,
  downloadContentType = 'sound',
  itemHref = (item) => `/music/${item.id}` as Href,
}: AudioListScreenProps<T>) {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const { data: audioUrls = new Map<string, string>() } = useAudioUrls(items);
  const [showPaywall, setShowPaywall] = useState(false);
  const [, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Load download state once the items resolve, then bump refreshKey so each
  // DownloadButton re-checks whether its content is already on disk.
  useEffect(() => {
    if (items.length === 0) return;
    getDownloadedContentIds(downloadContentType).then((ids) => {
      setDownloadedIds(ids);
      setRefreshKey((prev) => prev + 1);
    });
  }, [items, downloadContentType]);

  const handlePress = (item: T) => {
    if (!item.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(itemHref(item));
  };

  const renderItem = ({ item, index }: { item: T; index: number }) => (
    <AnimatedView delay={index * 50} duration={400}>
      <AnimatedPressable onPress={() => handlePress(item)} style={styles.soundCard}>
        <View style={[styles.soundIconContainer, { backgroundColor: `${item.color}25` }]}>
          <Ionicons
            name={`${item.icon}-outline` as keyof typeof Ionicons.glyphMap}
            size={28}
            color={item.color}
          />
        </View>
        <View style={styles.soundInfo}>
          <Text style={styles.soundTitle}>{item.title}</Text>
          <Text style={styles.soundDescription}>{item.description}</Text>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType={downloadContentType}
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: 30,
              audioPath: item.audioPath,
            }}
            size={20}
            darkMode={true}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds(downloadContentType).then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        {!item.isFree && !hasSubscription ? (
          <Ionicons name="lock-closed" size={24} color={theme.colors.sleepTextMuted} />
        ) : (
          <Ionicons name="play-circle-outline" size={32} color={theme.colors.sleepTextMuted} />
        )}
      </AnimatedPressable>
    </AnimatedView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradients.sleepyNight as [string, string]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.sleepText} />
            </AnimatedPressable>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.sleepText} />
            </View>
          ) : (
            <FlatList
              data={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name={emptyIcon} size={48} color={theme.colors.sleepTextMuted} />
                  <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
              }
            />
          )}
        </SafeAreaView>
      </LinearGradient>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.sleepSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: theme.colors.sleepText,
    },
    headerSpacer: {
      width: 40,
    },
    listContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    soundCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    soundIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    soundInfo: {
      flex: 1,
    },
    soundTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepText,
      marginBottom: 4,
    },
    soundDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.sleepTextMuted,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
  });
