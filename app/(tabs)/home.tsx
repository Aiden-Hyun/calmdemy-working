import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { useTodayQuote, useListeningHistory, useFavorites } from '../../src/hooks/queries/useHomeQueries';
import { useEmergencyMeditations } from '../../src/hooks/queries/useMeditateQueries';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { ContentCard } from '../../src/components/ContentCard';
import { Skeleton } from '../../src/components/Skeleton';
import { PaywallModal } from '../../src/components/PaywallModal';
import { useStats } from '../../src/hooks/useStats';
import { parseSessionCode } from '../../src/utils/courseCodeParser';
import {
  ResolvedContent,
  FirestoreEmergencyMeditation,
  findSeriesIdByChapterId,
  findAlbumIdByTrackId,
  findCourseIdBySessionId,
} from '../../src/services/firestoreService';
import { Theme } from '../../src/theme';
import { ListeningHistoryItem } from '../../src/types';

function HomeScreen() {
  const { user, isAnonymous } = useAuth();
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { stats, loading: statsLoading } = useStats();
  const { restorePurchases, isPremium: hasSubscription } = useSubscription();
  const queryClient = useQueryClient();

  // React Query hooks — only fetch what's directly rendered on Home
  const { data: quote } = useTodayQuote();
  const { data: recentlyPlayed = [], isLoading: historyLoading } = useListeningHistory();
  const { data: favorites = [], isLoading: favoritesLoading } = useFavorites();
  const { data: emergencyMeditations = [], isLoading: emergencyLoading } = useEmergencyMeditations();

  // Refreshing state for pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  
  // Generate a consistent random nickname for anonymous users based on their UID
  const generateGuestNickname = (uid: string): string => {
    const adjectives = [
      'Calm', 'Peaceful', 'Serene', 'Gentle', 'Mindful', 'Tranquil', 'Zen',
      'Cozy', 'Dreamy', 'Blissful', 'Mellow', 'Quiet', 'Still', 'Soft',
      'Happy', 'Bright', 'Sunny', 'Warm', 'Kind', 'Sweet', 'Lovely'
    ];
    const animals = [
      'Panda', 'Koala', 'Bunny', 'Owl', 'Fox', 'Bear', 'Deer', 'Dove',
      'Swan', 'Cloud', 'Moon', 'Star', 'Wave', 'Breeze', 'Leaf', 'Lotus',
      'Butterfly', 'Dolphin', 'Seal', 'Otter', 'Sloth', 'Cat', 'Penguin'
    ];
    // Use UID to generate consistent indices
    const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const adjIndex = hash % adjectives.length;
    const animalIndex = (hash * 7) % animals.length;
    return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
  };

  const displayName = useMemo(() => {
    const directName =
      user?.displayName ||
      user?.providerData?.find((provider) => provider.displayName)?.displayName;
    if (directName) return directName;

    const emailPrefix = user?.email?.split('@')[0];
    if (emailPrefix) return emailPrefix;
    
    // For anonymous users, generate a fun random nickname
    if (isAnonymous && user?.uid) {
      return generateGuestNickname(user.uid);
    }
    
    return 'Friend';
  }, [user, isAnonymous]);

  // Refresh home data on pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['todayQuote'] });
    await queryClient.invalidateQueries({ queryKey: ['listeningHistory'] });
    await queryClient.invalidateQueries({ queryKey: ['favorites'] });
    setRefreshing(false);
  }, [user, queryClient]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Time to rest';
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅';
    if (hour < 17) return '☀️';
    if (hour < 21) return '🌿';
    return '🌙';
  };

  const handleEmergencyPress = (meditation: FirestoreEmergencyMeditation) => {
    if (!meditation.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push({
      pathname: '/emergency/[id]',
      params: {
        id: meditation.id,
        title: meditation.title,
        description: meditation.description,
        duration: meditation.duration_minutes.toString(),
        audioPath: meditation.audioPath,
        color: meditation.color,
        icon: meditation.icon,
        narrator: meditation.narrator || '',
        thumbnailUrl: meditation.thumbnailUrl || '',
      },
    });
  };

  const renderStreakDots = () => {
    const currentStreak = stats?.current_streak || 0;
    const dots = [];
    for (let i = 0; i < 7; i++) {
      dots.push(
        <View
          key={i}
          style={[
            styles.streakDot,
            i < currentStreak ? styles.streakDotFilled : styles.streakDotEmpty
          ]}
        />
      );
    }
    return dots;
  };

  const navigateToContent = useCallback(async (contentId: string, contentType: string) => {
    // Handle emergency content that may have been saved with wrong type
    if (contentId.startsWith('emergency_')) {
      const em = emergencyMeditations.find(e => e.id === contentId);
      if (em) {
        router.push({
          pathname: '/emergency/[id]',
          params: {
            id: em.id, title: em.title, description: em.description,
            duration: String(em.duration_minutes), audioPath: em.audioPath,
            color: em.color, icon: em.icon, narrator: em.narrator || ''
          }
        });
      } else {
        router.push('/(tabs)/meditate');
      }
      return;
    }

    switch (contentType) {
      case 'meditation':
        router.push({ pathname: '/meditation/[id]', params: { id: contentId } });
        break;
      case 'bedtime_story':
        router.push({ pathname: '/sleep/[id]', params: { id: contentId } });
        break;
      case 'breathing_exercise':
        router.push('/breathing');
        break;
      case 'nature_sound':
        router.push({ pathname: '/music/[id]', params: { id: contentId } });
        break;
      case 'series_chapter': {
        const seriesId = await findSeriesIdByChapterId(contentId);
        if (seriesId) {
          router.push({ pathname: '/series/[id]', params: { id: seriesId, autoOpenItemId: contentId } });
        } else {
          router.push('/(tabs)/sleep');
        }
        break;
      }
      case 'album_track': {
        const albumId = await findAlbumIdByTrackId(contentId);
        if (albumId) {
          router.push({ pathname: '/album/[id]', params: { id: albumId, autoOpenItemId: contentId } });
        } else {
          router.push('/(tabs)/music');
        }
        break;
      }
      case 'emergency': {
        const emergency = emergencyMeditations.find(e => e.id === contentId);
        if (emergency) {
          router.push({
            pathname: '/emergency/[id]',
            params: {
              id: emergency.id, title: emergency.title, description: emergency.description,
              duration: String(emergency.duration_minutes), audioPath: emergency.audioPath,
              color: emergency.color, icon: emergency.icon, narrator: emergency.narrator || ''
            }
          });
        } else {
          router.push('/(tabs)/meditate');
        }
        break;
      }
      case 'course_session': {
        const courseId = await findCourseIdBySessionId(contentId);
        if (courseId) {
          router.push({ pathname: '/course/[id]', params: { id: courseId, autoOpenItemId: contentId } });
        } else {
          router.push('/(tabs)/meditate');
        }
        break;
      }
      case 'sleep_meditation':
        router.push({ pathname: '/sleep/meditation/[id]', params: { id: contentId } });
        break;
    }
  }, [emergencyMeditations, router]);

  const getContentIcon = (contentType: string): keyof typeof Ionicons.glyphMap => {
    switch (contentType) {
      case 'meditation':
        return 'leaf';
      case 'bedtime_story':
      case 'series_chapter':
        return 'book';
      case 'album_track':
        return 'musical-notes';
      case 'breathing_exercise':
        return 'cloud';
      case 'nature_sound':
        return 'musical-notes';
      case 'emergency':
        return 'flash';
      case 'course_session':
        return 'school';
      case 'sleep_meditation':
        return 'moon';
      default:
        return 'play-circle';
    }
  };

  const intentionGradient = isDark 
    ? [theme.colors.surface, theme.colors.background] as [string, string]
    : ['#F5EDE3', '#FAF8F5'] as [string, string];

  const renderRecentlyPlayedItem = useCallback(({ item }: { item: ListeningHistoryItem }) => {
    // Use stored thumbnail or look up from local data
    const thumbnailUrl = item.content_thumbnail;
    
    // For course sessions, show code badge and module info
    const isCourseSession = item.content_type === 'course_session';
    const courseCode = isCourseSession ? item.course_code : undefined;
    const moduleInfo = isCourseSession && item.session_code && item.course_code
      ? parseSessionCode(item.session_code, item.course_code)
      : undefined;
    
    return (
      <ContentCard
        title={item.content_title}
        thumbnailUrl={thumbnailUrl}
        fallbackIcon={getContentIcon(item.content_type)}
        code={courseCode}
        subtitle={moduleInfo}
        meta={`${item.duration_minutes} min`}
        onPress={() => navigateToContent(item.content_id, item.content_type)}
      />
    );
  }, []);

  const renderFavoriteItem = useCallback(({ item }: { item: ResolvedContent }) => {
    // For course sessions, show code badge and module info
    const isCourseSession = item.content_type === 'course_session';
    const courseCode = isCourseSession ? item.course_code : undefined;
    const moduleInfo = isCourseSession && item.session_code && item.course_code
      ? parseSessionCode(item.session_code, item.course_code)
      : undefined;
    
    return (
    <ContentCard
      title={item.title}
      thumbnailUrl={item.thumbnail_url}
      fallbackIcon={getContentIcon(item.content_type)}
        code={courseCode}
        subtitle={moduleInfo}
      meta={`${item.duration_minutes} min`}
      onPress={() => navigateToContent(item.id, item.content_type)}
    />
    );
  }, []);

  const renderSkeletonCards = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalListContent}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.skeletonCard}>
          <Skeleton width={150} height={120} style={{ borderRadius: theme.borderRadius.lg }} />
          <Skeleton width={120} height={14} style={{ marginTop: 8 }} />
          <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
        </View>
      ))}
    </ScrollView>
  );

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={32} color={theme.colors.textLight} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <AnimatedView delay={0} duration={400}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>
              {getGreeting()} {getGreetingEmoji()}
            </Text>
            <Text style={styles.userName}>
              {displayName}
            </Text>
            {isAnonymous && (
              <AnimatedPressable onPress={restorePurchases} style={styles.restoreLink}>
                <Text style={styles.restoreLinkText}>
                  Already subscribed? <Text style={styles.restoreLinkUnderline}>Restore purchase</Text>
                </Text>
              </AnimatedPressable>
            )}
          </View>
            <AnimatedPressable 
              onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={22} color={theme.colors.textLight} />
            </AnimatedPressable>
        </View>
        </AnimatedView>

        {/* Recently Played Section */}
        <View style={styles.section}>
        <AnimatedView delay={100} duration={400}>
            <Text style={styles.sectionTitle}>Recently Played</Text>
          </AnimatedView>
          
          <AnimatedView delay={150} duration={400}>
            {isAnonymous ? (
              <AnimatedPressable
                onPress={() => router.push(hasSubscription ? '/login?mode=link' : '/login')}
                style={styles.signInPromptInline}
              >
                <Text style={styles.signInPromptInlineText}>
                  {hasSubscription ? "Link your account to track listening history" : "Sign in to track your listening history"}
                </Text>
                <View style={styles.signInPromptInlineButton}>
                  <Text style={styles.signInPromptInlineButtonText}>{hasSubscription ? "Link Account" : "Sign In"}</Text>
                </View>
              </AnimatedPressable>
            ) : historyLoading ? (
              renderSkeletonCards()
            ) : recentlyPlayed.length > 0 ? (
              <FlatList
                horizontal
                data={recentlyPlayed}
                keyExtractor={(item) => item.id}
                renderItem={renderRecentlyPlayedItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContent}
              />
            ) : (
              renderEmptyState("Start listening to build your history")
            )}
          </AnimatedView>
        </View>

        {/* Favorites Section */}
          <View style={styles.section}>
          <AnimatedView delay={200} duration={400}>
            <Text style={styles.sectionTitle}>Favorites</Text>
          </AnimatedView>
          
          <AnimatedView delay={250} duration={400}>
            {isAnonymous ? (
              <AnimatedPressable
                onPress={() => router.push(hasSubscription ? '/login?mode=link' : '/login')}
                style={styles.signInPromptInline}
              >
                <Text style={styles.signInPromptInlineText}>
                  {hasSubscription ? "Link your account to save favorites" : "Sign in to save your favorites"}
                </Text>
                <View style={styles.signInPromptInlineButton}>
                  <Text style={styles.signInPromptInlineButtonText}>{hasSubscription ? "Link Account" : "Sign In"}</Text>
                </View>
              </AnimatedPressable>
            ) : favoritesLoading ? (
              renderSkeletonCards()
            ) : favorites.length > 0 ? (
              <FlatList
                horizontal
                data={favorites}
                keyExtractor={(item) => item.id}
                renderItem={renderFavoriteItem}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalListContent}
              />
            ) : (
              renderEmptyState("Tap the heart icon to save favorites")
            )}
            </AnimatedView>
          </View>

        {/* Emergency Section */}
        <View style={styles.section}>
          <AnimatedView delay={300} duration={400}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyTitleRow}>
                <Ionicons name="flash" size={20} color="#E57373" />
                <Text style={styles.emergencyTitle}>Emergency</Text>
              </View>
              <Text style={styles.emergencySubtitle}>Quick relief in 1-3 minutes</Text>
            </View>
          </AnimatedView>

          <AnimatedView delay={350} duration={400}>
            {emergencyLoading ? renderSkeletonCards() : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalListContent}
            >
              {emergencyMeditations.map((meditation) => (
                <ContentCard
                  key={meditation.id}
                  title={meditation.title}
                  thumbnailUrl={meditation.thumbnailUrl}
                  fallbackIcon={meditation.icon as keyof typeof Ionicons.glyphMap}
                  fallbackColor={meditation.color}
                  meta={`${meditation.duration_minutes} min`}
                  isFree={meditation.isFree}
                  onPress={() => handleEmergencyPress(meditation)}
                />
              ))}
            </ScrollView>
            )}
          </AnimatedView>
        </View>

        {/* Your Journey Section */}
        <View style={styles.section}>
          <AnimatedView delay={400} duration={400}>
          <Text style={styles.sectionTitle}>Your Journey</Text>
          </AnimatedView>
          
          <AnimatedView delay={450} duration={400}>
            {statsLoading ? (
              <View style={styles.journeyCard}>
                <View style={styles.streakRow}>
                  <Skeleton width={120} height={12} />
                  <Skeleton width={60} height={28} />
                </View>
                <View style={styles.journeyDivider} />
                <View style={styles.journeyStats}>
                  <View style={styles.journeyStat}>
                    <Skeleton width={50} height={22} style={{ marginBottom: 4 }} />
                    <Skeleton width={80} height={14} />
                  </View>
                  <View style={styles.journeyStat}>
                    <Skeleton width={50} height={22} style={{ marginBottom: 4 }} />
                    <Skeleton width={80} height={14} />
                  </View>
                </View>
              </View>
            ) : (
              <AnimatedPressable onPress={() => router.push('/stats')} style={styles.journeyCard}>
            <View style={styles.streakRow}>
              <View style={styles.streakDots}>
                {renderStreakDots()}
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{stats?.current_streak || 0}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>
            <View style={styles.journeyDivider} />
            <View style={styles.journeyStats}>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>
                  {stats?.weekly_minutes?.reduce((a, b) => a + b, 0) || 0}
                </Text>
                <Text style={styles.journeyStatLabel}>min this week</Text>
              </View>
              <View style={styles.journeyStat}>
                <Text style={styles.journeyStatValue}>{stats?.total_sessions || 0}</Text>
                <Text style={styles.journeyStatLabel}>total sessions</Text>
              </View>
            </View>
              </AnimatedPressable>
            )}
          </AnimatedView>
        </View>

        {/* Inspirational Quote Section */}
          <AnimatedView delay={500} duration={400}>
          <View style={styles.quoteCard}>
            <LinearGradient
              colors={intentionGradient}
              style={styles.quoteGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              >
              <View style={styles.quoteIcon}>
                <Text style={styles.quoteEmoji}>✨</Text>
                  </View>
              <Text style={styles.quoteLabel}>Daily Inspiration</Text>
              <Text style={styles.quoteText}>
                {quote?.text || "Take a breath. You're exactly where you need to be."}
              </Text>
              {quote?.author && (
                <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              )}
            </LinearGradient>
          </View>
        </AnimatedView>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  greeting: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 15,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  userName: {
    fontFamily: theme.fonts.display.semiBold,
    fontSize: 26,
    color: theme.colors.text,
    letterSpacing: -0.3,
  },
  headerLeft: {
    flex: 1,
  },
  restoreLink: {
    marginTop: 6,
  },
  restoreLinkText: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  restoreLinkUnderline: {
    textDecorationLine: 'underline',
    color: theme.colors.primary,
  },
  settingsButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  section: {
    marginTop: theme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
    },
    emergencyHeader: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    emergencyTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emergencyTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    emergencySubtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      marginTop: 4,
    },
    horizontalListContent: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    skeletonCard: {
      width: 150,
    },
    emptyState: {
      marginHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
      gap: theme.spacing.sm,
  },
    emptyStateText: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 14,
      color: theme.colors.textLight,
      textAlign: 'center',
  },
  journeyCard: {
      marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakDots: {
    flexDirection: 'row',
      gap: 10,
  },
  streakDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
  },
  streakDotFilled: {
    backgroundColor: theme.colors.primary,
  },
  streakDotEmpty: {
    backgroundColor: theme.colors.gray[200],
  },
  streakInfo: {
    alignItems: 'flex-end',
  },
  streakNumber: {
    fontFamily: theme.fonts.display.bold,
      fontSize: 32,
    color: theme.colors.primary,
  },
  streakLabel: {
    fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
    color: theme.colors.textLight,
  },
  journeyDivider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
      marginVertical: theme.spacing.lg,
  },
  journeyStats: {
    flexDirection: 'row',
  },
  journeyStat: {
    flex: 1,
  },
  journeyStatValue: {
    fontFamily: theme.fonts.display.semiBold,
      fontSize: 24,
    color: theme.colors.text,
  },
  journeyStatLabel: {
    fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
    color: theme.colors.textLight,
      marginTop: 4,
  },
    quoteCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.xl,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    quoteGradient: {
      padding: theme.spacing.xl,
      alignItems: 'center',
    },
    quoteIcon: {
      marginBottom: theme.spacing.sm,
  },
    quoteEmoji: {
      fontSize: 32,
  },
    quoteLabel: {
    fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: theme.colors.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: theme.spacing.sm,
    },
    quoteText: {
      fontFamily: theme.fonts.body.italic,
      fontSize: 18,
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 26,
    },
    quoteAuthor: {
      fontFamily: theme.fonts.ui.regular,
    fontSize: 14,
      color: theme.colors.textLight,
      marginTop: theme.spacing.sm,
  },
    signInPromptCard: {
      marginHorizontal: theme.spacing.lg,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      alignItems: 'center',
      ...theme.shadows.md,
    },
    signInPromptIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    signInPromptTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    signInPromptText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    signInPromptButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.sm,
    },
    signInPromptButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.textOnPrimary,
    },
    signInPromptInline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.surface,
      marginHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      ...theme.shadows.sm,
    },
    signInPromptInlineText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textMuted,
      flex: 1,
      marginRight: theme.spacing.md,
    },
    signInPromptInlineButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
    },
    signInPromptInlineButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textOnPrimary,
  },
});

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeScreen />
    </ProtectedRoute>
  );
}
