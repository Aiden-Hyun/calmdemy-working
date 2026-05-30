/**
 * ============================================================
 * useAudioPlayer.ts — Custom Audio Playback Hook
 * ============================================================
 *
 * Architectural Role:
 *   This module implements a Hooks Composition wrapper around expo-audio's
 *   native audio player, adding higher-level playback controls, state
 *   management, and device-level audio configuration. It abstracts away
 *   platform-specific audio routing and mode settings, letting screens
 *   and features interact with audio playback through a clean,
 *   declarative interface.
 *
 *   Screens and ViewModels depend on this hook to load, play, pause,
 *   seek, and monitor audio without needing to know about expo-audio's
 *   lower-level APIs, platform variants, or device audio modes.
 *
 * Design Patterns:
 *   - Hooks Composition: Wraps expo-audio's useAudioPlayer and
 *     useAudioPlayerStatus into a single, cohesive custom hook that
 *     aggregates state and actions.
 *   - Ref Pattern: Maintains a hasLoadedRef to track if an audio source
 *     has successfully loaded, preventing redundant state updates.
 *   - Controlled Component: The hook exposes loadAudio, play, pause, and
 *     seekTo actions, giving callers direct control over playback state.
 *   - Observer Pattern: Subscribes to expo-audio's status stream; state
 *     updates reactively when the underlying player emits new positions,
 *     duration, or loading states.
 *
 * Key Dependencies:
 *   - expo-audio (native audio playback engine)
 *   - React Hooks (useState, useEffect, useRef, useCallback, useMemo)
 *
 * Consumed By:
 *   - Meditation/sleep content screens that need to play guided audio
 *   - Music or podcast player screens
 *   - Any feature that requires full playback control
 * ============================================================
 */

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  useAudioPlayer as useExpoAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  AudioSource,
} from "expo-audio";

/**
 * Represents the complete playback state of the audio player.
 * This is the primary read-only interface for screens and components.
 */
export interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  progress: number;
  formattedPosition: string;
  formattedDuration: string;
  error: string | null;
  isLooping: boolean;
  playbackRate: number;
}

/**
 * Normalizes audio source formats to the expo-audio AudioSource contract.
 *
 * This helper implements an Adapter pattern: it accepts either a string URL
 * (remote audio from a server) or a require() result (local bundled audio),
 * and transforms both into the AudioSource object shape that expo-audio
 * expects. This decouples callers from having to know which format they're
 * passing — they just call this and get back a standard AudioSource.
 *
 * @param source - A string URL, a require() result (number), or null
 * @returns An AudioSource object with { uri } property, or null if source is falsy
 */
function resolveAudioSource(
  source: string | number | null
): AudioSource | null {
  if (!source) return null;

  // If it's a URL string, wrap it in { uri: ... }
  if (typeof source === "string") {
    return { uri: source };
  }

  // Already a require() result (number) - this shouldn't happen with remote URLs
  // but keep for backwards compatibility
  return source;
}

/**
 * Custom hook that wraps expo-audio's useAudioPlayer with additional utilities.
 *
 * This hook encapsulates all playback logic, device configuration, and state
 * management in one place. It initializes the device audio mode (silent mode,
 * background playback, audio focus) on mount and provides an extensive API
 * for controlling playback — play, pause, seek, volume, looping, speed, etc.
 *
 * The hook follows the Hooks Composition pattern: it combines multiple smaller
 * hooks (useState, useEffect, useRef, useCallback, useMemo) and expo-audio's
 * hooks into a single, cohesive unit that exposes a unified interface.
 *
 * @param initialSource - Optional initial audio URL or require() result
 * @returns An object with state properties and action methods
 */
