import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Theme } from '../../src/theme';
import { getSeriesById, FirestoreSeries, FirestoreSeriesChapter, getCompletedContentIds } from '../../src/services/firestoreService';
import { useAuth } from '../../src/contexts/AuthContext';
import { DownloadButton } from '../../src/components/DownloadButton';
import { getAudioUrlFromPath } from '../../src/constants/audioFiles';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { getDownloadedContentIds } from '../../src/services/downloadService';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../src/components/PaywallModal';

function SeriesDetailScreen() {
  const router = useRouter();
  const { id, autoOpenItemId } = useLocalSearchParams<{ id: string; autoOpenItemId?: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { isPremium: hasSubscription } = useSubscription();
  const [series, setSeries] = useState<FirestoreSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const hasAutoOpened = useRef(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    async function loadSeries() {
      if (!id) return;
      setLoading(true);
      const data = await getSeriesById(id);
      setSeries(data);
      setLoading(false);
    }
    loadSeries();
  }, [id]);

  // Fetch completed chapter IDs (refetch when screen comes into focus)
  useFocusEffect(
    useCallback(() => {
      async function loadCompletedIds() {
        if (!user) return;
        const ids = await getCompletedContentIds(user.uid, 'series_chapter');
        setCompletedIds(ids);
      }
      loadCompletedIds();
    }, [user])
  );

  // Refresh download status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function loadDownloadedIds() {
        const ids = await getDownloadedContentIds('series_chapter');
        setDownloadedIds(ids);
      }
      loadDownloadedIds();
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Fetch audio URLs for chapters
  useEffect(() => {
    async function loadAudioUrls() {
      if (!series) return;
      const urls = new Map<string, string>();
      for (const chapter of series.chapters) {
        const url = await getAudioUrlFromPath(chapter.audioPath);
        if (url) {
          urls.set(chapter.id, url);
        }
      }
      setAudioUrls(urls);
    }
    loadAudioUrls();
  }, [series]);

  // Auto-open a specific chapter if autoOpenItemId is provided
  useEffect(() => {
    if (!series || !autoOpenItemId || hasAutoOpened.current) return;
    
    const index = series.chapters.findIndex(c => c.id === autoOpenItemId);
    if (index !== -1) {
      hasAutoOpened.current = true;
      const chapter = series.chapters[index];
      router.push({
        pathname: '/series/chapter/[id]',
        params: {
          id: chapter.id,
          audioPath: chapter.audioPath,
          title: chapter.title,
          seriesTitle: series.title,
          duration: String(chapter.duration_minutes),
          narrator: series.narrator,
          thumbnailUrl: series.thumbnailUrl || '',
          chaptersJson: JSON.stringify(series.chapters),
          currentIndex: String(index),
        },
      });
    }
  }, [series, autoOpenItemId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={theme.gradients.sleepyNight as [string, string]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <ActivityIndicator size="large" color={theme.colors.sleepAccent} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  if (!series) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={theme.gradients.sleepyNight as [string, string]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Series not found</Text>
              <AnimatedPressable onPress={() => router.back()} style={styles.backLink}>
                <Text style={styles.backLinkText}>Go back</Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const handleChapterPress = (chapter: FirestoreSeriesChapter, index: number) => {
    // Check isFree field from Firestore
    if (!chapter.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    // Navigate to series chapter player with the audioPath and narrator
    router.push({
      pathname: '/series/chapter/[id]',
      params: {
        id: chapter.id,
        audioPath: chapter.audioPath,
        title: chapter.title,
        seriesTitle: series.title,
        duration: String(chapter.duration_minutes),
        narrator: series.narrator,
        thumbnailUrl: series.thumbnailUrl || '',
        chaptersJson: JSON.stringify(series.chapters),
        currentIndex: String(index),
      },
    });
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (series.category) {
      case 'fantasy':
        return 'planet';
      case 'nature':
        return 'leaf';
      case 'travel':
        return 'airplane';
      case 'thriller':
        return 'skull';
      case 'fiction':
        return 'book';
      default:
        return 'book';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.sleepyNight as [string, string]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <AnimatedView delay={0} duration={400}>
              <View style={styles.heroSection}>
                {series.thumbnailUrl ? (
                  <Image
                    source={{ uri: series.thumbnailUrl }}
                    style={styles.heroImage}
                  />
                ) : (
                  <View style={[styles.heroIcon, { backgroundColor: `${series.color}25` }]}>
                    <Ionicons name={getCategoryIcon()} size={48} color={series.color} />
                  </View>
                )}
                <Text style={styles.seriesTitle}>{series.title}</Text>
                <View style={styles.seriesMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="book-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{series.chapterCount} chapters</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{series.totalDuration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="mic-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{series.narrator}</Text>
                  </View>
                </View>
                <Text style={styles.seriesDescription}>{series.description}</Text>
              </View>
            </AnimatedView>

            {/* Chapters List */}
            <View style={styles.chaptersContainer}>
              <AnimatedView delay={100} duration={400}>
                <Text style={styles.sectionTitle}>Chapters</Text>
              </AnimatedView>

              {series.chapters.map((chapter, index) => (
                <AnimatedView key={chapter.id} delay={150 + index * 50} duration={300}>
                  <AnimatedPressable
                    onPress={() => handleChapterPress(chapter, index)}
                    style={styles.chapterCard}
                  >
                    {series.thumbnailUrl ? (
                      <Image
                        source={{ uri: series.thumbnailUrl }}
                        style={styles.chapterThumbnail}
                      />
                    ) : (
                      <View style={[styles.chapterNumber, { backgroundColor: `${series.color}20` }]}>
                        <Text style={[styles.chapterNumberText, { color: series.color }]}>
                          {chapter.chapterNumber}
                        </Text>
                      </View>
                    )}
                    <View style={styles.chapterInfo}>
                      <Text style={styles.chapterTitle}>{chapter.title}</Text>
                      <Text style={styles.chapterDescription} numberOfLines={1}>
                        {chapter.description}
                      </Text>
                      <View style={styles.chapterMeta}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.chapterMetaText}>{chapter.duration_minutes} min</Text>
                        {completedIds.has(chapter.id) && (
                          <>
                            <Text style={styles.chapterMetaText}>•</Text>
                            <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                            <Text style={[styles.chapterMetaText, styles.completedText]}>Completed</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {!isOffline && audioUrls.get(chapter.id) && (
                      <DownloadButton
                        contentId={chapter.id}
                        contentType="series_chapter"
                        audioUrl={audioUrls.get(chapter.id)!}
                        metadata={{
                          title: chapter.title,
                          duration_minutes: chapter.duration_minutes,
                          thumbnailUrl: series.thumbnailUrl,
                          parentId: series.id,
                          parentTitle: series.title,
                          audioPath: chapter.audioPath,
                        }}
                        size={20}
                        darkMode={true}
                        refreshKey={refreshKey}
                        onDownloadComplete={() => {
                          getDownloadedContentIds('series_chapter').then(setDownloadedIds);
                        }}
                        isPremiumLocked={!chapter.isFree && !hasSubscription}
                        onPremiumRequired={() => setShowPaywall(true)}
                      />
                    )}
                    <View style={styles.playButton}>
                      {!chapter.isFree && !hasSubscription ? (
                        <Ionicons name="lock-closed" size={20} color={theme.colors.sleepTextMuted} />
                      ) : (
                        <Ionicons name="play" size={20} color={theme.colors.sleepAccent} />
                      )}
                    </View>
                  </AnimatedPressable>
                </AnimatedView>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Floating Back Button */}
      <SafeAreaView style={styles.backButtonContainer} edges={['top']} pointerEvents="box-none">
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.sleepText} />
        </AnimatedPressable>
      </SafeAreaView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
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
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    heroSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
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
    seriesTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.sleepText,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    seriesMeta: {
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
      color: theme.colors.sleepTextMuted,
    },
    seriesDescription: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      color: theme.colors.sleepTextMuted,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    chaptersContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.sleepText,
      marginBottom: theme.spacing.md,
    },
    chapterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    chapterNumber: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterThumbnail: {
      width: 44,
      height: 44,
      borderRadius: 10,
    },
    chapterNumberText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
    },
    chapterInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    chapterTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.sleepText,
      marginBottom: 2,
    },
    chapterDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
      marginBottom: 4,
    },
    chapterMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    chapterMetaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.sleepTextMuted,
    },
    completedText: {
      color: '#4CAF50',
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
      color: theme.colors.sleepText,
      marginBottom: theme.spacing.md,
    },
    backLink: {
      padding: theme.spacing.sm,
    },
    backLinkText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.sleepAccent,
    },
  });

export default function SeriesDetail() {
  return (
    <ProtectedRoute>
      <SeriesDetailScreen />
    </ProtectedRoute>
  );
}

