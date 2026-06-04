/**
 * ============================================================
 * features/library/screens/CollectionDetailScreen.tsx
 * ============================================================
 *
 * The unified detail screen for album / series / course (Phase 5
 * Step 4). Replaces the three near-identical `app/{album,series,course}/
 * [id].tsx` screens. The shared state machine lives in
 * `useCollectionDetail`; this file owns the presentation.
 *
 * Album and series share a dark-only palette (`sleepyNight` gradient,
 * `sleep*` tokens). Course is the outlier: light/dark aware, with a code
 * badge, subtitle, difficulty, per-session code meta and a `dayNumber`
 * badge. Per the locked Phase 5 decision, those course quirks live behind
 * `contentType === 'course'` conditionals here rather than being
 * abstracted into the config. Rendering parity with the originals is the
 * priority — see docs/library-screen-inventory.md.
 * ============================================================
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedView } from '../../../core/ui/AnimatedView';
import { AnimatedPressable } from '../../../core/ui/AnimatedPressable';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Theme } from '../../../core/theme';
import { DownloadButton } from '../../../shared/downloads/DownloadButton';
import { PaywallModal } from '../../subscription';
import { AccountPromptModal } from '../../auth';
import { buildSessionMetaInfo } from '../../../utils/courseCodeParser';
import type {
  FirestoreAlbum,
  FirestoreSeries,
  FirestoreCourse,
} from '../../../services/firestoreService';
import { COLLECTION_CONFIGS } from '../data/contentTypes';
import { getCategoryIcon } from '../contentIcons';
import { useCollectionDetail } from '../hooks/useCollectionDetail';
import type { CollectionContentType } from '../types';

interface CollectionDetailScreenProps {
  contentType: CollectionContentType;
  id: string;
  autoOpenItemId?: string;
}

export function CollectionDetailScreen({
  contentType,
  id,
  autoOpenItemId,
}: CollectionDetailScreenProps) {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const config = COLLECTION_CONFIGS[contentType];

  const isCourse = contentType === 'course';
  // Album/series are dark-only; course follows the active theme.
  const dark = isCourse ? isDark : true;

  const {
    parent,
    children,
    loading,
    completedIds,
    audioUrls,
    refreshKey,
    isOffline,
    hasSubscription,
    showPaywall,
    openPaywall,
    closePaywall,
    handleChildPress,
    refreshDownloadedIds,
  } = useCollectionDetail(config, id, { autoOpenItemId });

  const [showAccountPrompt, setShowAccountPrompt] = useState(false);

  const styles = useMemo(
    () => createStyles(theme, dark, isCourse),
    [theme, dark, isCourse]
  );

  const gradientColors = (
    isCourse && !isDark && parent
      ? [`${(parent as FirestoreCourse).color}30`, `${(parent as FirestoreCourse).color}10`, theme.colors.background]
      : theme.gradients.sleepyNight
  ) as [string, string];

  // Course loading/not-found render bare (no gradient) to match the original
  // course screen; album/series wrap their states in the sleepyNight gradient.
  if (loading) {
    if (isCourse) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradients.sleepyNight as [string, string]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <ActivityIndicator size="large" color={theme.colors.sleepAccent} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!parent) {
    if (isCourse) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{config.parentLabel} not found</Text>
            <AnimatedPressable onPress={() => router.back()} style={styles.backLink}>
              <Text style={styles.backLinkText}>Go back</Text>
            </AnimatedPressable>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.container}>
        <LinearGradient colors={theme.gradients.sleepyNight as [string, string]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{config.parentLabel} not found</Text>
              <AnimatedPressable onPress={() => router.back()} style={styles.backLink}>
                <Text style={styles.backLinkText}>Go back</Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const accentColor: string = (parent as any).color;
  const parentTitle = config.getParentTitle(parent);
  const parentThumbnailUrl = config.getParentThumbnailUrl(parent);
  const album = isCourse ? null : (parent as FirestoreAlbum | FirestoreSeries);
  const course = isCourse ? (parent as FirestoreCourse) : null;
  const badgeSize = contentType === 'album' ? 40 : 44;

  const heroFallbackIcon: keyof typeof Ionicons.glyphMap =
    contentType === 'album'
      ? getCategoryIcon((parent as FirestoreAlbum).category) // default 'disc'
      : contentType === 'series'
        ? getCategoryIcon((parent as FirestoreSeries).category, 'book')
        : 'school';

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <AnimatedView delay={0} duration={400}>
              <View style={styles.heroSection}>
                {parentThumbnailUrl ? (
                  <Image source={{ uri: parentThumbnailUrl }} style={styles.heroImage} />
                ) : (
                  <View style={[styles.heroIcon, { backgroundColor: `${accentColor}25` }]}>
                    <Ionicons name={heroFallbackIcon} size={48} color={accentColor} />
                  </View>
                )}

                {/* Course-only code badge */}
                {isCourse && course!.code && (
                  <View style={styles.courseCodeBadge}>
                    <Text style={styles.courseCodeText}>{course!.code}</Text>
                  </View>
                )}

                <Text style={styles.title}>{parentTitle}</Text>

                {/* Course-only subtitle */}
                {isCourse && course!.subtitle && (
                  <Text style={styles.subtitle}>{course!.subtitle}</Text>
                )}

                <View style={styles.metaRow}>
                  {contentType === 'album' && (
                    <>
                      <View style={styles.metaItem}>
                        <Ionicons name="disc-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreAlbum).trackCount} tracks</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreAlbum).totalDuration} min</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="person-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreAlbum).artist}</Text>
                      </View>
                    </>
                  )}
                  {contentType === 'series' && (
                    <>
                      <View style={styles.metaItem}>
                        <Ionicons name="book-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreSeries).chapterCount} chapters</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreSeries).totalDuration} min</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="mic-outline" size={16} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.metaText}>{(album as FirestoreSeries).narrator}</Text>
                      </View>
                    </>
                  )}
                  {isCourse && (
                    <>
                      <View style={styles.metaItem}>
                        <Ionicons name="layers-outline" size={16} color={dark ? theme.colors.sleepTextMuted : theme.colors.textLight} />
                        <Text style={styles.metaText}>{course!.sessionCount} sessions</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color={dark ? theme.colors.sleepTextMuted : theme.colors.textLight} />
                        <Text style={styles.metaText}>{course!.totalDuration} min total</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="fitness-outline" size={16} color={dark ? theme.colors.sleepTextMuted : theme.colors.textLight} />
                        <Text style={styles.metaText}>{course!.difficulty}</Text>
                      </View>
                    </>
                  )}
                </View>

                <Text style={styles.description}>{(parent as any).description}</Text>
              </View>
            </AnimatedView>

            {/* Children List */}
            <View style={styles.listContainer}>
              <AnimatedView delay={100} duration={400}>
                <Text style={styles.sectionTitle}>{config.childLabelPlural}</Text>
              </AnimatedView>

              {children.map((child: any, index: number) => {
                const childId = config.getChildId(child);
                const childTitle = config.getChildTitle(child);
                const childDuration = config.getChildDurationMinutes(child);
                const locked = !config.getChildIsFree(child) && !hasSubscription;
                const url = audioUrls.get(childId);
                const completed = completedIds.has(childId);
                const numberValue =
                  contentType === 'album'
                    ? child.trackNumber
                    : contentType === 'series'
                      ? child.chapterNumber
                      : child.dayNumber;

                return (
                  <AnimatedView
                    key={childId}
                    delay={150 + index * (contentType === 'album' ? 40 : 50)}
                    duration={300}
                  >
                    <AnimatedPressable
                      onPress={() => handleChildPress(child, index)}
                      style={styles.card}
                    >
                      {parentThumbnailUrl ? (
                        <Image
                          source={{ uri: parentThumbnailUrl }}
                          style={[styles.thumbnail, { width: badgeSize, height: badgeSize }]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.numberBadge,
                            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: `${accentColor}20` },
                          ]}
                        >
                          <Text style={[styles.numberBadgeText, { color: accentColor, fontSize: contentType === 'album' ? 14 : 16 }]}>
                            {numberValue}
                          </Text>
                        </View>
                      )}
                      <View style={styles.infoBlock}>
                        <Text style={styles.cardTitle}>{childTitle}</Text>
                        {isCourse && child.code && course!.code && (
                          <Text style={styles.sessionCodeInfo}>
                            {buildSessionMetaInfo(child.code, course!.code)}
                          </Text>
                        )}
                        {contentType !== 'album' && (
                          <Text style={styles.cardDescription} numberOfLines={1}>
                            {child.description}
                          </Text>
                        )}
                        <View style={styles.cardMeta}>
                          <Ionicons name="time-outline" size={12} color={dark ? theme.colors.sleepTextMuted : theme.colors.textMuted} />
                          <Text style={styles.cardMetaText}>{childDuration} min</Text>
                          {completed && (
                            <>
                              <Text style={styles.cardMetaText}>•</Text>
                              <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                              <Text style={[styles.cardMetaText, styles.completedText]}>Completed</Text>
                            </>
                          )}
                        </View>
                      </View>
                      {!isOffline && url && (
                        <DownloadButton
                          contentId={childId}
                          contentType={config.childContentType}
                          audioUrl={url}
                          metadata={{
                            title: childTitle,
                            duration_minutes: childDuration,
                            thumbnailUrl: parentThumbnailUrl,
                            parentId: (parent as any).id,
                            parentTitle,
                            audioPath: config.getChildAudioPath(child),
                          }}
                          size={20}
                          darkMode={dark}
                          refreshKey={refreshKey}
                          onDownloadComplete={refreshDownloadedIds}
                          isPremiumLocked={locked}
                          onPremiumRequired={openPaywall}
                        />
                      )}
                      <View style={styles.playButton}>
                        {locked ? (
                          <Ionicons name="lock-closed" size={20} color={dark ? theme.colors.sleepTextMuted : theme.colors.textMuted} />
                        ) : (
                          <Ionicons name="play" size={20} color={isCourse ? accentColor : theme.colors.sleepAccent} />
                        )}
                      </View>
                    </AnimatedPressable>
                  </AnimatedView>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Floating Back Button */}
      <SafeAreaView style={styles.backButtonContainer} edges={['top']} pointerEvents="box-none">
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={dark ? theme.colors.sleepText : theme.colors.text} />
        </AnimatedPressable>
      </SafeAreaView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={closePaywall}
        onAccountLinkPrompt={() => setShowAccountPrompt(true)}
      />
      <AccountPromptModal
        visible={showAccountPrompt}
        onClose={() => setShowAccountPrompt(false)}
      />
    </View>
  );
}