export function useAudioPlayer(initialSource?: string | number | null) {
  const [error, setError] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState(false);
  const [playbackRate, setPlaybackRateState] = useState(1.0);
  /**
   * Ref Pattern: Tracks whether audio has been successfully loaded.
   * This allows us to avoid redundant load attempts and distinguish
   * between "never loaded" and "load failed" states.
   */
  const hasLoadedRef = useRef(false);

  /**
   * Cleanup/Teardown: Configure device-level audio mode on mount.
   * This effect runs once and is never re-executed because the dependency
   * array is empty. It sets:
   * - playsInSilentMode: audio plays even when the device is muted
   * - shouldPlayInBackground: audio continues when the app enters background
   * - interruptionMode: 'doNotMix' pauses our audio if another app (e.g., Music)
   *   starts playing, preventing simultaneous playback
   *
   * This is a platform-specific concern that must happen early, before any
   * audio attempts to play, so it's attached to the mount lifecycle.
   */
  useEffect(() => {
    async function configureAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          shouldRouteThroughEarpiece: false,
          // 'doNotMix' ensures audio pauses when other apps play audio
          interruptionMode: 'doNotMix',
        });
        // Also set audio as active to acquire audio focus on Android
        const { setIsAudioActiveAsync } = await import("expo-audio");
        await setIsAudioActiveAsync(true);
      } catch (err) {
        console.warn("Failed to configure audio mode:", err);
      }
    }
    configureAudio();
  }, []);

  /**
   * Memoized initial source resolution. This is computed only once at mount
   * (empty dependency array), ensuring the initial AudioSource doesn't trigger
   * unnecessary player re-instantiations. The player is only created once with
   * this initial source.
   */
  const initialResolvedSource = useMemo(
    () => resolveAudioSource(initialSource ?? null),
    [] // Only compute once
  );

  /**
   * Observer Pattern: Subscribe to expo-audio's player. The player is the
   * Observable; it emits playback status updates (position, duration, state)
   * at a fixed interval (250ms) which we consume via useAudioPlayerStatus.
   *
   * Note: useExpoAudioPlayer creates the player instance once; changing
   * initialResolvedSource after mount does NOT recreate the player.
   * To load a different audio source, use the loadAudio action below.
   */
  const player = useExpoAudioPlayer(initialResolvedSource, {
    updateInterval: 250,
  });

  /**
   * Observer subscription: Get the latest playback status emitted by the player.
   * This status object contains playing, isLoaded, isBuffering, duration,
   * currentTime, and other player state. Components re-render reactively when
   * this status changes (at the updateInterval frequency).
   */
  const status = useAudioPlayerStatus(player);

  /**
   * Pure utility function to format seconds as "MM:SS" strings for display.
   * Memoized because it's used in the audioState dependency array below.
   * Handles edge cases: NaN, negative, and very large time values.
   */
  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  /**
   * Derived state computation. This useMemo transforms the low-level player
   * status into a high-level AudioPlayerState that screens consume. All
   * dependencies are listed to ensure this object is only recreated when
   * any underlying value actually changes. This is crucial for preventing
   * unnecessary component re-renders in observers of this state.
   *
   * The progress field (0..1) is derived: currentTime / duration, enabling
   * progress bars and seek indicators without additional state.
   */
  const audioState: AudioPlayerState = useMemo(
    () => ({
      isPlaying: status.playing,
      isLoading: !status.isLoaded || status.isBuffering,
      duration: status.duration,
      position: status.currentTime,
      progress: status.duration > 0 ? status.currentTime / status.duration : 0,
      formattedPosition: formatTime(status.currentTime),
      formattedDuration: formatTime(status.duration),
      error,
      isLooping,
      playbackRate,
    }),
    [status, error, formatTime, isLooping, playbackRate]
  );

  /**
   * Loads a new audio source into the player using player.replace().
   *
   * This action is the primary way to swap out the currently loaded audio
   * without recreating the player. It resolves the source (string URL or
   * require() result), replaces the player's current audio, and resets volume
   * to 1.0. Clears any previous error state.
   *
   * @param source - A string URL or require() result to load
   */
  const loadAudio = useCallback(
    async (source: string | number) => {
      try {
        setError(null);
        const resolved = resolveAudioSource(source);
        if (resolved) {
          player.replace(resolved);
          player.volume = 1.0;
          // Ref Pattern: Mark that we've loaded audio, allowing downstream logic
          // to avoid redundant load attempts
          hasLoadedRef.current = true;
        }
      } catch (err) {
        console.error("Failed to load audio:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load audio";
        setError(errorMessage);
      }
    },
    [player]
  );

  /**
   * Controlled Component actions: These methods give callers direct control
   * over playback state. Each is wrapped in try-catch to gracefully handle
   * cases where the underlying expo-audio player is not available or has
   * encountered an error. All actions depend on [player] to ensure they
   * always reference the current player instance.
   */

  /**
   * Starts playback. Sets volume to 1.0 and unmutes before playing.
   */
  const play = useCallback(async () => {
    try {
      player.volume = 1.0;
      player.muted = false;
      player.play();
    } catch (err) {
      console.warn("Failed to play:", err);
    }
  }, [player]);

  /**
   * Pauses playback without seeking. Playback can resume from the current position.
   */
  const pause = useCallback(async () => {
    try {
      player.pause();
    } catch (err) {
      console.warn("Failed to pause:", err);
    }
  }, [player]);

  /**
   * Stops playback and resets position to 0. This is distinct from pause:
   * the next play() will start from the beginning.
   */
  const stop = useCallback(async () => {
    try {
      player.pause();
      player.seekTo(0);
    } catch (err) {
      console.warn("Failed to stop:", err);
    }
  }, [player]);

  /**
   * Seeks to an absolute position (in seconds). Used for progress bar scrubbing.
   *
   * @param position - Target position in seconds
   */
  const seekTo = useCallback(
    async (position: number) => {
      try {
        player.seekTo(position);
      } catch (err) {
        console.warn("Failed to seek:", err);
      }
    },
    [player]
  );

  /**
   * Sets playback volume (0.0 to 1.0). Values outside this range are clamped.
   *
   * @param volume - Volume level (0 = silent, 1 = full)
   */
  const setVolume = useCallback(
    (volume: number) => {
      try {
        player.volume = Math.max(0, Math.min(1, volume));
      } catch (err) {
        console.warn("Failed to set volume:", err);
      }
    },
    [player]
  );

  /**
   * Enables or disables looping. When true, playback restarts automatically
   * when reaching the end. Updates both the player's loop flag and local state.
   *
   * @param loop - Whether to enable looping
   */
  const setLoop = useCallback(
    (loop: boolean) => {
      try {
        player.loop = loop;
        setIsLooping(loop);
      } catch (err) {
        console.warn("Failed to set loop:", err);
      }
    },
    [player]
  );

  /**
   * Sets playback speed (0.5x to 2.0x). The value is clamped and quantized
   * to 0.1 increments for discrete UI controls (e.g., "1.0x", "1.5x", "2.0x").
   *
   * Uses expo-audio's setPlaybackRate method with 'high' pitch correction to
   * maintain audio quality when changing speed.
   *
   * @param rate - Desired playback rate (clamped to 0.5..2.0)
   */
  const setPlaybackRate = useCallback(
    (rate: number) => {
      try {
        const clampedRate = Math.round(Math.max(0.5, Math.min(2.0, rate)) * 10) / 10;
        // expo-audio uses setPlaybackRate method with optional pitch correction
        player.setPlaybackRate(clampedRate, 'high');
        setPlaybackRateState(clampedRate);
      } catch (err) {
        console.warn("Failed to set playback rate:", err);
      }
    },
    [player]
  );

  /**
   * Skips forward by N seconds (default 15). Bounds the result to [0, duration].
   * Used for fast-forward controls in podcast or long-form content players.
   *
   * @param seconds - Number of seconds to skip forward (default 15)
   */
  const skipForward = useCallback(
    (seconds: number = 15) => {
      try {
        const newPosition = Math.min(status.currentTime + seconds, status.duration);
        player.seekTo(newPosition);
      } catch (err) {
        console.warn("Failed to skip forward:", err);
      }
    },
    [player, status.currentTime, status.duration]
  );

  /**
   * Skips backward by N seconds (default 15). Bounds the result to [0, duration].
   * Used for rewind controls in podcast or long-form content players.
   *
   * @param seconds - Number of seconds to skip backward (default 15)
   */
  const skipBackward = useCallback(
    (seconds: number = 15) => {
      try {
        const newPosition = Math.max(status.currentTime - seconds, 0);
        player.seekTo(newPosition);
      } catch (err) {
        console.warn("Failed to skip backward:", err);
      }
    },
    [player, status.currentTime]
  );

  /**
   * Cleanup/Teardown action. Pauses playback when the component unmounts
   * or when the hook is no longer needed. This is a graceful shutdown that
   * ensures audio doesn't continue playing in the background after the UI
   * that triggered it has been destroyed.
   */
  const cleanup = useCallback(() => {
    try {
      player.pause();
    } catch (err) {
      // Ignore cleanup errors — best-effort shutdown
    }
  }, [player]);

  /**
   * Return value: a complete playback interface combining state and actions.
   *
   * The hook spreads audioState first, so callers can destructure both state
   * properties (isPlaying, duration, etc.) and action methods in a single call:
   *   const { isPlaying, play, pause, seekTo, ...state } = useAudioPlayer(src);
   *
   * The raw player is also exported for advanced use cases, though most callers
   * should use the provided action methods instead.
   */
  return {
    // State
    ...audioState,

    // Actions
    loadAudio,
    play,
    pause,
    stop,
    seekTo,
    setVolume,
    setLoop,
    setPlaybackRate,
    skipForward,
    skipBackward,
    cleanup,

    // Raw player access if needed for advanced cases
    player,
  };
}
