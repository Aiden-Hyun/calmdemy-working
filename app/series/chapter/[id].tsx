import React, { useEffect, useMemo, useState, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ProtectedRoute } from '../../../src/components/ProtectedRoute';
import { MediaPlayer } from '../../../src/components/MediaPlayer';
import { useAudioPlayer } from '../../../src/hooks/useAudioPlayer';
import { usePlayerBehavior } from '../../../src/hooks/usePlayerBehavior';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { useAuth } from '../../../src/contexts/AuthContext';
import { getAudioUrlFromPath } from '../../../src/constants/audioFiles';
import { markContentCompleted } from '../../../src/services/firestoreService';
import { getLocalAudioPath } from '../../../src/services/downloadService';
import { Theme } from '../../../src/theme';
import { useSubscription } from '../../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../../src/components/PaywallModal';

interface ChapterItem {
  id: string;
  audioPath: string;
  title: string;
  duration_minutes: number;
  chapterNumber: number;
  description?: string;
  isFree?: boolean;
}

function SeriesChapterPlayerScreen() {
  const { id, audioPath, title, seriesTitle, duration, narrator, thumbnailUrl, chaptersJson, currentIndex, autoPlay } = useLocalSearchParams<{
    id: string;
    audioPath: string;
    title: string;
    seriesTitle: string;
    duration: string;
    narrator: string;
    thumbnailUrl?: string;
    chaptersJson?: string;
    currentIndex?: string;
    autoPlay?: string;
  }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { isPremium: hasSubscription } = useSubscription();
  
  const [loading, setLoading] = useState(true);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>();
  const [showPaywall, setShowPaywall] = useState(false);
  const hasTrackedCompletion = useRef(false);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const audioPlayer = useAudioPlayer();
  const durationMinutes = parseInt(duration) || 0;

  // Use the shared player behavior hook
  const {
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  } = usePlayerBehavior({
    contentId: id,
    contentType: "series_chapter",
    audioPlayer,
    title: `${seriesTitle}: ${title}`,
    durationMinutes,
    thumbnailUrl,
  });

  // Parse chapters for prev/next navigation
  const chapters: ChapterItem[] = useMemo(() => {
    if (!chaptersJson) return [];
    try {
      return JSON.parse(chaptersJson);
    } catch {
      return [];
    }
  }, [chaptersJson]);

  const currentIdx = parseInt(currentIndex || '0', 10);
  const hasPrevious = chapters.length > 0 && currentIdx > 0;
  const hasNext = chapters.length > 0 && currentIdx < chapters.length - 1;

  // Reset completion tracking when content changes
  useEffect(() => {
    hasTrackedCompletion.current = false;
  }, [id]);

  useEffect(() => {
    async function loadChapterAudio() {
      if (!audioPath) {
        setLoading(false);
        return;
      }
      
      try {
        // Try to use downloaded audio first, fall back to streaming
        const localPath = await getLocalAudioPath(id);
        if (localPath) {
          setCurrentAudioUrl(localPath);
          audioPlayer.loadAudio(localPath);
        } else {
          const audioUrl = await getAudioUrlFromPath(audioPath);
          if (audioUrl) {
            setCurrentAudioUrl(audioUrl);
            audioPlayer.loadAudio(audioUrl);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadChapterAudio();
  }, [audioPath]);

  // Auto-start playback when coming from auto-play navigation
  useEffect(() => {
    if (autoPlay === 'true' && !loading && audioPlayer.duration > 0 && !audioPlayer.isPlaying) {
      audioPlayer.play();
    }
  }, [autoPlay, loading, audioPlayer.duration]);

  // Track chapter completion at 80%
  useEffect(() => {
    async function trackCompletion() {
      if (
        !hasTrackedCompletion.current &&
        user &&
        id &&
        audioPlayer.progress >= 0.8 &&
        audioPlayer.duration > 0
      ) {
        hasTrackedCompletion.current = true;
        try {
          await markContentCompleted(user.uid, id, 'series_chapter');
        } catch (error) {
          console.error('Failed to mark chapter completed:', error);
        }
      }
    }
    trackCompletion();
  }, [audioPlayer.progress, user, id]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  const handlePrevious = () => {
    if (!hasPrevious) return;
    const prevChapter = chapters[currentIdx - 1];
    
    // Check if previous chapter is locked
    if (!prevChapter.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/series/chapter/[id]',
      params: {
        id: prevChapter.id,
        audioPath: prevChapter.audioPath,
        title: prevChapter.title,
        seriesTitle,
        duration: String(prevChapter.duration_minutes),
        narrator,
        thumbnailUrl: thumbnailUrl || '',
        chaptersJson,
        currentIndex: String(currentIdx - 1),
      },
    });
  };

  const handleNext = () => {
    if (!hasNext) return;
    const nextChapter = chapters[currentIdx + 1];
    
    // Check if next chapter is locked
    if (!nextChapter.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/series/chapter/[id]',
      params: {
        id: nextChapter.id,
        audioPath: nextChapter.audioPath,
        title: nextChapter.title,
        seriesTitle,
        duration: String(nextChapter.duration_minutes),
        narrator,
        thumbnailUrl: thumbnailUrl || '',
        chaptersJson,
        currentIndex: String(currentIdx + 1),
        autoPlay: 'true',
      },
    });
  };

  return (
    <>
      <MediaPlayer
        category={seriesTitle || 'Series'}
        title={title || 'Loading...'}
        instructor={narrator}
        durationMinutes={durationMinutes}
        gradientColors={theme.gradients.sleepyNight as [string, string]}
        artworkIcon="book"
        artworkThumbnailUrl={thumbnailUrl}
        isFavorited={isFavorited}
        isLoading={loading}
        audioPlayer={audioPlayer}
        onBack={handleGoBack}
        onToggleFavorite={onToggleFavorite}
        onPlayPause={onPlayPause}
        loadingText="Loading chapter..."
        onPrevious={hasPrevious ? handlePrevious : undefined}
        onNext={hasNext ? handleNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        contentId={id}
        contentType="series_chapter"
        audioUrl={currentAudioUrl}
        audioPath={audioPath}
        parentTitle={seriesTitle}
        skipRestore={autoPlay === 'true'}
        userRating={userRating}
        onRate={onRate}
        onReport={onReport}
      />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
    // No additional styles needed - MediaPlayer handles everything
  });

export default function SeriesChapterPlayer() {
  return (
    <ProtectedRoute>
      <SeriesChapterPlayerScreen />
    </ProtectedRoute>
  );
}
