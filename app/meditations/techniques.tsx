import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { SkeletonListItem } from '../../src/components/Skeleton';
import { DownloadButton } from '../../src/components/DownloadButton';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Theme } from '../../src/theme';
import { useMeditationsByTechnique } from '../../src/hooks/queries/useMeditateQueries';
import { getAudioUrlFromPath } from '../../src/constants/audioFiles';
import { getDownloadedContentIds } from '../../src/services/downloadService';
import { GuidedMeditation, MeditationTechnique } from '../../src/types';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../src/components/PaywallModal';

// Technique categories defined as constants (not fetched from Firebase)
const techniqueCategories: {
  id: MeditationTechnique | 'all';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  description: string;
}[] = [
  {
    id: 'all',
    label: 'All',
    icon: 'grid-outline',
    color: '#6B7280',
    description: 'Browse all meditation techniques',
  },
  {
    id: 'breathing',
    label: 'Breathing',
    icon: 'fitness-outline',
    color: '#7DAFB4',
    description: 'Focus on your breath to calm the mind and body. Breathing techniques help reduce stress and increase mindfulness.',
  },
  {
    id: 'body-scan',
    label: 'Body Scan',
    icon: 'body-outline',
    color: '#8B9F82',
    description: 'Progressively relax each part of your body. Body scans help you become aware of physical sensations and release tension.',
  },
  {
    id: 'visualization',
    label: 'Visualization',
    icon: 'eye-outline',
    color: '#B4A7C7',
    description: 'Use mental imagery to create calm, peaceful scenes. Visualization helps manifest positive outcomes and reduce anxiety.',
  },
  {
    id: 'loving-kindness',
    label: 'Loving Kindness',
    icon: 'heart-outline',
    color: '#D4A5A5',
    description: 'Cultivate compassion for yourself and others. This practice increases feelings of warmth and connection.',
  },
  {
    id: 'mindfulness',
    label: 'Mindfulness',
    icon: 'leaf-outline',
    color: '#A8B4C4',
    description: 'Stay present in the moment without judgment. Mindfulness helps you observe thoughts and feelings with acceptance.',
  },
  {
    id: 'grounding',
    label: 'Grounding',
    icon: 'earth-outline',
    color: '#C4A77D',
    description: 'Connect with the present moment through your senses. Grounding techniques help during moments of anxiety or dissociation.',
  },
  {
    id: 'progressive-relaxation',
    label: 'Progressive Relaxation',
    icon: 'pulse-outline',
    color: '#7B8FA1',
    description: 'Tense and release muscle groups systematically. This technique is great for physical tension and sleep preparation.',
  },
];

function TechniquesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ technique?: string }>();
  const { theme, isDark } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const [selectedTechnique, setSelectedTechnique] = useState<string>(params.technique || 'all');
  const { data: meditations = [], isLoading: loading } = useMeditationsByTechnique(selectedTechnique);
  const [showPaywall, setShowPaywall] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    if (meditations.length === 0) return;
    (async () => {
      const urls = new Map<string, string>();
      for (const meditation of meditations) {
        if (meditation.audioPath) {
          const url = await getAudioUrlFromPath(meditation.audioPath);
          if (url) urls.set(meditation.id, url);
        }
      }
      setAudioUrls(urls);
      const ids = await getDownloadedContentIds('guided_meditation');
      setDownloadedIds(ids);
      setRefreshKey(prev => prev + 1);
    })();
  }, [meditations]);

  const handleMeditationPress = (meditation: GuidedMeditation) => {
    // Check isFree field from Firestore
    if (!meditation.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push({
      pathname: '/meditation/[id]',
      params: { id: meditation.id },
    });
  };

  const currentTechnique = techniqueCategories.find(t => t.id === selectedTechnique);

  const renderMeditationItem = ({ item, index }: { item: GuidedMeditation; index: number }) => (
    <AnimatedView delay={100 + index * 30} duration={300}>
      <AnimatedPressable
        onPress={() => handleMeditationPress(item)}
        style={styles.meditationCard}
      >
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.meditationImage} contentFit="cover" />
        ) : (
          <View style={[styles.meditationIcon, { backgroundColor: `${currentTechnique?.color || theme.colors.primary}20` }]}>
            <Ionicons
              name={currentTechnique?.icon || 'leaf'}
              size={24}
              color={currentTechnique?.color || theme.colors.primary}
            />
          </View>
        )}
        <View style={styles.meditationInfo}>
          <Text style={styles.meditationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meditationDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.meditationMetaRow}>
            <View style={styles.meditationMetaItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.meditationMeta}>{item.duration_minutes} min</Text>
            </View>
            {item.instructor && (
              <View style={styles.meditationMetaItem}>
                <Ionicons name="person-outline" size={12} color={theme.colors.textMuted} />
                <Text style={styles.meditationMeta}>{item.instructor}</Text>
              </View>
            )}
            <View style={styles.meditationMetaItem}>
              <Ionicons name="fitness-outline" size={12} color={theme.colors.textMuted} />
              <Text style={styles.meditationMeta}>{item.difficulty_level}</Text>
            </View>
          </View>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType="guided_meditation"
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: item.duration_minutes,
              thumbnailUrl: item.thumbnailUrl,
              audioPath: item.audioPath,
            }}
            size={20}
            darkMode={false}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds('guided_meditation').then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        <View style={styles.meditationChevron}>
          {!item.isFree && !hasSubscription ? (
            <Ionicons name="lock-closed" size={18} color={theme.colors.textMuted} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          )}
        </View>
      </AnimatedPressable>
    </AnimatedView>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Techniques</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Technique Filter */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {techniqueCategories.map((technique) => (
            <AnimatedPressable
              key={technique.id}
              onPress={() => setSelectedTechnique(technique.id)}
              style={[
                styles.filterChip,
                selectedTechnique === technique.id && styles.filterChipSelected,
                selectedTechnique === technique.id && {
                  borderColor: technique.color,
                  backgroundColor: `${technique.color}15`,
                },
              ]}
            >
              <Ionicons
                name={technique.icon}
                size={16}
                color={selectedTechnique === technique.id ? technique.color : theme.colors.textLight}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedTechnique === technique.id && { color: technique.color },
                ]}
              >
                {technique.label}
              </Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      </View>

      {/* Description for selected technique */}
      {selectedTechnique !== 'all' && currentTechnique && (
        <AnimatedView delay={50} duration={300}>
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText}>
              {currentTechnique.description}
            </Text>
          </View>
        </AnimatedView>
      )}

      {/* Meditations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[0, 1, 2, 3, 4].map((_, index) => (
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
      ) : meditations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="leaf-outline" size={48} color={theme.colors.textMuted} />
          </View>
          <Text style={styles.emptyText}>No meditations found</Text>
          <Text style={styles.emptySubtext}>
            {selectedTechnique !== 'all'
              ? `No ${currentTechnique?.label || ''} meditations available yet`
              : 'Check back soon for new content'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={meditations}
          keyExtractor={(item) => item.id}
          renderItem={renderMeditationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
        />
      )}

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
      color: theme.colors.text,
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
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: 'transparent',
      gap: 6,
      ...theme.shadows.sm,
    },
    filterChipSelected: {
      borderWidth: 1.5,
    },
    filterChipText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.textLight,
    },
    descriptionContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    descriptionText: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      lineHeight: 20,
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
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    emptySubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    meditationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    meditationIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meditationImage: {
      width: 56,
      height: 56,
      borderRadius: 16,
    },
    meditationInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    meditationTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 2,
    },
    meditationDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      marginBottom: 6,
    },
    meditationMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    meditationMetaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    meditationMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.textMuted,
      textTransform: 'capitalize',
    },
    meditationChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.gray[100],
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default function Techniques() {
  return (
    <ProtectedRoute>
      <TechniquesScreen />
    </ProtectedRoute>
  );
}
