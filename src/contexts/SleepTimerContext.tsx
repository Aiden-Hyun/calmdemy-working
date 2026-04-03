/**
 * ============================================================
 * SleepTimerContext.tsx — Sleep Timer & Audio Fade-Out Manager
 * ============================================================
 *
 * Architectural Role:
 *   This module manages the sleep timer lifecycle and coordinates
 *   audio fade-out with playback. When the timer expires, audio
 *   gracefully fades to silence over 10 seconds before stopping,
 *   providing a smooth, non-jarring end to meditation sessions.
 *
 * Design Patterns:
 *   - Provider Pattern: Exposes timer state (isActive, remainingSeconds,
 *     isFadingOut) and control actions via React Context.
 *   - Observer/Callback Pattern: Audio player registers itself via
 *     registerAudioPlayer() so the timer can control its volume/pause.
 *     This allows loose coupling — timer doesn't import MediaPlayer.
 *   - State Machine: Timer transitions through states: inactive ->
 *     countdown -> expiry -> fade-out -> inactive.
 *   - Interval Cleanup: useRef for setInterval IDs ensures cleanup
 *     on unmount (prevents memory leaks).
 *
 * Key Dependencies:
 *   - React hooks: useState, useRef, useCallback, useEffect
 *   - MediaPlayer: Registers audio control methods
 *
 * Consumed By:
 *   Sleep/meditate screens read timer state for UI. MediaPlayer
 *   component registers itself for volume control during fade-out.
 * ============================================================
 */

import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

/**
 * Sleep timer context type.
 *
 * @prop isActive - Timer is running
 * @prop remainingSeconds - Seconds until timer fires
 * @prop selectedDuration - Original duration in seconds (for UI display)
 * @prop isFadingOut - Timer expired, audio is fading out
 * @prop startTimer - Start a new timer
 * @prop cancelTimer - Cancel active timer
 * @prop extendTimer - Add time to active timer
 * @prop registerAudioPlayer - Audio component calls this to register volume control
 * @prop unregisterAudioPlayer - Audio component calls on cleanup
 */
interface SleepTimerContextType {
  // State
  isActive: boolean;
  remainingSeconds: number;
  selectedDuration: number | null; // in seconds
  isFadingOut: boolean;
  
  // Actions
  startTimer: (durationSeconds: number) => void;
  cancelTimer: () => void;
  extendTimer: (additionalSeconds: number) => void;
  
  // For fade-out effect - called by MediaPlayer
  registerAudioPlayer: (player: { setVolume: (volume: number) => void; pause: () => void }) => void;
  unregisterAudioPlayer: () => void;
}

// --- Context Definition ---
const SleepTimerContext = createContext<SleepTimerContextType | undefined>(undefined);

/**
 * Provider component for sleep timer and fade-out management.
 *
 * Manages countdown intervals and fade-out interpolation. When the timer
 * expires, smoothly fades audio volume to silence over 10 seconds before
 * pausing playback.
 */