const createStyles = (theme: Theme, dark: boolean, isCourse: boolean) =>
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
    backButtonContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    },
    backButton: {
      marginLeft: theme.spacing.md,
      marginTop: theme.spacing.sm,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
    },
    heroSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: isCourse ? theme.spacing.xxl : theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      alignItems: 'center',
    },
    heroIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    heroImage: {
      width: 120,
      height: 120,
      borderRadius: 16,
      marginBottom: theme.spacing.lg,
    },
    courseCodeBadge: {
      backgroundColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      marginBottom: theme.spacing.sm,
    },
    courseCodeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 12,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      letterSpacing: 1,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: dark ? theme.colors.sleepText : theme.colors.text,
      textAlign: 'center',
      marginBottom: isCourse ? theme.spacing.xs : theme.spacing.sm,
    },
    subtitle: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      ...(isCourse ? { textTransform: 'capitalize' as const } : {}),
    },
    description: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    listContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: dark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: dark ? theme.colors.sleepSurface : theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    numberBadge: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnail: {
      borderRadius: 10,
    },
    numberBadgeText: {
      fontFamily: theme.fonts.ui.semiBold,
    },
    infoBlock: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    cardTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: dark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: 2,
    },
    sessionCodeInfo: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: dark ? 'rgba(255,255,255,0.5)' : theme.colors.textMuted,
      marginBottom: 2,
    },
    cardDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      marginBottom: 4,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    cardMetaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: dark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
    },
    completedText: {
      color: '#4CAF50',
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isCourse
        ? (dark ? `${theme.colors.sleepAccent}20` : `${theme.colors.primary}15`)
        : 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: dark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    backLink: {
      padding: theme.spacing.sm,
    },
    backLinkText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: isCourse ? theme.colors.primary : theme.colors.sleepAccent,
    },
  });
