import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { MediaPlayer } from '../../src/components/MediaPlayer';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { usePlayerBehavior } from '../../src/hooks/usePlayerBehavior';
import { useTheme } from '../../src/contexts/ThemeContext';
import { getMeditationById } from '../../src/services/firestoreService';
import { getAudioUrlFromPath } from '../../src/constants/audioFiles';
import { Theme } from '../../src/theme';
import { GuidedMeditation } from '../../src/types';

function MeditationPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [meditation, setMeditation] = useState<GuidedMeditation | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const audioPlayer = useAudioPlayer();

  // Use the shared player behavior hook
  const {
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  } = usePlayerBehavior({
    contentId: id as string,
    contentType: "guided_meditation",
    audioPlayer,
    title: meditation?.title,
    durationMinutes: meditation?.duration_minutes,
    thumbnailUrl: meditation?.thumbnailUrl,
  });

  useEffect(() => {
    async function loadMeditation() {
      try {
        setLoading(true);
        const data = await getMeditationById(id as string);
        setMeditation(data);
      } catch (error) {
        console.error('Failed to load meditation:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      loadMeditation();
    }
  }, [id]);

  useEffect(() => {
    async function loadMeditationAudio() {
      if (!meditation) return;
      
      if (meditation.audioPath) {
        const url = await getAudioUrlFromPath(meditation.audioPath);
        if (url) {
          setAudioUrl(url);
          audioPlayer.loadAudio(url);
        }
      }
    }
    
    loadMeditationAudio();
  }, [meditation]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  const getGradientColors = (): [string, string] => {
    const primaryTheme = meditation?.themes?.[0] || 'focus';
    switch (primaryTheme) {
      case 'sleep':
        return ['#1A1D29', '#2A2D3E'];
      case 'stress':
      case 'anxiety':
        return ['#8B9F82', '#A8B89F'];
      case 'focus':
        return ['#7B8FA1', '#9AABB8'];
      case 'gratitude':
      case 'loving-kindness':
        return ['#C4A77D', '#D4BFA0'];
      default:
        return ['#8B9F82', '#A8B89F'];
    }
  };

  // Error state - meditation not found
  if (!loading && !meditation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={['#8B9F82', '#A8B89F', '#D4D9D2']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={64} color="white" />
            <Text style={styles.errorText}>Meditation not found</Text>
            <TouchableOpacity style={styles.backButtonLarge} onPress={handleGoBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  const instructorName = meditation?.instructor || 'Guide';

  return (
    <MediaPlayer
      category={meditation?.themes?.[0] || 'meditation'}
      title={meditation?.title || 'Loading...'}
      instructor={instructorName}
      description={meditation?.description || ''}
      durationMinutes={meditation?.duration_minutes || 0}
      difficultyLevel={meditation?.difficulty_level}
      gradientColors={getGradientColors()}
      artworkIcon="leaf"
      artworkThumbnailUrl={meditation?.thumbnailUrl}
      isFavorited={isFavorited}
      isLoading={loading}
      audioPlayer={audioPlayer}
      onBack={handleGoBack}
      onToggleFavorite={onToggleFavorite}
      onPlayPause={onPlayPause}
      loadingText="Loading meditation..."
      contentId={id as string}
      contentType="guided_meditation"
      audioUrl={audioUrl}
      audioPath={meditation?.audioPath}
      userRating={userRating}
      onRate={onRate}
      onReport={onReport}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.primary,
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  errorText: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 18,
    color: 'white',
    marginTop: 16,
  },
  backButtonLarge: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.borderRadius.lg,
  },
  backButtonText: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 16,
    color: 'white',
  },
});

export default function MeditationPlayer() {
  return (
    <ProtectedRoute>
      <MeditationPlayerScreen />
    </ProtectedRoute>
  );
}
