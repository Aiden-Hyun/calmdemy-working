import React, { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { MediaPlayer } from '../../src/components/MediaPlayer';
import { useAudioPlayer } from '../../src/hooks/useAudioPlayer';
import { useTheme } from '../../src/contexts/ThemeContext';
import { DownloadedContent, getDownloadedContent } from '../../src/services/downloadService';

function OfflinePlayerScreen() {
  const { contentId, index } = useLocalSearchParams<{ contentId: string; index: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  
  const [downloads, setDownloads] = useState<DownloadedContent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(parseInt(index || '0', 10));
  const [loading, setLoading] = useState(true);
  
  const audioPlayer = useAudioPlayer();

  // Load all downloads
  useEffect(() => {
    async function loadDownloads() {
      const content = await getDownloadedContent();
      const sorted = content.sort((a, b) => b.downloadedAt - a.downloadedAt);
      setDownloads(sorted);
      
      // Find index of the selected content
      const idx = sorted.findIndex(d => d.contentId === contentId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
    }
    loadDownloads();
  }, [contentId, index]);

  // Current item
  const currentItem = downloads[currentIndex];

  // Load audio when current item changes
  useEffect(() => {
    async function loadAudio() {
      if (!currentItem?.localPath) return;

      setLoading(true);
      try {
        await audioPlayer.loadAudio(currentItem.localPath);
        setLoading(false);
      } catch (error) {
        console.warn('Error loading offline audio:', error);
        setLoading(false);
      }
    }
    loadAudio();
  }, [currentItem?.localPath, currentItem?.contentId]);

  // Navigation
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < downloads.length - 1;

  const handlePrevious = () => {
    if (!hasPrevious) return;
    audioPlayer.cleanup();
    setCurrentIndex(currentIndex - 1);
  };

  const handleNext = () => {
    if (!hasNext) return;
    audioPlayer.cleanup();
    setCurrentIndex(currentIndex + 1);
  };

  const handleBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  // Favorites are disabled in offline mode to avoid Firebase errors
  const handleToggleFavorite = () => {
    // No-op in offline mode
  };

  const handlePlayPause = () => {
    if (audioPlayer.isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();
    }
  };

  // Get icon based on content type
  const getContentIcon = (contentType: string): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap => {
    switch (contentType) {
      case 'course_session': return 'school';
      case 'series_chapter': return 'book';
      case 'album_track': return 'musical-notes';
      case 'meditation': return 'leaf';
      case 'bedtime_story': return 'moon';
      case 'emergency': return 'flash';
      case 'sleep_meditation': return 'moon';
      case 'technique_meditation': return 'leaf';
      default: return 'play-circle';
    }
  };

  // Get gradient colors based on content type
  const getGradientColors = (contentType: string): [string, string] => {
    switch (contentType) {
      case 'course_session': return ['#7DAFB4', '#5A8A8F'];
      case 'series_chapter': return ['#1A1A2E', '#16213E'];
      case 'album_track': return ['#2D3436', '#1A1A2E'];
      case 'meditation': return [theme.colors.primary, theme.colors.secondary];
      case 'bedtime_story': return ['#1A1A2E', '#16213E'];
      case 'emergency': return ['#FF6B6B', '#EE5A5A'];
      case 'sleep_meditation': return ['#1A1A2E', '#16213E'];
      case 'technique_meditation': return [theme.colors.primary, theme.colors.secondary];
      default: return [theme.colors.primary, theme.colors.secondary];
    }
  };

  if (!currentItem) {
    return null;
  }

  return (
    <MediaPlayer
      category={currentItem.parentTitle || 'Downloaded'}
      title={currentItem.title}
      durationMinutes={currentItem.duration_minutes}
      gradientColors={getGradientColors(currentItem.contentType)}
      artworkIcon={getContentIcon(currentItem.contentType)}
      artworkThumbnailUrl={currentItem.thumbnailUrl}
      isFavorited={false}
      isLoading={loading}
      audioPlayer={audioPlayer}
      onBack={handleBack}
      onToggleFavorite={handleToggleFavorite}
      onPlayPause={handlePlayPause}
      loadingText="Loading audio..."
      onPrevious={hasPrevious ? handlePrevious : undefined}
      onNext={hasNext ? handleNext : undefined}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      enableBackgroundAudio={false}
    />
  );
}

export default function OfflinePlayer() {
  return (
    <ProtectedRoute>
      <OfflinePlayerScreen />
    </ProtectedRoute>
  );
}
