/**
 * ============================================================
 * shared/media-player/hooks/useAutoPlay.ts — Auto-play orchestration
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * Owns the "play the next track automatically when this one finishes" behavior:
 *   - the persisted user preference (AsyncStorage), and
 *   - the completion observer that fires onNext once playback ends.
 *
 * Pure orchestration: it returns the preference + toggle for the view to
 * render, and runs the next-track effect as a side-effect.
 * ============================================================
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';

// AsyncStorage key for persisting the auto-play user preference.
const AUTOPLAY_KEY = 'calmdemy_autoplay_enabled';

export interface UseAutoPlayProps {
  /** Changes when the track changes; resets the once-per-track trigger guard. */
  trackKey: string;
  hasNext: boolean;
  onNext?: () => void;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
}

export interface UseAutoPlayReturn {
  autoPlayEnabled: boolean;
  toggleAutoPlay: () => Promise<void>;
}

/**
 * useAutoPlay — auto-play preference + next-track-on-completion observer.
 */
export function useAutoPlay({
  trackKey,
  hasNext,
  onNext,
  audioPlayer,
}: UseAutoPlayProps): UseAutoPlayReturn {
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  // Guard so the completion observer fires at most once per track.
  const hasTriggeredAutoPlay = useRef(false);

  // Restore the persisted auto-play preference on mount (defaults to enabled).
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

  const toggleAutoPlay = async () => {
    const newValue = !autoPlayEnabled;
    setAutoPlayEnabled(newValue);
    try {
      await AsyncStorage.setItem(AUTOPLAY_KEY, String(newValue));
    } catch (error) {
      console.error('Failed to save auto-play preference:', error);
    }
  };

  // Reset the trigger guard whenever the track changes, so auto-play can fire
  // again on the next track's completion.
  useEffect(() => {
    hasTriggeredAutoPlay.current = false;
  }, [trackKey]);

  // Auto-play the next track once the current audio completes naturally
  // (progress >= 0.99 and stopped). The 500ms delay smooths the transition.
  useEffect(() => {
    if (
      autoPlayEnabled &&
      hasNext &&
      onNext &&
      audioPlayer.progress >= 0.99 &&
      !audioPlayer.isPlaying &&
      audioPlayer.duration > 0 &&
      !hasTriggeredAutoPlay.current
    ) {
      hasTriggeredAutoPlay.current = true;
      setTimeout(() => {
        onNext();
      }, 500);
    }
  }, [autoPlayEnabled, hasNext, onNext, audioPlayer.progress, audioPlayer.isPlaying, audioPlayer.duration]);

  return { autoPlayEnabled, toggleAutoPlay };
}
