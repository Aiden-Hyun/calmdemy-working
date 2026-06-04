/**
 * ============================================================
 * shared/media-player/hooks/useBackgroundSoundController.ts
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * Owns the ambient/background-sound subsystem that plays alongside the main
 * track: the useBackgroundAudio engine, the selectable ambient-sound list, the
 * currently-selected sound's metadata, and the load/auto-play/cleanup effects
 * plus the selection handler.
 *
 * This hook also localizes the media-player layer's one accepted dependency on
 * a feature: the ambient-sound list comes from `useSleepSounds` (features/music
 * public API). Per the 6d-2 decision, the composing host owns this fetch and
 * declares what sounds it offers; isolating it here keeps the rest of the
 * player free of feature imports.
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';
import { useBackgroundAudio } from '../../../core/audio/useBackgroundAudio';
import { getAudioUrlFromPath } from '../../../core/audio/audioFiles';
import { getSleepSoundById, FirestoreSleepSound } from '../../../services/firestoreService';
import { useSleepSounds } from '../../../features/music';

export interface UseBackgroundSoundControllerProps {
  enableBackgroundAudio: boolean;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
}

export interface UseBackgroundSoundControllerReturn {
  backgroundAudio: ReturnType<typeof useBackgroundAudio>;
  currentBackgroundSound: FirestoreSleepSound | null;
  ambientSounds: FirestoreSleepSound[];
  ambientSoundsLoading: boolean;
  handleSelectSound: (soundId: string | null, audioPath: string | null) => Promise<void>;
}

/**
 * useBackgroundSoundController — ambient-sound engine, list, metadata, and
 * selection handling for the player.
 */
export function useBackgroundSoundController({
  enableBackgroundAudio,
  audioPlayer,
}: UseBackgroundSoundControllerProps): UseBackgroundSoundControllerReturn {
  const backgroundAudio = useBackgroundAudio();

  // Caches the current background sound's Firestore data (title, icon, color…).
  const [currentBackgroundSound, setCurrentBackgroundSound] = useState<FirestoreSleepSound | null>(null);

  // Ambient list fetched here (the composing host) and passed down to the
  // presentational BackgroundAudioPicker — keeps the picker feature-agnostic
  // and the feature edge at the public-API boundary (features/music index).
  const { data: ambientSounds = [], isLoading: ambientSoundsLoading } = useSleepSounds();

  // When the selected sound changes, fetch its metadata for display.
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

  // When the engine is initialized and a sound is selected, resolve its audio
  // URL and load it into the background engine.
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

  // Auto-play the background audio once it's loaded and enabled. Runs
  // independently of the main content audio (Observer pattern).
  useEffect(() => {
    if (!enableBackgroundAudio) return;
    if (backgroundAudio.isEnabled && backgroundAudio.selectedSoundId && backgroundAudio.hasAudioLoaded) {
      backgroundAudio.play();
    }
  }, [backgroundAudio.isEnabled, backgroundAudio.hasAudioLoaded, backgroundAudio.selectedSoundId, enableBackgroundAudio]);

  // Release the background audio resource on unmount.
  useEffect(() => {
    return () => {
      backgroundAudio.cleanup();
    };
  }, []);

  // Selection handler for the BackgroundAudioPicker: select + load + (if the
  // main audio is already playing) start the background sound too.
  const handleSelectSound = async (soundId: string | null, audioPath: string | null) => {
    if (soundId && audioPath) {
      backgroundAudio.selectSound(soundId);
      const url = await getAudioUrlFromPath(audioPath);
      if (url) {
        backgroundAudio.loadAudio(url, soundId);
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

  return {
    backgroundAudio,
    currentBackgroundSound,
    ambientSounds,
    ambientSoundsLoading,
    handleSelectSound,
  };
}