export function SleepTimerProvider({ children }: { children: React.ReactNode }) {
  // --- State: Timer Lifecycle ---
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // --- Refs: Interval Management ---
  // Stored in refs so we can clear them in cleanup and on cancel.
  // Not in state because we don't need to trigger re-renders when intervals change.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<{ setVolume: (volume: number) => void; pause: () => void } | null>(null);
  const originalVolumeRef = useRef(1.0);

  /**
   * Cleanup effect: clear intervals on unmount.
   *
   * Prevents memory leaks and ensures the intervals don't try to setState
   * after the component unmounts. This is a standard React effect pattern
   * for subscription/timer cleanup.
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
    };
  }, []);

  /**
   * Fade out audio volume over 10 seconds, then pause playback.
   *
   * This implements a smooth volume fade-out (not a hard stop) using
   * linear interpolation: volume = 1 - (step / totalSteps).
   * Runs 100 steps at 100ms intervals = 10 seconds total.
   * After fade completes, restores original volume for next playback
   * and pauses the audio.
   */
  const performFadeOut = useCallback(() => {
    if (!audioPlayerRef.current) {
      // No audio player registered, just stop the timer
      setIsActive(false);
      setRemainingSeconds(0);
      setSelectedDuration(null);
      return;
    }

    setIsFadingOut(true);

    // --- Fade-out Interpolation ---
    // Volume fades linearly from 1.0 to 0 over 10 seconds (100 steps at 100ms each).
    // Formula: newVolume = 1 - (currentStep / totalSteps)
    // This creates a smooth, exponential-like fade that sounds natural.
    const fadeSteps = 100;
    const fadeInterval = 100; // milliseconds between steps
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(0, 1 - (currentStep / fadeSteps));

      if (audioPlayerRef.current) {
        audioPlayerRef.current.setVolume(newVolume);
      }

      if (currentStep >= fadeSteps) {
        // --- Fade Complete: Cleanup ---
        // Clear the fade interval to prevent further updates.
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }

        if (audioPlayerRef.current) {
          // Stop playback and restore volume for the next session
          audioPlayerRef.current.pause();
          audioPlayerRef.current.setVolume(originalVolumeRef.current);
        }

        // Reset timer state
        setIsFadingOut(false);
        setIsActive(false);
        setRemainingSeconds(0);
        setSelectedDuration(null);
      }
    }, fadeInterval);
  }, []);

  /**
   * Start a new sleep timer with the given duration.
   *
   * Cancels any existing timer/fade-out first (idempotent).
   * Decrements remainingSeconds every second. When it reaches 0,
   * calls performFadeOut() to begin the fade-out sequence.
   *
   * @param durationSeconds - Timer duration in seconds
   */
  const startTimer = useCallback((durationSeconds: number) => {
    // --- Clear Existing Timer ---
    // If user starts a new timer while one is running, clean up the old one first.
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    setSelectedDuration(durationSeconds);
    setRemainingSeconds(durationSeconds);
    setIsActive(true);
    setIsFadingOut(false);

    // --- Countdown Interval ---
    // Decrement every 1 second. When remainingSeconds hits 0, trigger fade-out.
    intervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Timer expired: clear countdown interval and start fade-out
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          performFadeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [performFadeOut]);

  /**
   * Cancel the active timer and fade-out sequence.
   *
   * Restores volume to original if fade-out was in progress.
   * Clears all intervals and resets state.
   */
  const cancelTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // --- Graceful State Recovery ---
    // If fade-out was in progress, restore volume to original before clearing.
    if (isFadingOut && audioPlayerRef.current) {
      audioPlayerRef.current.setVolume(originalVolumeRef.current);
    }

    setIsActive(false);
    setRemainingSeconds(0);
    setSelectedDuration(null);
    setIsFadingOut(false);
  }, [isFadingOut]);

  /**
   * Extend the active timer by additional seconds.
   *
   * Only works if a timer is currently active. Updates both
   * remainingSeconds and selectedDuration so the UI displays correctly.
   *
   * @param additionalSeconds - Seconds to add
   */
  const extendTimer = useCallback((additionalSeconds: number) => {
    if (isActive) {
      setRemainingSeconds((prev) => prev + additionalSeconds);
      setSelectedDuration((prev) => (prev || 0) + additionalSeconds);
    }
  }, [isActive]);

  /**
   * Register an audio player for fade-out control.
   *
   * Called by MediaPlayer or audio component to allow the timer
   * to control volume during fade-out. Implements the Callback/Observer
   * pattern — loose coupling between timer and audio player.
   */
  const registerAudioPlayer = useCallback((player: { setVolume: (volume: number) => void; pause: () => void }) => {
    audioPlayerRef.current = player;
  }, []);

  /**
   * Unregister the audio player (cleanup on unmount).
   */
  const unregisterAudioPlayer = useCallback(() => {
    audioPlayerRef.current = null;
  }, []);

  return (
    <SleepTimerContext.Provider
      value={{
        isActive,
        remainingSeconds,
        selectedDuration,
        isFadingOut,
        startTimer,
        cancelTimer,
        extendTimer,
        registerAudioPlayer,
        unregisterAudioPlayer,
      }}
    >
      {children}
    </SleepTimerContext.Provider>
  );
}

/**
 * Hook to access the sleep timer context.
 *
 * Throws if used outside SleepTimerProvider (guard clause).
 * Screens use this to start/cancel timers and read countdown state.
 */
export function useSleepTimer() {
  const context = useContext(SleepTimerContext);
  if (!context) {
    throw new Error('useSleepTimer must be used within a SleepTimerProvider');
  }
  return context;
}

/**
 * Format seconds to MM:SS display string.
 *
 * Utility for timer UI. Pads seconds to 2 digits: 125s -> "2:05".
 *
 * @param seconds - Duration in seconds
 * @returns Formatted string "MM:SS"
 */
export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
