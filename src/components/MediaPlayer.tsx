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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioPlayer } from './AudioPlayer';
import { BackgroundAudioPicker } from './BackgroundAudioPicker';
import { SleepTimerPicker } from './SleepTimerPicker';
import { ReportModal } from './ReportModal';
import { RatingType, ReportCategory } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { useSleepTimer, formatTimerDisplay } from '../contexts/SleepTimerContext';
import { Theme } from '../theme';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useBackgroundAudio } from '../hooks/useBackgroundAudio';
import { getAudioUrlFromPath } from '../constants/audioFiles';
import { getSleepSoundById, getNarratorByName, FirestoreSleepSound, savePlaybackProgress, getPlaybackProgress, clearPlaybackProgress } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useNetwork } from '../contexts/NetworkContext';
import { isDownloaded, downloadAudio, isDownloading as checkIsDownloading } from '../services/downloadService';

const AUTOPLAY_KEY = 'calmdemy_autoplay_enabled';

export interface MediaPlayerProps {
  // Content info
  category: string;
  title: string;
  instructor?: string;
  instructorPhotoUrl?: string;
  description?: string;
  metaInfo?: string; // e.g., "CBT 101 · Module 1 Practice"
  durationMinutes: number;
  difficultyLevel?: string;

  // Styling
  gradientColors: [string, string];
  artworkIcon: keyof typeof Ionicons.glyphMap;
  artworkThumbnailUrl?: string;

  // State
  isFavorited: boolean;
  isLoading: boolean;

  // Audio player state (from useAudioPlayer)
  audioPlayer: ReturnType<typeof useAudioPlayer>;

  // Callbacks
  onBack: () => void;
  onToggleFavorite: () => void;
  onPlayPause: () => void;

  // Optional loading text
  loadingText?: string;

  // Optional footer content (e.g., sleep timer button)
  footerContent?: React.ReactNode;

  // Enable background audio feature (default: true for meditations)
  enableBackgroundAudio?: boolean;

  // Previous/Next navigation (for collections like courses, series, albums)
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;

  // Content identification for progress tracking
  contentId?: string;
  contentType?: string;

  // Audio URL for download
  audioUrl?: string;
  
  // Additional metadata for downloads
  parentId?: string;
  parentTitle?: string;
  audioPath?: string;

  // Skip restoring saved position (e.g., when autoplay triggers next track)
  skipRestore?: boolean;

  // Rating and report
  userRating?: RatingType | null;
  onRate?: (rating: RatingType) => Promise<RatingType | null>;
  onReport?: (category: ReportCategory, description?: string) => Promise<boolean>;
}

