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
import { getAlbumById, FirestoreAlbum, FirestoreAlbumTrack, getCompletedContentIds } from '../../src/services/firestoreService';
import { useAuth } from '../../src/contexts/AuthContext';
import { DownloadButton } from '../../src/components/DownloadButton';
import { getAudioUrlFromPath } from '../../src/constants/audioFiles';
import { useNetwork } from '../../src/contexts/NetworkContext';
import { getDownloadedContentIds } from '../../src/services/downloadService';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../src/components/PaywallModal';

function AlbumDetailScreen() {
  const router = useRouter();
  const { id, autoOpenItemId } = useLocalSearchParams<{ id: string; autoOpenItemId?: string }>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { isPremium: hasSubscription } = useSubscription();
  const [album, setAlbum] = useState<FirestoreAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const hasAutoOpened = useRef(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    async function loadAlbum() {
      if (!id) return;
      setLoading(true);
      const data = await getAlbumById(id);
      setAlbum(data);
      setLoading(false);
    }
    loadAlbum();
  }, [id]);

  // Fetch completed track IDs (refetch when screen comes into focus)
  useFocusEffect(
    useCallback(() => {
      async function loadCompletedIds() {
        if (!user) return;
        const ids = await getCompletedContentIds(user.uid, 'album_track');
        setCompletedIds(ids);
      }
      loadCompletedIds();
    }, [user])
  );

  // Refresh download status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function loadDownloadedIds() {
        const ids = await getDownloadedContentIds('album_track');
        setDownloadedIds(ids);
      }
      loadDownloadedIds();
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Fetch audio URLs for tracks
  useEffect(() => {
    async function loadAudioUrls() {
      if (!album) return;
      const urls = new Map<string, string>();
      for (const track of album.tracks) {
        const url = await getAudioUrlFromPath(track.audioPath);
        if (url) {
          urls.set(track.id, url);
        }
      }
      setAudioUrls(urls);
    }
    loadAudioUrls();
  }, [album]);

  // Auto-open a specific track if autoOpenItemId is provided
  useEffect(() => {
    if (!album || !autoOpenItemId || hasAutoOpened.current) return;
    
    const index = album.tracks.findIndex(t => t.id === autoOpenItemId);
    if (index !== -1) {
      hasAutoOpened.current = true;
      const track = album.tracks[index];
      router.push({
        pathname: '/album/track/[id]',
        params: {
          id: track.id,
          audioPath: track.audioPath,
          title: track.title,
          albumTitle: album.title,
          duration: String(track.duration_minutes),
          artist: album.artist,
          thumbnailUrl: album.thumbnailUrl || '',
          tracksJson: JSON.stringify(album.tracks),
          currentIndex: String(index),
        },
      });
    }
  }, [album, autoOpenItemId]);

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

  if (!album) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={theme.gradients.sleepyNight as [string, string]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Album not found</Text>
              <AnimatedPressable onPress={() => router.back()} style={styles.backLink}>
                <Text style={styles.backLinkText}>Go back</Text>
              </AnimatedPressable>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  const handleTrackPress = (track: FirestoreAlbumTrack, index: number) => {
    // Check isFree field from Firestore
    if (!track.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    // Navigate to album track player
    router.push({
      pathname: '/album/track/[id]',
      params: {
        id: track.id,
        audioPath: track.audioPath,
        title: track.title,
        albumTitle: album.title,
        duration: String(track.duration_minutes),
        artist: album.artist,
        thumbnailUrl: album.thumbnailUrl || '',
        tracksJson: JSON.stringify(album.tracks),
        currentIndex: String(index),
      },
    });
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (album.category) {
      case 'ambient':
        return 'planet';
      case 'piano':
        return 'musical-notes';
      case 'nature':
        return 'leaf';
      case 'classical':
        return 'musical-note';
      case 'lofi':
        return 'headset';
      default:
        return 'disc';
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
                {album.thumbnailUrl ? (
                  <Image
                    source={{ uri: album.thumbnailUrl }}
                    style={styles.heroImage}
                  />
                ) : (
                  <View style={[styles.heroIcon, { backgroundColor: `${album.color}25` }]}>
                    <Ionicons name={getCategoryIcon()} size={48} color={album.color} />
                  </View>
                )}
                <Text style={styles.albumTitle}>{album.title}</Text>
                <View style={styles.albumMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons name="disc-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{album.trackCount} tracks</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{album.totalDuration} min</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={16} color={theme.colors.sleepTextMuted} />
                    <Text style={styles.metaText}>{album.artist}</Text>
                  </View>
                </View>
                <Text style={styles.albumDescription}>{album.description}</Text>
              </View>
            </AnimatedView>

            {/* Tracks List */}
            <View style={styles.tracksContainer}>
              <AnimatedView delay={100} duration={400}>
                <Text style={styles.sectionTitle}>Tracks</Text>
              </AnimatedView>

              {album.tracks.map((track, index) => (
                <AnimatedView key={track.id} delay={150 + index * 40} duration={300}>
                  <AnimatedPressable
                    onPress={() => handleTrackPress(track, index)}
                    style={styles.trackCard}
                  >
                    {album.thumbnailUrl ? (
                      <Image
                        source={{ uri: album.thumbnailUrl }}
                        style={styles.trackThumbnail}
                      />
                    ) : (
                      <View style={[styles.trackNumber, { backgroundColor: `${album.color}20` }]}>
                        <Text style={[styles.trackNumberText, { color: album.color }]}>
                          {track.trackNumber}
                        </Text>
                      </View>
                    )}
                    <View style={styles.trackInfo}>
                      <Text style={styles.trackTitle}>{track.title}</Text>
                      <View style={styles.trackMeta}>
                        <Ionicons name="time-outline" size={12} color={theme.colors.sleepTextMuted} />
                        <Text style={styles.trackMetaText}>{track.duration_minutes} min</Text>
                        {completedIds.has(track.id) && (
                          <>
                            <Text style={styles.trackMetaText}>•</Text>
                            <Ionicons name="checkmark-circle" size={12} color="#4CAF50" />
                            <Text style={[styles.trackMetaText, styles.completedText]}>Completed</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {!isOffline && audioUrls.get(track.id) && (
                      <DownloadButton
                        contentId={track.id}
                        contentType="album_track"
                        audioUrl={audioUrls.get(track.id)!}
                        metadata={{
                          title: track.title,
                          duration_minutes: track.duration_minutes,
                          thumbnailUrl: album.thumbnailUrl,
                          parentId: album.id,
                          parentTitle: album.title,
                          audioPath: track.audioPath,
                        }}
                        size={20}
                        darkMode={true}
                        refreshKey={refreshKey}
                        onDownloadComplete={() => {
                          getDownloadedContentIds('album_track').then(setDownloadedIds);
                        }}
                        isPremiumLocked={!track.isFree && !hasSubscription}
                        onPremiumRequired={() => setShowPaywall(true)}
                      />
                    )}
                    <View style={styles.playButton}>
                      {!track.isFree && !hasSubscription ? (
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
    albumTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.sleepText,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    albumMeta: {
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
    albumDescription: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      color: theme.colors.sleepTextMuted,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    tracksContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.sleepText,
      marginBottom: theme.spacing.md,
    },
    trackCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    trackNumber: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trackThumbnail: {
      width: 40,
      height: 40,
      borderRadius: 10,
    },
    trackNumberText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
    },
    trackInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    trackTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.sleepText,
      marginBottom: 4,
    },
    trackMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    trackMetaText: {
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

export default function AlbumDetail() {
  return (
    <ProtectedRoute>
      <AlbumDetailScreen />
    </ProtectedRoute>
  );
}

