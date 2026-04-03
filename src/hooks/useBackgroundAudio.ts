/**
 * ============================================================
 * useBackgroundAudio.ts — Background Audio Mixing & Control (Audio Layering)
 * ============================================================
 *
 * Architectural Role:
 *   This hook manages ambient background audio that plays alongside primary content
 *   (e.g., rain sounds during meditation). It implements audio mixing/layering,
 *   persistence (preferences saved to AsyncStorage), and state management for the
 *   background audio player, acting as a Facade over expo-audio and device storage.
 *
 * Design Patterns:
 *   - Composite/Layering: A single expo-audio player instance manages the background
 *     audio track independently of the main meditation audio. The app mixes these
 *     two audio sources simultaneously — this is the "audio mixing" pattern.
 *   - Facade: Exposes a simple interface (loadAudio, selectSound, setVolume) over
 *     the complex expo-audio lifecycle, error handling, and AsyncStorage I/O.
 *   - Observer Pattern: useAudioPlayerStatus subscribes to the player's state changes
 *     (isLoaded, isBuffering, playing) reactively.
 *   - State Machine (implicit): The hook tracks loading → ready → playing transitions,
 *     with error states branching off. States like loadingSoundId, readySoundId, and
 *     hasError form a small state machine.
 *   - Cleanup Pattern: Effects manage subscription cleanup and timeout clearing.
 *   - Persistence: AsyncStorage acts as a simple key-value store for user preferences,
 *     decoupling UI state from device storage.
 *
 * Audio Layering Concept:
 *   Background audio is a SECOND audio track that plays independently of the main
 *   (primary) audio. A user might hear: (1) meditation guide speaking (primary),
 *   (2) rain sounds (background). Both play simultaneously, with independent volume
 *   controls. This hook manages only the background track; the primary meditation
 *   audio is controlled elsewhere (e.g., expo-audio in the meditation player).
 *
 * Key State Variables:
 *   - selectedSoundId: Which sound the user chose (persisted to AsyncStorage)
 *   - loadingSoundId: Which sound is currently fetching/buffering
 *   - readySoundId: Which sound has fully loaded and is ready to play
 *   - currentAudioUrl: The signed URL being played (null while loading)
 *   - hasError: Whether the audio failed to load (timeout or fetch error)
 *
 * Consumed By:
 *   BackgroundAudioSelector UI components and meditation/sleep screens.
 * ============================================================
 */

import { useCallback, useState, useEffect, useRef } from "react";
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  AudioSource,
} from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  SELECTED_SOUND: "bg_audio_selected_sound",
  VOLUME: "bg_audio_volume",
  ENABLED: "bg_audio_enabled",
};

export interface BackgroundAudioState {
  isPlaying: boolean;
  isLoading: boolean;
  selectedSoundId: string | null;
  volume: number;
  isEnabled: boolean;
}

/**
 * Hook for managing background ambient audio that plays alongside primary content.
 *
 * This hook implements a complete background audio player with:
 *   - Audio mixing/layering (plays independently of primary meditation audio)
 *   - Preference persistence (user's sound choice and volume saved to device)
 *   - Loading state tracking (distinguishes between loading, ready, and error states)
 *   - Timeout detection (flags audio that takes >8 seconds to load as failed)
 *
 * The hook returns a state object and action callbacks that screens can use to:
 *   - Select which background sound to play
 *   - Load audio from a URL
 *   - Adjust volume and enable/disable
 *   - Play, pause, and stop the background track
 *
 * @returns Object containing: state (isPlaying, isLoading, etc.), UI flags (isAudioReady, hasError),
 *          and action callbacks (loadAudio, selectSound, setVolume, etc.)
 */