export function MediaPlayer({
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
}: MediaPlayerProps) {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { width: screenWidth } = useWindowDimensions();
  
  // Responsive breakpoints
  const isSmallScreen = screenWidth < 375;
  const isMediumScreen = screenWidth >= 375 && screenWidth < 414;
  
  // Responsive values
  const artworkSize = isSmallScreen ? 100 : isMediumScreen ? 120 : 140;
  const titleFontSize = isSmallScreen ? 22 : isMediumScreen ? 25 : 28;
  const artworkIconSize = isSmallScreen ? 48 : isMediumScreen ? 56 : 64;
  const contentPadding = isSmallScreen ? 12 : isMediumScreen ? 16 : 24;
  const sectionMargin = isSmallScreen ? 12 : isMediumScreen ? 16 : 24;
  
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [currentBackgroundSound, setCurrentBackgroundSound] = useState<FirestoreSleepSound | null>(null);
  const [narratorPhotoUrl, setNarratorPhotoUrl] = useState<string | null>(instructorPhotoUrl || null);
  
  // Auto-play state
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const hasTriggeredAutoPlay = useRef(false);

  // Download state
  const [isDownloadedState, setIsDownloadedState] = useState(false);
  const [isDownloadingState, setIsDownloadingState] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Sleep timer state
  const [showSleepTimerPicker, setShowSleepTimerPicker] = useState(false);
  const sleepTimer = useSleepTimer();

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);

  // Playback progress tracking
  const lastSaveTime = useRef(0);
  const hasRestoredPosition = useRef(false);

  // Load auto-play preference from AsyncStorage
  useEffect(() => {
    async function loadAutoPlayPreference() {
      try {
        const stored = await AsyncStorage.getItem(AUTOPLAY_KEY);
        if (stored !== null) {
          setAutoPlayEnabled(stored === 'true');
        }
      } catch (error) {
        console.error('Failed to load auto-play preference:', error);
      }
    }
    loadAutoPlayPreference();
  }, []);

  // Check download status on mount and when contentId changes
  useEffect(() => {
    async function checkDownloadStatus() {
      if (!contentId) return;
      const downloaded = await isDownloaded(contentId);
      setIsDownloadedState(downloaded);
      setIsDownloadingState(checkIsDownloading(contentId));
    }
    checkDownloadStatus();
  }, [contentId]);

  // Handle download
  const handleDownload = async () => {
    if (!contentId || !contentType || !audioUrl || isDownloadingState || isDownloadedState) return;
    
    setIsDownloadingState(true);
    setDownloadProgress(0);
    
    const success = await downloadAudio(
      contentId,
      contentType,
      audioUrl,
      {
        title,
        duration_minutes: durationMinutes,
        thumbnailUrl: artworkThumbnailUrl,
        parentId,
        parentTitle,
        audioPath,
      },
      (progress) => setDownloadProgress(progress)
    );
    
    setIsDownloadingState(false);
    setDownloadProgress(0);
    if (success) {
      setIsDownloadedState(true);
    }
  };

  // Save auto-play preference when it changes
  const toggleAutoPlay = async () => {
    const newValue = !autoPlayEnabled;
    setAutoPlayEnabled(newValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(newValue));
    } catch (error) {
      console.error('Failed to save auto-play preference:', error);
    }
  };

  // Background audio hook
  const backgroundAudio = useBackgroundAudio();

  // Fetch narrator photo if not provided
  useEffect(() => {
    async function fetchNarratorPhoto() {
      if (instructor && !instructorPhotoUrl) {
        const narrator = await getNarratorByName(instructor);
        if (narrator?.photoUrl) {
          setNarratorPhotoUrl(narrator.photoUrl);
        }
      }
    }
    fetchNarratorPhoto();
  }, [instructor, instructorPhotoUrl]);

  // Fetch current background sound when selectedSoundId changes
  useEffect(() => {
    async function fetchCurrentSound() {
      if (backgroundAudio.selectedSoundId) {
        const sound = await getSleepSoundById(backgroundAudio.selectedSoundId);
        setCurrentBackgroundSound(sound);
      } else {
        setCurrentBackgroundSound(null);
      }
    }
    fetchCurrentSound();
  }, [backgroundAudio.selectedSoundId]);

  // Load saved background sound audio URL when initialized
  useEffect(() => {
    async function loadSavedSoundAudio() {
      if (enableBackgroundAudio && backgroundAudio.isInitialized && backgroundAudio.selectedSoundId) {
        const sound = await getSleepSoundById(backgroundAudio.selectedSoundId);
        if (sound) {
          const url = await getAudioUrlFromPath(sound.audioPath);
          if (url) {
            backgroundAudio.loadAudio(url, backgroundAudio.selectedSoundId);
          }
        }
      }
    }
    loadSavedSoundAudio();
  }, [backgroundAudio.isInitialized, backgroundAudio.selectedSoundId, enableBackgroundAudio]);

  // Auto-play background audio when it's loaded and enabled (independent of main audio)
  useEffect(() => {
    if (!enableBackgroundAudio) return;

    // Play background audio automatically when it's loaded and enabled
    // This runs independently of the main content audio
    if (backgroundAudio.isEnabled && backgroundAudio.selectedSoundId && backgroundAudio.hasAudioLoaded) {
      backgroundAudio.play();
    }
  }, [backgroundAudio.isEnabled, backgroundAudio.hasAudioLoaded, backgroundAudio.selectedSoundId, enableBackgroundAudio]);

  // Cleanup background audio on unmount
  useEffect(() => {
    return () => {
      backgroundAudio.cleanup();
    };
  }, []);

  // Register audio player with sleep timer for fade-out effect
  useEffect(() => {
    sleepTimer.registerAudioPlayer({
      setVolume: (volume: number) => {
        if (audioPlayer.player) {
          audioPlayer.player.volume = volume;
        }
      },
      pause: () => {
        audioPlayer.pause();
        // Also pause background audio
        backgroundAudio.pause();
      },
    });

    return () => {
      sleepTimer.unregisterAudioPlayer();
    };
  }, [audioPlayer.player, sleepTimer]);

  // Reset auto-play trigger flag when track changes
  useEffect(() => {
    hasTriggeredAutoPlay.current = false;
  }, [title]);

  // Auto-play next track when current one completes
  useEffect(() => {
    // Check if audio has completed naturally (progress >= 0.99 and not playing)
    if (
      autoPlayEnabled &&
      hasNext &&
      onNext &&
      audioPlayer.progress >= 0.99 &&
      !audioPlayer.isPlaying &&
      audioPlayer.duration > 0 &&
      !hasTriggeredAutoPlay.current
    ) {
      // Mark as triggered to prevent double-firing
      hasTriggeredAutoPlay.current = true;
      // Small delay to ensure smooth transition
      setTimeout(() => {
        onNext();
      }, 500);
    }
  }, [autoPlayEnabled, hasNext, onNext, audioPlayer.progress, audioPlayer.isPlaying, audioPlayer.duration]);

  // Restore playback position on mount (skip if coming from autoplay)
  useEffect(() => {
    async function restorePosition() {
      if (!user?.uid || !contentId || hasRestoredPosition.current) return;
      
      // Skip restoring if this is an autoplay navigation
      if (skipRestore) {
        hasRestoredPosition.current = true;
        return;
      }
      
      const progress = await getPlaybackProgress(user.uid, contentId);
      if (progress && progress.position_seconds > 5) {
        // Wait for audio to be ready before seeking
        const checkAndSeek = () => {
          if (audioPlayer.duration > 0) {
            audioPlayer.seekTo(progress.position_seconds);
            hasRestoredPosition.current = true;
          } else {
            // Retry after a short delay if audio not ready
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

  // Reset restore flag when content changes
  useEffect(() => {
    hasRestoredPosition.current = false;
    lastSaveTime.current = 0;
  }, [contentId]);

  // Save playback position periodically (every 10 seconds) and on pause
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

  // Clear progress when content is completed
  useEffect(() => {
    if (!user?.uid || !contentId) return;
    if (audioPlayer.progress >= 0.95 && audioPlayer.duration > 0) {
      clearPlaybackProgress(user.uid, contentId);
    }
  }, [user?.uid, contentId, audioPlayer.progress, audioPlayer.duration]);

  // Save position on unmount
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

  // Handle background sound selection
  const handleSelectSound = async (soundId: string | null, audioPath: string | null) => {
    if (soundId && audioPath) {
      backgroundAudio.selectSound(soundId);
      const url = await getAudioUrlFromPath(audioPath);
      if (url) {
        backgroundAudio.loadAudio(url, soundId);
        // If main audio is playing, start background audio too
        if (audioPlayer.isPlaying) {
          setTimeout(() => {
            backgroundAudio.play();
          }, 200);
        }
      }
    } else {
      backgroundAudio.selectSound(null);
    }
  };

  // Use dark gradient in dark mode
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

  return (
    <LinearGradient
      colors={effectiveGradient}
      style={styles.fullScreen}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
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

        {/* Background Audio Indicator */}
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

        {/* Sleep Timer Indicator */}
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

        {/* Content - ScrollView for smaller screens */}
        <ScrollView 
          style={[styles.content, { paddingHorizontal: contentPadding }]}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Artwork: Thumbnail or Icon */}
          <View style={[styles.iconContainer, { marginTop: sectionMargin, marginBottom: sectionMargin }]}>
            {artworkThumbnailUrl ? (
              <Image 
                source={{ uri: artworkThumbnailUrl }} 
                style={[styles.thumbnailImage, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }]} 
              />
            ) : (
              <View style={[styles.iconCircle, { width: artworkSize, height: artworkSize, borderRadius: artworkSize / 2 }]}>
                <Ionicons name={artworkIcon} size={artworkIconSize} color="white" />
              </View>
            )}
          </View>

          {/* Info */}
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

          {/* Audio Player */}
          <View style={[styles.playerContainer, { marginBottom: sectionMargin }]}>
            {audioPlayer.isLoading && !audioPlayer.duration ? (
              <View style={styles.loadingPlayer}>
                <ActivityIndicator size="large" color="white" />
                <Text style={styles.loadingPlayerText}>Loading audio...</Text>
              </View>
            ) : (
              <AudioPlayer
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

            {/* Previous/Next Navigation */}
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
