import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import { useSubscription } from '../../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../../src/components/PaywallModal';

interface TrackItem {
  id: string;
  audioPath: string;
  title: string;
  duration_minutes: number;
  trackNumber: number;
  isFree?: boolean;
}

function AlbumTrackPlayerScreen() {
  const { id, audioPath, title, albumTitle, duration, artist, thumbnailUrl, tracksJson, currentIndex, autoPlay } = useLocalSearchParams<{
    id: string;
    audioPath: string;
    title: string;
    albumTitle: string;
    duration: string;
    artist: string;
    thumbnailUrl?: string;
    tracksJson?: string;
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
    contentType: "album_track",
    audioPlayer,
    title: `${albumTitle}: ${title}`,
    durationMinutes,
    thumbnailUrl,
  });

  // Parse tracks for prev/next navigation
  const tracks: TrackItem[] = useMemo(() => {
    if (!tracksJson) return [];
    try {
      return JSON.parse(tracksJson);
    } catch {
      return [];
    }
  }, [tracksJson]);

  const currentIdx = parseInt(currentIndex || '0', 10);
  const hasPrevious = tracks.length > 0 && currentIdx > 0;
  const hasNext = tracks.length > 0 && currentIdx < tracks.length - 1;

  // Reset completion tracking when content changes
  useEffect(() => {
    hasTrackedCompletion.current = false;
  }, [id]);

  useEffect(() => {
    async function loadTrackAudio() {
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
    
    loadTrackAudio();
  }, [audioPath]);

  // Auto-start playback when coming from auto-play navigation
  useEffect(() => {
    if (autoPlay === 'true' && !loading && audioPlayer.duration > 0 && !audioPlayer.isPlaying) {
      audioPlayer.play();
    }
  }, [autoPlay, loading, audioPlayer.duration]);

  // Track track completion at 80%
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
          await markContentCompleted(user.uid, id, 'album_track');
        } catch (error) {
          console.error('Failed to mark track completed:', error);
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
    const prevTrack = tracks[currentIdx - 1];
    
    // Check if previous track is locked
    if (!prevTrack.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/album/track/[id]',
      params: {
        id: prevTrack.id,
        audioPath: prevTrack.audioPath,
        title: prevTrack.title,
        albumTitle,
        duration: String(prevTrack.duration_minutes),
        artist,
        thumbnailUrl: thumbnailUrl || '',
        tracksJson,
        currentIndex: String(currentIdx - 1),
      },
    });
  };

  const handleNext = () => {
    if (!hasNext) return;
    const nextTrack = tracks[currentIdx + 1];
    
    // Check if next track is locked
    if (!nextTrack.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/album/track/[id]',
      params: {
        id: nextTrack.id,
        audioPath: nextTrack.audioPath,
        title: nextTrack.title,
        albumTitle,
        duration: String(nextTrack.duration_minutes),
        artist,
        thumbnailUrl: thumbnailUrl || '',
        tracksJson,
        currentIndex: String(currentIdx + 1),
        autoPlay: 'true',
      },
    });
  };

  return (
    <>
      <MediaPlayer
        category={albumTitle || 'Album'}
        title={title || 'Loading...'}
        instructor={artist}
        durationMinutes={durationMinutes}
        gradientColors={theme.gradients.sleepyNight as [string, string]}
        artworkIcon="musical-notes"
        artworkThumbnailUrl={thumbnailUrl}
        isFavorited={isFavorited}
        isLoading={loading}
        audioPlayer={audioPlayer}
        onBack={handleGoBack}
        onToggleFavorite={onToggleFavorite}
        onPlayPause={onPlayPause}
        loadingText="Loading track..."
        onPrevious={hasPrevious ? handlePrevious : undefined}
        onNext={hasNext ? handleNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        contentId={id}
        contentType="album_track"
        audioUrl={currentAudioUrl}
        audioPath={audioPath}
        parentTitle={albumTitle}
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

export default function AlbumTrackPlayer() {
  return (
    <ProtectedRoute>
      <AlbumTrackPlayerScreen />
    </ProtectedRoute>
  );
}
