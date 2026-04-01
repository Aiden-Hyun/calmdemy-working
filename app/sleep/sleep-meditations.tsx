import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { DownloadButton } from '../../src/components/DownloadButton';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Theme } from '../../src/theme';
import { FirestoreSleepMeditation } from '../../src/services/firestoreService';
import { useSleepMeditations } from '../../src/hooks/queries/useSleepQueries';
import { getAudioUrlFromPath } from '../../src/constants/audioFiles';
import { getDownloadedContentIds } from '../../src/services/downloadService';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../src/components/PaywallModal';

function SleepMeditationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const { data: meditations = [], isLoading: loading } = useSleepMeditations();
  const [showPaywall, setShowPaywall] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

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
      const ids = await getDownloadedContentIds('sleep_meditation');
      setDownloadedIds(ids);
      setRefreshKey(prev => prev + 1);
    })();
  }, [meditations]);

  const handleMeditationPress = (meditation: FirestoreSleepMeditation) => {
    if (!meditation.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(`/sleep/meditation/${meditation.id}`);
  };

  const renderMeditationItem = ({ item, index }: { item: FirestoreSleepMeditation; index: number }) => (
    <AnimatedView delay={100 + index * 30} duration={300}>
      <AnimatedPressable
        onPress={() => handleMeditationPress(item)}
        style={styles.meditationCard}
      >
        <View style={[styles.meditationIcon, { backgroundColor: `${item.color}20` }]}>
          <Ionicons
            name={item.icon as keyof typeof Ionicons.glyphMap}
            size={24}
            color={item.color}
          />
        </View>
        <View style={styles.meditationInfo}>
          <Text style={styles.meditationTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.meditationDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.meditationMetaRow}>
            <View style={styles.meditationMetaItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.sleepTextMuted} />
              <Text style={styles.meditationMeta}>{item.duration_minutes} min</Text>
            </View>
            <View style={styles.meditationMetaItem}>
              <Ionicons name="person-outline" size={12} color={theme.colors.sleepTextMuted} />
              <Text style={styles.meditationMeta}>{item.instructor}</Text>
            </View>
          </View>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType="sleep_meditation"
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: item.duration_minutes,
              thumbnailUrl: item.thumbnailUrl,
              audioPath: item.audioPath,
            }}
            size={20}
            darkMode={true}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds('sleep_meditation').then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        <View style={styles.meditationChevron}>
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
            <Text style={styles.headerTitle}>Sleep Meditations</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Description */}
          <AnimatedView delay={50} duration={400}>
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                Guided meditations to help you drift into peaceful sleep
              </Text>
            </View>
          </AnimatedView>

          {/* Meditations List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.sleepAccent} />
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
    descriptionContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
    },
    descriptionText: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      color: theme.colors.sleepTextMuted,
      textAlign: 'center',
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.xxl,
    },
    meditationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    meditationIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    meditationInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    meditationTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepText,
      marginBottom: 2,
    },
    meditationDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
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
      color: theme.colors.sleepTextMuted,
    },
    meditationChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

export default function SleepMeditations() {
  return (
    <ProtectedRoute>
      <SleepMeditationsScreen />
    </ProtectedRoute>
  );
}

