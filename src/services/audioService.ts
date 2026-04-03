/**
 * ============================================================
 * audioService.ts — Audio Configuration & Legacy Shim (Facade Deprecation)
 * ============================================================
 *
 * Architectural Role:
 *   This module provides low-level audio mode configuration for the entire app
 *   and maintains a deprecated Facade shim for backward compatibility. It is
 *   intentionally minimal — the actual audio playback lifecycle (loading, playing,
 *   seeking, volume) has been migrated to the useAudioPlayer hook and should
 *   never be implemented here.
 *
 * Design Patterns:
 *   - Facade (Deprecated): The audioService object is a legacy Facade that once
 *     wrapped expo-audio's singleton. New code should ignore it entirely and use
 *     the useAudioPlayer hook instead. It is kept here only to prevent runtime
 *     errors in code that has not yet been refactored.
 *   - Initialization: configureAudioMode() is called once during app startup
 *     (likely in a Root component useEffect) to establish platform-wide audio
 *     behavior before any playback occurs.
 *
 * Key Dependencies:
 *   - expo-audio (native platform audio APIs)
 *
 * Consumed By:
 *   - App root component: calls configureAudioMode() once at startup
 *   - useAudioPlayer hook: the primary modern API for all audio playback logic
 *   - Deprecated legacy screens: may still reference audioService, but should
 *     be migrated to useAudioPlayer
 *
 * Migration Notes:
 *   If you encounter code calling audioService.play(), audioService.pause(),
 *   etc., refactor that screen to use useAudioPlayer instead. The audioService
 *   Facade is purely a compatibility shim and logs a warning when invoked.
 * ============================================================
 */

import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

export interface AudioState {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  error: string | null;
}

/**
 * Configure global audio behavior for the entire app.
 *
 * This function is called exactly once during app startup (in the Root component
 * or similar initialization point) to establish platform-level audio policies
 * before any content is played. The settings apply to all subsequent playback.
 *
 * Configuration breakdown:
 *   - playsInSilentMode: true — Audio continues playing even if the device
 *     is in silent/mute mode. This is essential for a meditation app where users
 *     expect audio to play even with the physical mute switch on.
 *   - shouldPlayInBackground: true — Meditation sessions and soundscapes continue
 *     playing when the app is backgrounded (user switches away). Critical for
 *     real-world usage (e.g., locking the phone while meditating).
 *   - shouldRouteThroughEarpiece: false — Audio is routed through the speaker
 *     (or user's selected audio device) rather than the small earpiece
 *     microphone channel. Ensures high-fidelity playback.
 *   - interruptionMode: 'doNotMix' — If another app starts playing audio
 *     (e.g., a phone call, a notification sound), Calmdemy's audio is paused.
 *     This is respectful to the user and to other apps.
 *
 * Errors are logged but do not throw. If audio mode configuration fails,
 * the app continues anyway — graceful degradation.
 *
 * @internal Called once by the app's root component during initialization.
 */
export async function configureAudioMode(): Promise<void> {
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
      // 'doNotMix' ensures audio pauses when other apps play audio
      interruptionMode: 'doNotMix',
    });
  } catch (error) {
    console.warn('Failed to configure audio mode:', error);
  }
}

/**
 * Enable or disable audio playback globally across the app.
 *
 * This low-level function tells the native audio system to activate or
 * deactivate audio mixing. It may be called during app initialization or
 * when transitioning between audio-enabled and audio-disabled states
 * (though Calmdemy typically keeps audio enabled once the app starts).
 *
 * Errors are non-fatal and logged as warnings.
 *
 * @param active - true to enable audio, false to disable it globally.
 */
export async function setAudioActive(active: boolean): Promise<void> {
  try {
    await setIsAudioActiveAsync(active);
  } catch (error) {
    console.warn('Failed to set audio active state:', error);
  }
}

/**
 * --- DEPRECATED SHIM FOR BACKWARD COMPATIBILITY ---
 *
 * The audioService object is a legacy Facade that is no longer the primary
 * API for audio playback. All playback logic has been migrated to the
 * useAudioPlayer React hook, which provides a modern, composable interface
 * via Hooks rather than a singleton pattern.
 *
 * This object is kept here to prevent runtime errors in code that has not yet
 * been refactored. Each method is a no-op (except loadAudio, which logs a
 * warning) and provides backward-compatible type signatures.
 *
 * MIGRATION: If you encounter code calling audioService.play(), .pause(),
 * .seekTo(), etc., immediately refactor that code to use useAudioPlayer
 * from '../hooks/useAudioPlayer' instead. The hook provides:
 *   - const { play, pause, stop, seekTo, setVolume, ... } = useAudioPlayer()
 *   - Proper cleanup and lifecycle management
 *   - No singleton singleton side effects
 *   - Per-component state isolation
 *
 * This deprecated Facade will be removed in a future major version.
 */
export const audioService = {
  setUpdateCallback: () => {},
  loadAudio: async () => { console.warn('Use useAudioPlayer hook instead'); },
  play: async () => {},
  pause: async () => {},
  stop: async () => {},
  seekTo: async () => {},
  setVolume: async () => {},
  unloadAudio: async () => {},
  getCurrentState: (): AudioState => ({
    isPlaying: false,
    isLoading: false,
    duration: 0,
    position: 0,
    error: null,
  }),
};