export function useBackgroundAudio() {
  // --- State: User's selections (persisted to AsyncStorage) ---
  const [selectedSoundId, setSelectedSoundId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.3); // Default 30% volume
  const [isEnabled, setIsEnabled] = useState(true);

  // --- State: Loading and readiness tracking (transient) ---
  const [loadingSoundId, setLoadingSoundId] = useState<string | null>(null);
  const [readySoundId, setReadySoundId] = useState<string | null>(null); // Track which sound is actually ready
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState<number | null>(null);

  // --- Audio player instance and status subscription ---
  // useExpoAudioPlayer creates a player that can load and play a single audio source.
  // useAudioPlayerStatus subscribes to that player's state (isLoaded, isBuffering, etc.),
  // allowing this hook to react to playback state changes.
  const player = useExpoAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  // --- Phase 1: Load saved preferences from AsyncStorage on first mount ---
  // This Persistence pattern restores the user's previous choices (selected sound, volume, enabled)
  // from the device's local storage, providing a seamless experience across app restarts.
  useEffect(() => {
    async function loadPreferences() {
      try {
        // Parallel fetch: retrieve all three preferences at once using Promise.all.
        // This is more efficient than sequential awaits.
        const [savedSoundId, savedVolume, savedEnabled] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SELECTED_SOUND),
          AsyncStorage.getItem(STORAGE_KEYS.VOLUME),
          AsyncStorage.getItem(STORAGE_KEYS.ENABLED),
        ]);

        if (savedSoundId) {
          setSelectedSoundId(savedSoundId);
        }
        if (savedVolume) {
          // AsyncStorage stores primitives as strings, so parse the volume back to a number.
          setVolumeState(parseFloat(savedVolume));
        }
        if (savedEnabled !== null) {
          // Convert string "true"/"false" from AsyncStorage back to boolean.
          setIsEnabled(savedEnabled === "true");
        }
        setIsInitialized(true);
      } catch (err) {
        console.warn("Failed to load background audio preferences:", err);
        // Graceful Degradation: even if preferences fail to load, mark initialized
        // so the hook doesn't stay in a pending state. Fall back to defaults.
        setIsInitialized(true);
      }
    }
    loadPreferences();
  }, []);

  // --- Phase 2: Load audio source when URL changes ---
  // When a new audio URL becomes available (after fetching), configure the player
  // with that source. This effect runs after selectSound/loadAudio set the currentAudioUrl.
  useEffect(() => {
    if (currentAudioUrl && isEnabled) {
      try {
        // Create an audio source from the signed URL.
        const source: AudioSource = { uri: currentAudioUrl };
        // Replace any existing audio with the new source (stops old audio first).
        player.replace(source);
        // Configure looping so the background sound plays continuously.
        player.loop = true;
        // Set the player's volume to match the user's preference.
        player.volume = volume;
      } catch (err) {
        console.warn("Failed to load background audio:", err);
        // Don't crash the app on player setup errors; just warn and continue.
      }
    }
  }, [currentAudioUrl, isEnabled]);

  // --- Phase 3: Sync volume changes to player ---
  // Whenever the user adjusts the volume slider, immediately apply the change
  // to the playing audio so the user hears the update in real-time.
  useEffect(() => {
    try {
      player.volume = volume;
    } catch (err) {
      // Ignore errors during volume sync; this is a non-critical update.
    }
  }, [volume, player]);

  // --- Ref: Track the URL we're loading to detect race conditions ---
  // This ref persists across renders and lets us compare what we started loading
  // with what the player actually loaded, catching cases where the URL changed
  // mid-load (user selected a different sound before the first finished loading).
  const loadingUrlRef = useRef<string | null>(null);

  // --- Action: Load audio by URL with state reset ---
  /**
   * Load a new audio URL and begin playback.
   *
   * This function is called by selectSound or by screens that have a signed URL ready.
   * It resets the loading state machine: stops the old audio, clears the ready flag,
   * sets loadingSoundId to indicate that THIS sound is now being loaded, and stores
   * the URL in both state and a ref (for race condition detection).
   *
   * @param url - The signed audio URL to load
   * @param soundId - The sound ID being loaded (used to track which sound is loading/ready)
   */
  const loadAudio = useCallback(
    (url: string, soundId: string) => {
      // --- Stop the currently playing audio ---
      try {
        player.pause();
      } catch (err) {
        // Ignore errors during pause; user is changing sounds anyway.
      }

      // --- Reset state machine for the new sound ---
      setHasError(false); // Clear any previous load error
      setReadySoundId(null); // Clear the ready flag — new sound not ready yet
      setLoadingSoundId(soundId); // Mark this sound as currently loading
      setLoadStartTime(Date.now()); // Record load start for timeout detection
      loadingUrlRef.current = url; // Store the URL in a ref for race condition detection
      setCurrentAudioUrl(url); // Trigger the Phase 2 effect to configure the player
    },
    [player]
  );

  // --- Phase 4: Detect when audio finishes loading and mark as ready ---
  // Once the player reports isLoaded && !isBuffering, the audio is ready to play.
  // We set readySoundId so the UI can show a checkmark and allow playback.
  // A 100ms delay ensures the player state is stable.
  useEffect(() => {
    // Only run this effect if we're currently loading a sound.
    if (loadingSoundId && status.isLoaded && !status.isBuffering && currentAudioUrl === loadingUrlRef.current) {
      // Small delay to ensure audio state is truly stable (not a transient spike).
      const timer = setTimeout(() => {
        // Capture the loadingSoundId value at the time of the timeout,
        // in case it changed during the 100ms delay.
        const soundIdToReady = loadingSoundId;
        setLoadingSoundId(null); // Clear the loading flag
        setReadySoundId(soundIdToReady); // Mark THIS specific sound as ready
        loadingUrlRef.current = null; // Clear the ref
        setLoadStartTime(null); // Clear the load start time
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status.isLoaded, status.isBuffering, loadingSoundId, currentAudioUrl]);

  // --- Ref: Track readySoundId for timeout detection ---
  // This ref allows the timeout effect to check if a sound has become ready
  // without recreating the timeout whenever readySoundId changes. Without this ref,
  // the timeout would reset every time readySoundId updated, defeating the purpose.
  const readySoundIdRef = useRef<string | null>(null);
  useEffect(() => {
    readySoundIdRef.current = readySoundId;
  }, [readySoundId]);

  // --- Phase 5: Detect load timeout (8 seconds) ---
  // If a sound takes more than 8 seconds to reach the ready state, assume it has
  // failed to load and mark it with an error. The UI will show a failure message
  // and allow the user to retry or select a different sound.
  useEffect(() => {
    // Only start the timeout if we have a selected sound that hasn't become ready yet.
    if (selectedSoundId && !readySoundId && !hasError && currentAudioUrl) {
      const targetSoundId = selectedSoundId; // Capture the current sound ID
      const timer = setTimeout(() => {
        // After 8 seconds, check if the sound has become ready (using the ref for latest value).
        // If it's still not ready, the load has likely failed (network error, invalid URL, etc.).
        if (readySoundIdRef.current !== targetSoundId) {
          // Mark the load as failed so the UI can display an error state.
          setHasError(true);
          setLoadingSoundId(null);
          setLoadStartTime(null);
        }
      }, 8000); // 8-second timeout
      return () => clearTimeout(timer);
    }
  }, [selectedSoundId, readySoundId, hasError, currentAudioUrl]);

  // --- Action: Select a background sound and persist the choice ---
  /**
   * Select which background sound to play, persisting the choice to AsyncStorage.
   *
   * This function does NOT load the audio yet — it just marks which sound the user
   * chose. The actual URL fetching and loading happens elsewhere (e.g., in a screen
   * component that calls loadAudio once it has a URL). This separation allows the
   * UI to save the user's choice immediately, even before the URL is ready.
   *
   * Passing null stops background audio and clears the selection.
   *
   * @param soundId - The sound ID to select, or null to disable background audio
   */
  const selectSound = useCallback(
    async (soundId: string | null) => {
      // --- Pause current audio immediately ---
      try {
        player.pause();
      } catch (err) {
        // Ignore errors during pause.
      }

      // --- Update state ---
      setSelectedSoundId(soundId);
      if (!soundId) {
        // When deselecting, also clear the URL and loading state.
        setCurrentAudioUrl(null);
        setLoadingSoundId(null);
      }

      // --- Persist to AsyncStorage ---
      try {
        if (soundId) {
          // Save the selected sound ID so it's restored on next app launch.
          await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_SOUND, soundId);
        } else {
          // Remove the saved selection if the user clears it.
          await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_SOUND);
        }
      } catch (err) {
        console.warn("Failed to save sound preference:", err);
        // Graceful Degradation: if persistence fails, the app continues to work
        // with in-memory state. The user's choice just won't survive app restart.
      }
    },
    [player]
  );

  // --- Action: Adjust volume and persist ---
  /**
   * Set the background audio volume and save it to AsyncStorage.
   *
   * The volume is clamped to [0, 1] and immediately applied to the player,
   * so the user hears the change in real-time. The preference is persisted
   * for restoration on app restart.
   *
   * @param newVolume - Desired volume level (0 to 1)
   */
  const setVolume = useCallback(async (newVolume: number) => {
    // Clamp the volume to valid range [0, 1]
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    try {
      // Apply immediately to the player
      player.volume = clampedVolume;
      // Persist to device storage (converted to string)
      await AsyncStorage.setItem(STORAGE_KEYS.VOLUME, clampedVolume.toString());
    } catch (err) {
      console.warn("Failed to save volume preference:", err);
    }
  }, [player]);

  // --- Action: Toggle enabled state and persist ---
  /**
   * Enable or disable background audio playback.
   *
   * When disabled, the background audio pauses immediately and is not restored
   * until the user re-enables it. The preference is persisted to AsyncStorage.
   *
   * @param enabled - true to allow background audio, false to disable
   */
  const setEnabled = useCallback(async (enabled: boolean) => {
    setIsEnabled(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ENABLED, enabled.toString());
      // If disabling, immediately pause the player
      if (!enabled) {
        player.pause();
      }
    } catch (err) {
      console.warn("Failed to save enabled preference:", err);
    }
  }, [player]);

  // --- Action: Start playback ---
  /**
   * Begin playing the background audio.
   *
   * This is a no-op if the feature is disabled or no audio is currently loaded.
   * It sets the player to loop mode and applies the current volume.
   */
  const play = useCallback(() => {
    // Guard clauses: only play if enabled and audio is loaded
    if (!isEnabled || !currentAudioUrl) return;
    try {
      player.loop = true;
      player.volume = volume;
      player.play();
    } catch (err) {
      console.warn("Failed to play background audio:", err);
    }
  }, [player, isEnabled, currentAudioUrl, volume]);

  // --- Action: Pause playback ---
  /**
   * Pause the background audio without stopping or seeking.
   *
   * The audio position is preserved, so calling play() will resume from where
   * it paused.
   */
  const pause = useCallback(() => {
    try {
      player.pause();
    } catch (err) {
      console.warn("Failed to pause background audio:", err);
    }
  }, [player]);

  // --- Action: Stop and reset to beginning ---
  /**
   * Stop the background audio and seek to the beginning.
   *
   * This is distinct from pause() — calling play() after stop() will resume
   * from the beginning, not from where it was paused.
   */
  const stop = useCallback(() => {
    try {
      player.pause();
      player.seekTo(0);
    } catch (err) {
      console.warn("Failed to stop background audio:", err);
    }
  }, [player]);

  // --- Action: Cleanup on unmount ---
  /**
   * Cleanup function for component unmount.
   *
   * Call this in a useEffect cleanup to gracefully stop the background audio
   * when the component that owns this hook unmounts.
   */
  const cleanup = useCallback(() => {
    try {
      player.pause();
    } catch (err) {
      // Ignore cleanup errors; the component is unmounting anyway
    }
  }, [player]);

  // --- Derived state: Check if audio is truly ready ---
  // The audio is only "ready" when:
  //   1. readySoundId is set (audio has finished loading)
  //   2. readySoundId === selectedSoundId (the loaded sound is the one the user selected)
  //   3. !hasError (there was no load error)
  // This multi-part check prevents showing a ready state for stale audio if the user
  // selected a different sound while the first was loading.
  const isAudioReady = readySoundId !== null && readySoundId === selectedSoundId && !hasError;

  // --- Derived state: Check if the selected sound is currently loading ---
  // The selected sound is loading if:
  //   1. selectedSoundId is set (user has selected a sound)
  //   2. !isAudioReady (that sound is not yet ready)
  //   3. !hasError (there was no error — if there was, we're not retrying)
  const isSelectedSoundLoading = selectedSoundId !== null && !isAudioReady && !hasError;

  // --- Gather player state into BackgroundAudioState interface ---
  const state: BackgroundAudioState = {
    isPlaying: status.playing,
    isLoading: !status.isLoaded || status.isBuffering,
    selectedSoundId,
    volume,
    isEnabled,
  };

  // --- Return public API ---
  return {
    // Spread the BackgroundAudioState interface properties
    ...state,

    // Additional state flags for the UI
    isInitialized, // Whether saved preferences have been loaded
    hasAudioLoaded: !!currentAudioUrl && isAudioReady, // True when audio is ready to play
    loadingSoundId: isSelectedSoundLoading ? selectedSoundId : loadingSoundId, // Which sound is loading (if any)
    isAudioReady, // True when the audio has finished loading (computed state)
    hasError, // True if audio failed to load

    // Action callbacks
    selectSound,
    loadAudio,
    setVolume,
    setEnabled,
    play,
    pause,
    stop,
    cleanup,
  };
}
