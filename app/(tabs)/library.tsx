/**
 * ============================================================
 * app/(tabs)/library.tsx — Library tab home
 * ============================================================
 *
 * Two sections:
 *   1. Recently played — a horizontal carousel from useListeningHistory
 *      (hidden entirely when there's no history). Tap routes via the library's
 *      polymorphic navigateToContent.
 *   2. Browse — a 2-column grid of entry tiles into the audio sections
 *      (Meditation / Music / Sleep / Downloads), driven by the registry.
 *
 * Consumes other features only through their public indexes
 * (features/progress, features/library) + the registry. No new data
 * aggregation — the hero reads listening history as-is.
 * ============================================================
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { useTheme } from '../../src/core/theme/ThemeContext';
import { Theme } from '../../src/core/theme';
import { AnimatedView } from '../../src/core/ui/AnimatedView';
import { AnimatedPressable } from '../../src/core/ui/AnimatedPressable';
import {
  useListeningHistory,
  type ListeningHistoryItem,
} from '../../src/features/progress';
import { navigateToContent } from '../../src/features/library';
import { getById, type FeatureManifest } from '../../src/registry';

// Short human label for the content-type badge on a recently-played card.
const TYPE_LABELS: Record<string, string> = {
  meditation: 'Meditation',
  nature_sound: 'Nature',
  bedtime_story: 'Story',
  breathing_exercise: 'Breathing',
  series_chapter: 'Series',
  album_track: 'Album',
  emergency: 'Emergency',
  course_session: 'Course',
};

// Browse tiles, in display order. Each pulls its label/icon/color/description +
// route straight from the feature's manifest (registry-driven, single source).
const BROWSE_IDS = ['meditation', 'music', 'sleep', 'downloads'] as const;

function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: history } = useListeningHistory(7);
  const recentlyPlayed = history ?? [];

  const browseTiles = useMemo(
    () => BROWSE_IDS.map((id) => getById(id)).filter(Boolean) as FeatureManifest[],
    []
  );

  const openContent = (item: ListeningHistoryItem) => {
    // Emergency context isn't loaded here (the hero reads history as-is); an
    // emergency item falls back to the meditate tab inside navigateToContent.
    void navigateToContent(item.content_id, item.content_type, router, {
      emergencyMeditations: [],
    });
  };

  const renderRecent = ({ item }: { item: ListeningHistoryItem }) => (
    <AnimatedPressable style={styles.recentCard} onPress={() => openContent(item)}>
      {item.content_thumbnail ? (
        <Image source={{ uri: item.content_thumbnail }} style={styles.recentThumb} />
      ) : (
        <View style={[styles.recentThumb, styles.recentThumbFallback]}>
          <Ionicons name="musical-note" size={28} color={theme.colors.textMuted} />
        </View>
      )}
      <Text style={styles.recentBadge}>
        {TYPE_LABELS[item.content_type] ?? 'Audio'}
      </Text>
      <Text style={styles.recentTitle} numberOfLines={2}>
        {item.content_title}
      </Text>
    </AnimatedPressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Library</Text>
          <Text style={styles.subtitle}>Your collected audio</Text>
        </View>

        {/* Hero: recently played (hidden when there's no history) */}
        {recentlyPlayed.length > 0 && (
          <AnimatedView>
            <Text style={styles.sectionHeader}>Recently played</Text>
            <FlatList
              data={recentlyPlayed}
              keyExtractor={(item) => item.id}
              renderItem={renderRecent}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentList}
            />
          </AnimatedView>
        )}

        {/* Browse */}
        <AnimatedView>
          <Text style={styles.sectionHeader}>Browse</Text>
          <View style={styles.browseList}>
            {browseTiles.map((m) => (
              <AnimatedPressable
                key={m.id}
                style={styles.browseRow}
                onPress={() => router.push(m.route as any)}
              >
                <View style={[styles.browseIcon, { backgroundColor: `${m.color}22` }]}>
                  <Ionicons name={m.icon} size={24} color={m.color} />
                </View>
                <View style={styles.browseText}>
                  <Text style={styles.browseLabel} numberOfLines={1}>
                    {m.label}
                  </Text>
                  <Text style={styles.browseDesc} numberOfLines={2}>
                    {m.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </AnimatedPressable>
            ))}
          </View>
        </AnimatedView>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Library() {
  return (
    <ProtectedRoute>
      <LibraryScreen />
    </ProtectedRoute>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.text,
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    sectionHeader: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      marginHorizontal: theme.spacing.lg,
    },
    recentList: {
      paddingHorizontal: theme.spacing.lg,
      gap: 12,
    },
    recentCard: {
      width: 150,
    },
    recentThumb: {
      width: 150,
      height: 110,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
    },
    recentThumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    recentBadge: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      color: theme.colors.primary,
      marginTop: 8,
    },
    recentTitle: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.text,
      marginTop: 2,
      lineHeight: 18,
    },
    browseList: {
      paddingHorizontal: theme.spacing.lg,
      gap: 12,
    },
    browseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    browseIcon: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    browseText: {
      flex: 1,
    },
    browseLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    browseDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });
