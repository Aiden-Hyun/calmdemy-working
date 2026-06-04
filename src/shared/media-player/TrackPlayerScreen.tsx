import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioControls } from './AudioControls';
import { BackgroundAudioPicker } from './BackgroundAudioPicker';
import { SleepTimerPicker } from './SleepTimerPicker';
import { ReportModal } from '../modals/ReportModal';
import { RatingType, ReportCategory } from '../../types';
import { useTheme } from '../../core/theme/ThemeContext';
import { usePlaybackTimer, formatTimerDisplay } from './PlaybackTimerContext';
import { Theme } from '../../core/theme';
import { useAudioPlayer } from '../../core/audio/useAudioPlayer';
import { savePlaybackProgress, getPlaybackProgress, clearPlaybackProgress } from '../../services/firestoreService';
import { useAuth } from '../../core/auth/AuthContext';
import { useNetwork } from '../../core/network/NetworkContext';
import { useAutoPlay } from './hooks/useAutoPlay';
import { useBackgroundSoundController } from './hooks/useBackgroundSoundController';
import { useNarratorPhoto } from './hooks/useNarratorPhoto';
import { useTrackDownload } from './hooks/useTrackDownload';

/**
 * ============================================================
 * TrackPlayerScreen.tsx — Full-Featured Audio Player Screen
 * ============================================================
 *
 * Architectural Role:
 *   A comprehensive media player screen that orchestrates audio playback,
 *   background sound selection, sleep timer scheduling, and progress tracking.
 *   This is a complex Compound Component and State Machine:
 *   - Compound Component: Composes AudioControls, BackgroundAudioPicker, SleepTimerPicker,
 *     and ReportModal as child modals controlled by parent state.
 *   - State Machine: Manages multiple independent concerns (playback, background audio,
 *     sleep timer, downloads, progress tracking), each with their own state and lifecycle.
 *   - Facade Pattern: Abstracts the complexity of audio player setup (managing useAudioPlayer,
 *     useBackgroundAudio hooks, Firestore progress saves, download management).
 *
 * Design Patterns:
 *   - Repository Pattern: All Firestore operations (progress tracking, saving/loading)
 *     are abstracted behind firestoreService functions. The component never directly
 *     queries Firestore; it calls service functions.
 *   - Observer Pattern: Multiple listeners in useEffect hooks:
 *     1. Audio player state (isPlaying, progress, duration)
 *     2. Background audio state (isEnabled, selectedSoundId)
 *     3. Sleep timer state (isActive, isFadingOut)
 *     4. Window dimensions (for responsive sizing)
 *   - Auto-Play State Machine: Tracks whether auto-play was already triggered
 *     (hasTriggeredAutoPlay ref) to prevent double-firing when progress updates.
 *   - Playback Progress Tracking: Uses debouncing (saves every 10 seconds or on pause)
 *     and cleanup (clears progress on completion) for efficient Firestore operations.
 *   - Responsive Design: Adjusts artwork size, font sizes, and padding based on
 *     screen width breakpoints (small, medium, large).
 *
 * Key Dependencies:
 *   - useAudioPlayer() hook: Audio playback state and controls (from underlying audio engine)
 *   - useBackgroundAudio() hook: Background sleep sound management
 *   - usePlaybackTimer() hook: Sleep timer state and fade-out scheduling
 *   - useAuth() hook: Current user ID for progress tracking
 *   - useNetwork() hook: Offline detection (disables download feature)
 *   - FirestoreService: Progress saving/loading, narrator/sound metadata fetching
 *   - DownloadService: Download status checks and audio downloads
 *
 * Consumed By:
 *   Any screen that wants to play audio (meditations, courses, sleep stories, etc.)
 *
 * Note on Lifecycle Management:
 *   The component manages multiple async operations (fetching narrator photo, loading
 *   saved sounds, restoring playback position) using refs to track completion (hasRestoredPosition,
 *   lastSaveTime). This prevents duplicate operations and race conditions when content
 *   ID changes during playback (e.g., skipping to next track).
 * ============================================================
 */

/**
 * Props interface for the TrackPlayerScreen component.
 * This is a large prop interface because the component is a Facade that abstracts
 * many concerns (audio playback, background audio, downloads, progress tracking, etc.).
 * Props are organized into logical groups below.
 */
export interface TrackPlayerScreenProps {
  // --- Content Metadata ---
  category: string;
  title: string;
  instructor?: string;
  instructorPhotoUrl?: string;
  description?: string;
  metaInfo?: string; // e.g., "CBT 101 · Module 1 Practice"
  durationMinutes: number;
  difficultyLevel?: string;

  // --- Visual Styling ---
  gradientColors: [string, string];
  artworkIcon: keyof typeof Ionicons.glyphMap;
  artworkThumbnailUrl?: string;

  // --- UI State (from parent) ---
  isFavorited: boolean;
  isLoading: boolean;

  // --- Audio Player State (delegated to useAudioPlayer hook) ---
  audioPlayer: ReturnType<typeof useAudioPlayer>;

  // --- Essential Callbacks ---
  onBack: () => void;
  onToggleFavorite: () => void;
  onPlayPause: () => void;

  // --- Optional UI Customization ---
  loadingText?: string;
  footerContent?: React.ReactNode;

  // --- Feature Toggles ---
  enableBackgroundAudio?: boolean; // default: true (meditations have sleep sounds)

  // --- Navigation: Previous/Next Tracks (for playlists/courses/series) ---
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;

  // --- Content Identification (for progress tracking and downloads) ---
  contentId?: string;
  contentType?: string;

  // --- Download Support ---
  audioUrl?: string; // URL to download audio from
  parentId?: string; // For organizing downloads (e.g., course ID)
  parentTitle?: string;
  audioPath?: string;

  // --- Auto-Play Control ---
  skipRestore?: boolean; // Skip restoring saved position (when autoplay triggers next track)

  // --- User Engagement (Rating and Reporting) ---
  userRating?: RatingType | null;
  onRate?: (rating: RatingType) => Promise<RatingType | null>;
  onReport?: (category: ReportCategory, description?: string) => Promise<boolean>;
}

/**
 * TrackPlayerScreen — Full-featured audio player screen.
 *
 * This component is the main entry point for playing audio content (meditations, courses, sleep stories).
 * It orchestrates multiple sub-systems:
 *   1. Audio playback (via useAudioPlayer hook, delegated to parent)
 *   2. Background sleep sounds (via useBackgroundAudio hook)
 *   3. Sleep timer (via usePlaybackTimer hook, with fade-out support)
 *   4. Playback progress tracking (Firestore, auto-save on pause and periodically)
 *   5. Downloads (offline availability, via downloadService)
 *   6. Child modals (background audio picker, sleep timer, report form)
 *   7. Responsive sizing (adapts artwork and fonts to screen width)
 *
 * The component manages a large state tree covering independent concerns.
 * See TrackPlayerScreenProps documentation above for prop organization.
 */
export function TrackPlayerScreen({
  category,
  title,
  instructor,
  instructorPhotoUrl,
  description,
  metaInfo,
  durationMinutes,
  difficultyLevel,
  gradientColors,
  artworkIcon,
  artworkThumbnailUrl,
  isFavorited,
  isLoading,
  audioPlayer,
  onBack,
  onToggleFavorite,
  onPlayPause,
  loadingText = 'Loading...',
  footerContent,
  enableBackgroundAudio = true,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  contentId,
  contentType,
  audioUrl,
  parentId,
  parentTitle,
  audioPath,
  skipRestore = false,
  userRating,
  onRate,
  onReport,
}: TrackPlayerScreenProps) {
  // --- Theme and Layout Setup ---
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { width: screenWidth } = useWindowDimensions();

  // --- Responsive Design: Breakpoints and Derived Values ---
  // Adjust UI dimensions based on screen width for better experience on small devices
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;

  // Responsive values: smaller on small screens, larger on iPad-sized screens
  const artworkSize = isSmallScreen ? 100 : isMediumScreen ? 120 : 140;
  const titleFontSize = isSmallScreen ? 22 : isMediumScreen ? 25 : 28;
  const artworkIconSize = isSmallScreen ? 48 : isMediumScreen ? 56 : 64;
  const contentPadding = isSmallScreen ? 12 : isMediumScreen ? 16 : 24;
  const sectionMargin = isSmallScreen ? 12 : isMediumScreen ? 16 : 24;

  // Theme-aware styles (memoized to prevent recreating on every render)
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- Modal State (Child Modal Visibility Flags) ---
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showSleepTimerPicker, setShowSleepTimerPicker] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // --- Narrator Photo ---
  // Resolves the instructor's photo URL (fetched from Firestore if not provided).
  const narratorPhotoUrl = useNarratorPhoto(instructor, instructorPhotoUrl);

  // --- Auto-Play Feature ---
  // Preference + next-track-on-completion observer (orchestration hook).
  const { autoPlayEnabled, toggleAutoPlay } = useAutoPlay({
    trackKey: title,
    hasNext,
    onNext,
    audioPlayer,
  });

  // --- Download Feature (offline state + handler) ---
  // localThumbnail is the resolved local cached thumbnail, preferred over the
  // remote artworkThumbnailUrl when available so artwork displays offline.
  const {
    isDownloaded: isDownloadedState,
    isDownloading: isDownloadingState,
    downloadProgress,
    localThumbnail,
    handleDownload,
  } = useTrackDownload({
    contentId,
    contentType,
    audioUrl,
    title,
    durationMinutes,
    thumbnailUrl: artworkThumbnailUrl,
    parentId,
    parentTitle,
    audioPath,
  });

  // --- Sleep Timer Integration ---
  // Delegates sleep timer control to SleepTimerContext (manages its own state there)
  const sleepTimer = usePlaybackTimer();
  // Guard so the fade-out completion handler pauses exactly once per fade.
  const hasFadePausedRef = useRef(false);

  // --- Playback Progress Tracking State ---
  // Refs (not state) because these are implementation details that don't trigger re-renders
  const lastSaveTime = useRef(0); // Timestamp of last Firestore save (for debouncing)
  const hasRestoredPosition = useRef(false); // Flag to prevent restoring position multiple times

  // --- Background Sound Controller ---
  // Owns the independent ambient-sound engine, the selectable sound list, the
  // selected sound's metadata, and the load/auto-play/cleanup effects + the
  // selection handler. Also localizes the player's one feature dependency
  // (useSleepSounds, via features/music's public API).
  const {
    backgroundAudio,
    currentBackgroundSound,
    ambientSounds,
    ambientSoundsLoading,
    handleSelectSound,
  } = useBackgroundSoundController({ enableBackgroundAudio, audioPlayer });

  /**
   * --- LIFECYCLE EFFECT 8a: Apply the sleep timer's published fade volume ---
   * The timer no longer reaches into the player; instead it publishes
   * `fadeVolume` (1 normally, ramping 1 -> 0 during fade-out). This screen
   * owns the audio, so it mirrors that multiplier onto the main player and
   * restores full volume whenever a fade isn't in progress. (Inversion of
   * Control: the player reads the context; the context knows nothing of it.)
   */
  useEffect(() => {
    if (audioPlayer.player) {
      audioPlayer.player.volume = sleepTimer.isFadingOut ? sleepTimer.fadeVolume : 1;
    }
  }, [sleepTimer.isFadingOut, sleepTimer.fadeVolume, audioPlayer.player]);

  /**
   * --- LIFECYCLE EFFECT 8b: Pause when the fade-out completes ---
   * When the published fade reaches 0, the audio is silent: pause both the
   * main and background players (they stop together), then call cancelTimer()
   * to finalize — which clears the timer and restores fadeVolume to 1 for the
   * next session. The ref guard ensures we pause exactly once per fade.
   */
  useEffect(() => {
    if (sleepTimer.isFadingOut && sleepTimer.fadeVolume === 0 && !hasFadePausedRef.current) {
      hasFadePausedRef.current = true;
      audioPlayer.pause();
      backgroundAudio.pause();
      sleepTimer.cancelTimer();
    } else if (!sleepTimer.isFadingOut) {
      hasFadePausedRef.current = false;
    }
  }, [sleepTimer.isFadingOut, sleepTimer.fadeVolume]);

  /**
   * --- LIFECYCLE EFFECT 11: Restore Playback Position on Mount ---
   * When content loads, fetch the saved playback position from Firestore
   * and seek to it. This allows users to resume where they left off.
   *
   * Guards against duplicate restoration (hasRestoredPosition ref)
   * and autoplay-triggered navigation (skipRestore prop).
   * Also waits for audio to load (audioPlayer.duration > 0) before seeking.
   *
   * Only restores if position > 5 seconds (don't restore for nearly-finished content).
   */
  useEffect(() => {
    async function restorePosition() {
      if (!user?.uid || !contentId || hasRestoredPosition.current) return;

      // Skip restoring if this is an autoplay navigation (user is skipping to next track)
      if (skipRestore) {
        hasRestoredPosition.current = true;
        return;
      }

      const progress = await getPlaybackProgress(user.uid, contentId);
      if (progress && progress.position_seconds > 5) {
        // Wait for audio to be ready before seeking (Polling pattern)
        const checkAndSeek = () => {
          if (audioPlayer.duration > 0) {
            // Audio is ready, seek to saved position
            audioPlayer.seekTo(progress.position_seconds);
            hasRestoredPosition.current = true;
          } else {
            // Retry after a short delay if audio not ready (retry pattern)
            setTimeout(checkAndSeek, 100);
          }
        };
        checkAndSeek();
      } else {
        hasRestoredPosition.current = true;
      }
    }
    restorePosition();
  }, [user?.uid, contentId, audioPlayer.duration, skipRestore]);

  /**
   * --- LIFECYCLE EFFECT 12: Reset Progress Tracking Refs ---
   * When content changes (contentId changes), reset the progress tracking flags.
   * This ensures the next content starts fresh (no position restoration bug, no stale saves).
   */
  useEffect(() => {
    hasRestoredPosition.current = false;
    lastSaveTime.current = 0;
  }, [contentId]);

  /**
   * --- LIFECYCLE EFFECT 13: Save Playback Progress (Debounced) ---
   * Periodically saves the current playback position to Firestore so the user
   * can resume later. This implements a debouncing strategy to avoid excessive
   * Firestore writes:
   *   - Save on pause: Immediately capture the user's pause point
   *   - Save every 10 seconds: During playback, save at most every 10 seconds
   *
   * Only saves if position > 5 seconds (skip brief positions).
   * Uses lastSaveTime ref to track when the last save occurred.
   */
  useEffect(() => {
    if (!user?.uid || !contentId || !contentType) return;
    if (audioPlayer.position < 5 || audioPlayer.duration === 0) return;

    const now = Date.now();
    const shouldSave =
      (!audioPlayer.isPlaying && audioPlayer.position > 5) || // Save on pause
      (now - lastSaveTime.current >= 10000); // Save every 10 seconds

    if (shouldSave) {
      lastSaveTime.current = now;
      savePlaybackProgress(
        user.uid,
        contentId,
        contentType,
        audioPlayer.position,
        audioPlayer.duration
      );
    }
  }, [user?.uid, contentId, contentType, audioPlayer.position, audioPlayer.isPlaying, audioPlayer.duration]);

  /**
   * --- LIFECYCLE EFFECT 14: Clear Progress on Completion ---
   * When the user completes audio (progress >= 95%), delete the saved
   * progress from Firestore. This prevents the app from trying to resume
   * at the end of completed content on next playback.
   */
  useEffect(() => {
    if (!user?.uid || !contentId) return;
    if (audioPlayer.progress >= 0.95 && audioPlayer.duration > 0) {
      clearPlaybackProgress(user.uid, contentId);
    }
  }, [user?.uid, contentId, audioPlayer.progress, audioPlayer.duration]);

  /**
   * --- LIFECYCLE EFFECT 15: Save Position on Unmount (Cleanup) ---
   * When the component unmounts (user navigates away), save the current position.
   * This ensures that even if the user doesn't pause, we capture their progress.
   * Only saves if position > 5 seconds (skip brief positions).
   */
  useEffect(() => {
    return () => {
      if (user?.uid && contentId && contentType && audioPlayer.position > 5 && audioPlayer.duration > 0) {
        savePlaybackProgress(
          user.uid,
          contentId,
          contentType,
          audioPlayer.position,
          audioPlayer.duration
        );
      }
    };
  }, [user?.uid, contentId, contentType, audioPlayer.position, audioPlayer.duration]);

  /**
   * --- Render Phase: Loading State ---
   * If the content is still loading (parent is fetching metadata from Firestore),
   * show a full-screen loading spinner instead of the player.
   */

  // Use dark gradient in dark mode (dark theme override)
  const darkGradient: [string, string] = ['#1A1D29', '#2A2D3E'];
  const effectiveGradient = isDark ? darkGradient : gradientColors;

  if (isLoading) {
    return (
      <LinearGradient colors={effectiveGradient} style={styles.fullScreen}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>{loadingText}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  /**
   * --- Render Phase: Main Player Screen ---
   * Displays the full media player with artwork, audio controls, and navigation.
   * Organized into distinct render phases for clarity.
   */
  return (
    <LinearGradient
      colors={effectiveGradient}
      style={styles.fullScreen}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* --- Render Phase 1: Header (Back, Timer, Music, Favorite, Report buttons) --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerRight}>
            {/* Sleep Timer Button */}
            <TouchableOpacity
              onPress={() => setShowSleepTimerPicker(true)}
              style={[
                styles.headerButton,
                sleepTimer.isActive && styles.headerButtonActive,
              ]}
            >
              <Ionicons
                name="timer-outline"
                size={20}
                color={sleepTimer.isActive ? '#7DAFB4' : 'white'}
              />
            </TouchableOpacity>

            {/* Background Audio Button */}
            {enableBackgroundAudio && (
              <TouchableOpacity
                onPress={() => setShowBackgroundPicker(true)}
                style={[
                  styles.headerButton,
                  backgroundAudio.isEnabled && backgroundAudio.selectedSoundId && styles.headerButtonActive,
                ]}
              >
                <Ionicons
                  name="musical-notes"
                  size={20}
                  color={
                    backgroundAudio.isEnabled && backgroundAudio.selectedSoundId
                      ? '#7DAFB4'
                      : 'white'
                  }
                />
              </TouchableOpacity>
            )}

            {/* Favorite Button */}
            <TouchableOpacity onPress={onToggleFavorite} style={styles.favoriteButton}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorited ? '#FF6B6B' : 'white'}
              />
            </TouchableOpacity>

            {/* Report Button */}
            {onReport && (
              <TouchableOpacity
                onPress={() => setShowReportModal(true)}
                style={styles.headerButton}
              >
                <Ionicons name="flag-outline" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* --- Render Phase 2: Status Indicators (Background Audio & Sleep Timer) --- */}
        {/* Background Audio Indicator — Shows current background sound if playing */}
        {enableBackgroundAudio && backgroundAudio.isEnabled && currentBackgroundSound && audioPlayer.isPlaying && (
          <TouchableOpacity
            style={styles.backgroundIndicator}
            onPress={() => setShowBackgroundPicker(true)}
          >
            <Ionicons name="musical-notes" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.backgroundIndicatorText}>
              {currentBackgroundSound.title}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sleep Timer Indicator — Shows remaining time (or "Fading out...") if sleep timer is active */}
        {sleepTimer.isActive && (
          <TouchableOpacity
            style={styles.sleepTimerIndicator}
            onPress={() => setShowSleepTimerPicker(true)}
          >
            <Ionicons name="timer-outline" size={14} color="#7DAFB4" />
            <Text style={styles.sleepTimerIndicatorText}>
              {sleepTimer.isFadingOut ? 'Fading out...' : formatTimerDisplay(sleepTimer.remainingSeconds)}
            </Text>
          </TouchableOpacity>
        )}

        {/* --- Render Phase 3: Scrollable Content Area (Artwork, Info, Player) --- */}
        {/* ScrollView for smaller screens to prevent layout overflow */}
        <ScrollView 
          style={[styles.content, { paddingHorizontal: contentPadding }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Sub-Phase 3a: Artwork (Thumbnail or Icon) --- */}
          {/* Responsive: uses artworkSize, artworkIconSize from breakpoint calculations */}
          <View style={[styles.iconContainer, { marginTop: sectionMargin, marginBottom: sectionMargin }]}>
            {(localThumbnail || artworkThumbnailUrl) ? (
              // Prefer local cached thumbnail (works offline), fall back to remote URL
              <Image
                source={{ uri: localThumbnail || artworkThumbnailUrl }}
                style={[styles.thumbnailImage, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }]}
              />
            ) : (
              // Fallback to icon circle with Ionicon (for content without image)
              <View style={[styles.iconCircle, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }]}>
                <Ionicons name={artworkIcon} size={artworkIconSize} color="white" />
              </View>
            )}
          </View>

          {/* --- Sub-Phase 3b: Content Information --- */}
          {/* Displays category, title, meta info, description, duration, difficulty, and narrator */}
          <View style={[styles.infoContainer, { marginBottom: sectionMargin }]}>
            <Text style={styles.category}>{category.replace('-', ' ')}</Text>
            <Text style={[styles.title, { fontSize: titleFontSize }]}>{title}</Text>
            {metaInfo && (
              <Text style={styles.metaInfoText}>{metaInfo}</Text>
            )}
            {description && (
              <Text style={styles.description} numberOfLines={2}>
                {description}
              </Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{durationMinutes} min</Text>
              </View>
              {difficultyLevel && (
                <View style={styles.metaItem}>
                  <Ionicons name="fitness-outline" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.metaText}>{difficultyLevel}</Text>
                </View>
              )}
            </View>

            {/* Narrator */}
            {instructor && (
              <View style={styles.narratorSection}>
                {narratorPhotoUrl ? (
                  <Image
                    source={{ uri: narratorPhotoUrl }}
                    style={styles.narratorPhoto}
                  />
                ) : (
                  <View style={styles.narratorPhotoPlaceholder}>
                    <Ionicons name="person" size={16} color="rgba(255,255,255,0.6)" />
                  </View>
                )}
                <Text style={styles.narratorText}>with {instructor}</Text>
              </View>
            )}
          </View>

          {/* --- Sub-Phase 3c: Audio Player & Controls --- */}
          {/* Shows the AudioControls component once audio duration is known, or loading spinner while buffering */}
          <View style={[styles.playerContainer, { marginBottom: sectionMargin }]}>
            {audioPlayer.isLoading && !audioPlayer.duration ? (
              // Audio is still loading (buffering), show spinner
              <View style={styles.loadingPlayer}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingPlayerText}>Loading audio...</Text>
              </View>
            ) : (
              // Audio is ready, show the player with playback controls
              <AudioControls
                isPlaying={audioPlayer.isPlaying}
                isLoading={audioPlayer.isLoading}
                duration={audioPlayer.duration}
                position={audioPlayer.position}
                progress={audioPlayer.progress}
                formattedPosition={audioPlayer.formattedPosition}
                formattedDuration={audioPlayer.formattedDuration}
                onPlay={onPlayPause}
                onPause={onPlayPause}
                onSeek={audioPlayer.seekTo}
                // Playback controls
                playbackRate={audioPlayer.playbackRate}
                isLooping={audioPlayer.isLooping}
                onPlaybackRateChange={audioPlayer.setPlaybackRate}
                onSkipBack={() => audioPlayer.skipBackward(15)}
                onSkipForward={() => audioPlayer.skipForward(15)}
                onToggleLoop={() => audioPlayer.setLoop(!audioPlayer.isLooping)}
              />
            )}

            {/* --- Navigation and Action Controls --- */}
            {/* Shown if this is part of a collection (playlist, course, series) with prev/next support */}
            {(onPrevious || onNext) && (
              <View style={styles.trackNavigationContainer}>
                {/* Row 1: Prev / Next */}
                <View style={styles.trackNavigation}>
                  <TouchableOpacity
                    style={[styles.trackNavButton, !hasPrevious && styles.trackNavButtonDisabled]}
                    onPress={hasPrevious ? onPrevious : undefined}
                    disabled={!hasPrevious}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="play-skip-back"
                      size={16}
                      color={hasPrevious ? 'white' : 'rgba(255,255,255,0.3)'}
                    />
                    <Text style={[styles.trackNavText, !hasPrevious && styles.trackNavTextDisabled]}>
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.trackNavButton, !hasNext && styles.trackNavButtonDisabled]}
                    onPress={hasNext ? onNext : undefined}
                    disabled={!hasNext}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.trackNavText, !hasNext && styles.trackNavTextDisabled]}>
                      Next
                    </Text>
                    <Ionicons
                      name="play-skip-forward"
                      size={16}
                      color={hasNext ? 'white' : 'rgba(255,255,255,0.3)'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Row 2: Actions (Like, Dislike, Autoplay, Download) */}
                <View style={styles.actionControls}>
                  {/* Like Button */}
                  {onRate && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        userRating === 'like' && styles.actionButtonLiked,
                      ]}
                      onPress={() => onRate('like')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={userRating === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
                        size={18}
                        color={userRating === 'like' ? '#4CAF50' : 'rgba(255,255,255,0.7)'}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Dislike Button */}
                  {onRate && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        userRating === 'dislike' && styles.actionButtonDisliked,
                      ]}
                      onPress={() => onRate('dislike')}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={userRating === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                        size={18}
                        color={userRating === 'dislike' ? '#FF6B6B' : 'rgba(255,255,255,0.7)'}
                      />
                    </TouchableOpacity>
                  )}

                  {/* Auto-play Toggle */}
                  <TouchableOpacity
                    style={[styles.actionButton, autoPlayEnabled && styles.actionButtonActive]}
                    onPress={toggleAutoPlay}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={autoPlayEnabled ? 'play-forward-circle' : 'play-forward-circle-outline'}
                      size={18}
                      color={autoPlayEnabled ? 'white' : 'rgba(255,255,255,0.7)'}
                    />
                    <Text style={[styles.actionText, autoPlayEnabled && styles.actionTextActive]}>
                      Autoplay
                    </Text>
                  </TouchableOpacity>

                  {/* Download Toggle */}
                  {!isOffline && contentId && contentType && audioUrl && (
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        isDownloadedState && styles.actionButtonActive,
                        isDownloadingState && styles.actionButtonDownloading,
                      ]}
                      onPress={handleDownload}
                      activeOpacity={0.7}
                      disabled={isDownloadingState || isDownloadedState}
                    >
                      {isDownloadingState ? (
                        <>
                          <ActivityIndicator size={14} color="white" />
                          <Text style={styles.actionTextActive}>{downloadProgress}%</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name={isDownloadedState ? 'checkmark-circle' : 'cloud-download-outline'}
                            size={18}
                            color={isDownloadedState ? '#4CAF50' : 'rgba(255,255,255,0.7)'}
                          />
                          <Text style={[styles.actionText, isDownloadedState && styles.actionTextDownloaded]}>
                            {isDownloadedState ? 'Saved' : 'Download'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Standalone Controls (for content without prev/next) */}
            {!(onPrevious || onNext) && (
              <View style={styles.standaloneDownload}>
                {/* Like Button */}
                {onRate && (
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      userRating === 'like' && styles.toggleButtonLiked,
                    ]}
                    onPress={() => onRate('like')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={userRating === 'like' ? 'thumbs-up' : 'thumbs-up-outline'}
                      size={16}
                      color={userRating === 'like' ? '#4CAF50' : 'rgba(255,255,255,0.7)'}
                    />
                  </TouchableOpacity>
                )}

                {/* Dislike Button */}
                {onRate && (
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      userRating === 'dislike' && styles.toggleButtonDisliked,
                    ]}
                    onPress={() => onRate('dislike')}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={userRating === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'}
                      size={16}
                      color={userRating === 'dislike' ? '#FF6B6B' : 'rgba(255,255,255,0.7)'}
                    />
                  </TouchableOpacity>
                )}

                {/* Download Button */}
                {!isOffline && contentId && contentType && audioUrl && (
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      isDownloadedState && styles.toggleButtonActive,
                      isDownloadingState && styles.toggleButtonDownloading,
                    ]}
                    onPress={handleDownload}
                    activeOpacity={0.7}
                    disabled={isDownloadingState || isDownloadedState}
                  >
                    {isDownloadingState ? (
                      <>
                        <ActivityIndicator size={14} color="white" />
                        <Text style={styles.toggleTextActive}>{downloadProgress}%</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons
                          name={isDownloadedState ? 'checkmark-circle' : 'cloud-download-outline'}
                          size={18}
                          color={isDownloadedState ? '#4CAF50' : 'rgba(255,255,255,0.5)'}
                        />
                        <Text style={[styles.toggleText, isDownloadedState && styles.toggleTextDownloaded]}>
                          {isDownloadedState ? 'Saved' : 'Download'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Optional Footer Content */}
          {footerContent}
        </ScrollView>

        {/* Background Audio Picker Modal */}
        <BackgroundAudioPicker
          visible={showBackgroundPicker}
          onClose={() => setShowBackgroundPicker(false)}
          sounds={ambientSounds}
          soundsLoading={ambientSoundsLoading}
          selectedSoundId={backgroundAudio.selectedSoundId}
          loadingSoundId={backgroundAudio.loadingSoundId}
          isAudioReady={backgroundAudio.isAudioReady}
          hasError={backgroundAudio.hasError}
          volume={backgroundAudio.volume}
          isEnabled={backgroundAudio.isEnabled}
          onSelectSound={handleSelectSound}
          onVolumeChange={backgroundAudio.setVolume}
          onToggleEnabled={backgroundAudio.setEnabled}
        />

        {/* Sleep Timer Picker Modal */}
        <SleepTimerPicker
          visible={showSleepTimerPicker}
          onClose={() => setShowSleepTimerPicker(false)}
        />

        {/* Report Modal */}
        {onReport && (
          <ReportModal
            visible={showReportModal}
            onClose={() => setShowReportModal(false)}
            onSubmit={onReport}
            contentTitle={title}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    fullScreen: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    loadingText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: 'white',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerButtonActive: {
      backgroundColor: 'rgba(125, 175, 180, 0.25)',
    },
    headerButtonLiked: {
      backgroundColor: 'rgba(76, 175, 80, 0.25)',
    },
    headerButtonDisliked: {
      backgroundColor: 'rgba(255, 107, 107, 0.25)',
    },
    favoriteButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backgroundIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 16,
      alignSelf: 'center',
      marginTop: -8,
    },
    backgroundIndicatorText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    sleepTimerIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: 'rgba(125, 175, 180, 0.15)',
      borderRadius: 16,
      alignSelf: 'center',
      marginTop: 4,
    },
    sleepTimerIndicatorText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: '#7DAFB4',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      alignItems: 'center',
      paddingBottom: theme.spacing.xl,
    },
    iconContainer: {
      alignItems: 'center',
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    iconCircle: {
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailImage: {
      width: 140,
      height: 140,
      borderRadius: 70,
    },
    infoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    category: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.7)',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: theme.spacing.xs,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: 'white',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    metaInfoText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    description: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.85)',
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    metaRow: {
      flexDirection: 'row',
      gap: theme.spacing.xl,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
      textTransform: 'capitalize',
    },
    narratorSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    narratorPhoto: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    narratorPhotoPlaceholder: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    narratorText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    playerContainer: {
      width: '100%',
      marginBottom: theme.spacing.xl,
    },
    loadingPlayer: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 150,
      gap: theme.spacing.md,
    },
    loadingPlayerText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    trackNavigationContainer: {
      marginTop: theme.spacing.lg,
      gap: 12,
    },
    trackNavigation: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    trackNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    trackNavButtonDisabled: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    trackNavText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: 'white',
    },
    trackNavTextDisabled: {
      color: 'rgba(255, 255, 255, 0.3)',
    },
    actionControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionButtonActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    actionButtonLiked: {
      backgroundColor: 'rgba(76, 175, 80, 0.25)',
    },
    actionButtonDisliked: {
      backgroundColor: 'rgba(255, 107, 107, 0.25)',
    },
    actionButtonDownloading: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    actionText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    actionTextActive: {
      color: 'white',
    },
    actionTextDownloaded: {
      color: '#4CAF50',
    },
    // Keep old toggle styles for standalone section
    toggleButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    toggleButtonActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    toggleButtonLiked: {
      backgroundColor: 'rgba(76, 175, 80, 0.25)',
    },
    toggleButtonDisliked: {
      backgroundColor: 'rgba(255, 107, 107, 0.25)',
    },
    toggleButtonDownloading: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    toggleText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.7)',
    },
    toggleTextActive: {
      color: 'white',
    },
    toggleTextDownloaded: {
      color: '#4CAF50',
    },
    standaloneDownload: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      marginTop: theme.spacing.lg,
    },
  });
