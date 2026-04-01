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
import { markContentCompleted, createSession } from '../../../src/services/firestoreService';
import { getLocalAudioPath } from '../../../src/services/downloadService';
import { buildSessionMetaInfo } from '../../../src/utils/courseCodeParser';
import { Theme } from '../../../src/theme';
import { useSubscription } from '../../../src/contexts/SubscriptionContext';
import { PaywallModal } from '../../../src/components/PaywallModal';

interface SessionItem {
  id: string;
  code?: string;
  audioPath: string;
  title: string;
  duration_minutes: number;
  dayNumber: number;
  description?: string;
  isFree?: boolean;
}

function CourseSessionPlayerScreen() {
  const { id, audioPath, title, courseTitle, courseCode, sessionCode, duration, instructor, color, thumbnailUrl, sessionsJson, currentIndex, autoPlay } = useLocalSearchParams<{
    id: string;
    audioPath: string;
    title: string;
    courseTitle: string;
    courseCode?: string;
    sessionCode?: string;
    duration: string;
    instructor: string;
    color: string;
    thumbnailUrl?: string;
    sessionsJson?: string;
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
  const hasTrackedSession = useRef(false);

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
    contentType: "course_session",
    audioPlayer,
    title,
    durationMinutes,
    thumbnailUrl,
  });

  // Parse sessions for prev/next navigation
  const sessions: SessionItem[] = useMemo(() => {
    if (!sessionsJson) return [];
    try {
      return JSON.parse(sessionsJson);
    } catch {
      return [];
    }
  }, [sessionsJson]);

  const currentIdx = parseInt(currentIndex || '0', 10);
  const hasPrevious = sessions.length > 0 && currentIdx > 0;
  const hasNext = sessions.length > 0 && currentIdx < sessions.length - 1;

  // Reset session tracking when content changes
  useEffect(() => {
    hasTrackedSession.current = false;
  }, [id]);

  useEffect(() => {
    async function loadSessionAudio() {
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
    
    loadSessionAudio();
  }, [audioPath]);

  // Auto-start playback when coming from auto-play navigation
  useEffect(() => {
    if (autoPlay === 'true' && !loading && audioPlayer.duration > 0 && !audioPlayer.isPlaying) {
      audioPlayer.play();
    }
  }, [autoPlay, loading, audioPlayer.duration]);

  // Track session completion (mark as completed at 80%)
  useEffect(() => {
    async function trackSessionCompletion() {
      if (
        !hasTrackedSession.current &&
        user &&
        id &&
        audioPlayer.progress >= 0.8 &&
        audioPlayer.duration > 0
      ) {
        hasTrackedSession.current = true;
        try {
          await markContentCompleted(user.uid, id, 'course_session');
        } catch (error) {
          console.error('Failed to mark session completed:', error);
        }
      }
    }
    trackSessionCompletion();
  }, [audioPlayer.progress, user, id]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  const handlePrevious = () => {
    if (!hasPrevious) return;
    const prevSession = sessions[currentIdx - 1];
    
    // Check if previous session is locked
    if (!prevSession.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/course/session/[id]',
      params: {
        id: prevSession.id,
        audioPath: prevSession.audioPath,
        title: prevSession.title,
        courseTitle,
        courseCode: courseCode || '',
        sessionCode: prevSession.code || '',
        duration: String(prevSession.duration_minutes),
        instructor,
        color,
        thumbnailUrl: thumbnailUrl || '',
        sessionsJson,
        currentIndex: String(currentIdx - 1),
      },
    });
  };

  const handleNext = () => {
    if (!hasNext) return;
    const nextSession = sessions[currentIdx + 1];
    
    // Check if next session is locked
    if (!nextSession.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    audioPlayer.cleanup();
    router.replace({
      pathname: '/course/session/[id]',
      params: {
        id: nextSession.id,
        audioPath: nextSession.audioPath,
        title: nextSession.title,
        courseTitle,
        courseCode: courseCode || '',
        sessionCode: nextSession.code || '',
        duration: String(nextSession.duration_minutes),
        instructor,
        color,
        thumbnailUrl: thumbnailUrl || '',
        sessionsJson,
        currentIndex: String(currentIdx + 1),
        autoPlay: 'true',
      },
    });
  };

  // Use course color for gradient, fallback to teal
  const courseColor = color || '#7DAFB4';
  const gradientColors: [string, string] = [courseColor, `${courseColor}CC`];

  // Build meta info from course and session codes
  const metaInfo = sessionCode && courseCode 
    ? buildSessionMetaInfo(sessionCode, courseCode) 
    : undefined;

  return (
    <>
      <MediaPlayer
        category={courseTitle || 'Course'}
        title={title || 'Loading...'}
        instructor={instructor}
        metaInfo={metaInfo}
        durationMinutes={durationMinutes}
        gradientColors={gradientColors}
        artworkIcon="school"
        artworkThumbnailUrl={thumbnailUrl}
        isFavorited={isFavorited}
        isLoading={loading}
        audioPlayer={audioPlayer}
        onBack={handleGoBack}
        onToggleFavorite={onToggleFavorite}
        onPlayPause={onPlayPause}
        loadingText="Loading session..."
        onPrevious={hasPrevious ? handlePrevious : undefined}
        onNext={hasNext ? handleNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        contentId={id}
        contentType="course_session"
        audioUrl={currentAudioUrl}
        audioPath={audioPath}
        parentTitle={courseTitle}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // No additional styles needed - MediaPlayer handles everything
  });

export default function CourseSessionPlayer() {
  return (
    <ProtectedRoute>
      <CourseSessionPlayerScreen />
    </ProtectedRoute>
  );
}
