import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { SkeletonListItem } from '../../src/components/Skeleton';
import { DownloadButton } from '../../src/components/DownloadButton';
import { useBedtimeStories } from '../../src/hooks/queries/useSleepQueries';
import { getAudioUrl } from '../../src/constants/audioFiles';
import { getDownloadedContentIds } from '../../src/services/downloadService';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Theme } from '../../src/theme';
import { BedtimeStory } from '../../src/types';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../src/components/PaywallModal';

const categories = [
  { id: 'all', label: 'All', icon: 'grid-outline' as const },
  { id: 'nature', label: 'Nature', icon: 'leaf-outline' as const },
  { id: 'fantasy', label: 'Fantasy', icon: 'planet-outline' as const },
  { id: 'travel', label: 'Travel', icon: 'airplane-outline' as const },
  { id: 'thriller', label: 'Thriller', icon: 'skull-outline' as const },
  { id: 'fiction', label: 'Fiction', icon: 'book-outline' as const },
];

function BedtimeStoriesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { data: stories = [], isLoading: loading } = useBedtimeStories();
  const [showPaywall, setShowPaywall] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (stories.length === 0) return;
    (async () => {
      const urls = new Map<string, string>();
      for (const story of stories) {
        if (story.audio_file) {
          const url = await getAudioUrl(story.audio_file);
          if (url) urls.set(story.id, url);
        } else if (story.audio_url) {
          urls.set(story.id, story.audio_url);
        }
      }
      setAudioUrls(urls);
      const ids = await getDownloadedContentIds('bedtime_story');
      setDownloadedIds(ids);
      setRefreshKey(prev => prev + 1);
    })();
  }, [stories]);

  const filteredStories = useMemo(() => {
    if (selectedCategory === 'all') return stories;
    return stories.filter((story) => story.category === selectedCategory);
  }, [stories, selectedCategory]);

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'nature':
        return 'leaf';
      case 'fantasy':
        return 'planet';
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

  const handleStoryPress = (story: BedtimeStory) => {
    if (!story.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(`/sleep/${story.id}`);
  };

  const renderStoryItem = ({ item, index }: { item: BedtimeStory; index: number }) => (
    <AnimatedView delay={100 + index * 30} duration={300}>
      <AnimatedPressable
        onPress={() => handleStoryPress(item)}
        style={styles.storyCard}
      >
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.storyImage} />
        ) : (
          <View style={styles.storyIcon}>
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={24}
              color={theme.colors.sleepAccent}
            />
          </View>
        )}
        <View style={styles.storyInfo}>
          <Text style={styles.storyTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.storyDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.storyMetaRow}>
            <View style={styles.storyMetaItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.sleepTextMuted} />
              <Text style={styles.storyMeta}>{item.duration_minutes} min</Text>
            </View>
            <View style={styles.storyMetaItem}>
              <Ionicons name="mic-outline" size={12} color={theme.colors.sleepTextMuted} />
              <Text style={styles.storyMeta}>{item.narrator}</Text>
            </View>
          </View>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType="bedtime_story"
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: item.duration_minutes,
              thumbnailUrl: item.thumbnail_url,
              audioPath: item.audio_file,
            }}
            size={20}
            darkMode={true}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds('bedtime_story').then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        <View style={styles.storyChevron}>
          {!item.isFree && !hasSubscription ? (
            <Ionicons name="lock-closed" size={18} color={theme.colors.sleepTextMuted} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.sleepTextMuted} />
          )}
        </View>
      </AnimatedPressable>
    </AnimatedView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.sleepyNight as [string, string]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.sleepText} />
            </AnimatedPressable>
            <Text style={styles.headerTitle}>Bedtime Stories</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Category Filter */}
          <View style={styles.filterContainer}>
            <FlatList
              horizontal
              data={categories}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => (
                <AnimatedPressable
                  onPress={() => setSelectedCategory(item.id)}
                  style={[
                    styles.filterChip,
                    selectedCategory === item.id && styles.filterChipSelected,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={
                      selectedCategory === item.id
                        ? theme.colors.sleepBackground
                        : theme.colors.sleepTextMuted
                    }
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === item.id && styles.filterChipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </AnimatedPressable>
              )}
            />
          </View>

          {/* Stories List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              {[0, 1, 2, 3].map((_, index) => (
                <AnimatedView key={index} delay={index * 50} duration={300}>
                  <SkeletonListItem
                    style={{
                      marginBottom: theme.spacing.sm,
                      marginHorizontal: theme.spacing.lg,
                    }}
                  />
                </AnimatedView>
              ))}
            </View>
          ) : filteredStories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="book-outline" size={48} color={theme.colors.sleepTextMuted} />
              </View>
              <Text style={styles.emptyText}>No stories found</Text>
              <Text style={styles.emptySubtext}>
                {selectedCategory !== 'all'
                  ? `No ${selectedCategory} stories available yet`
                  : 'Check back soon for new stories'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredStories}
              keyExtractor={(item) => item.id}
              renderItem={renderStoryItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
            />
          )}
        </SafeAreaView>
      </LinearGradient>

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: theme.colors.sleepText,
      textAlign: 'center',
    },
    headerSpacer: {
      width: 40,
    },
    filterContainer: {
      marginTop: 0,
    },
    filterList: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.sleepSurface,
      gap: 6,
    },
    filterChipSelected: {
      backgroundColor: theme.colors.sleepAccent,
    },
    filterChipText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
    },
    filterChipTextSelected: {
      color: theme.colors.sleepBackground,
    },
    loadingContainer: {
      paddingTop: theme.spacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxl,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.sleepSurface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepText,
    },
    emptySubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.sleepTextMuted,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    storyCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    storyIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: 'rgba(201, 184, 150, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    storyImage: {
      width: 56,
      height: 56,
      borderRadius: 16,
      resizeMode: 'cover',
    },
    storyInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    storyTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepText,
      marginBottom: 2,
    },
    storyDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
      marginBottom: 6,
    },
    storyMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    storyMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    storyMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.sleepTextMuted,
    },
    storyChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default function BedtimeStories() {
  return (
    <ProtectedRoute>
      <BedtimeStoriesScreen />
    </ProtectedRoute>
  );
}

