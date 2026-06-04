/**
 * ============================================================
 * PlaybackTimerContext.tsx — Sleep Timer & Audio Fade-Out Manager
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
 *     isFadingOut) and a published fadeVolume (1 -> 0 during fade-out) via
 *     React Context. The context owns the fade *clock and curve* but never
 *     touches the audio player — it only publishes state.
 *   - Inversion of Control: The player no longer registers callbacks for the
 *     timer to call. Instead, the screen that mounts the player observes
 *     fadeVolume/isFadingOut and applies the volume + pause itself. This keeps
 *     the dependency one-directional (the player reads the context; the
 *     context knows nothing about the player).
 *   - State Machine: Timer transitions through states: inactive ->
 *     countdown -> expiry -> fade-out -> inactive. The terminal fade state
 *     (isFadingOut + fadeVolume 0) is held until the observer finalizes it
 *     via cancelTimer().
 *   - Interval Cleanup: useRef for setInterval IDs ensures cleanup
 *     on unmount (prevents memory leaks).
 *
 * Key Dependencies:
 *   - React hooks: useState, useRef, useCallback, useEffect
 *
 * Consumed By:
 *   Sleep/meditate screens read timer state for UI. TrackPlayerScreen
 *   observes fadeVolume/isFadingOut to fade and pause its own audio.
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
 * @prop fadeVolume - Published volume multiplier (1 normally; ramps 1 -> 0
 *   during fade-out). The observing player mirrors this onto its audio.
 * @prop startTimer - Start a new timer
 * @prop cancelTimer - Cancel active timer (also finalizes a completed fade)
 * @prop extendTimer - Add time to active timer
 */
interface PlaybackTimerContextType {
  // State
  isActive: boolean;
  remainingSeconds: number;
  selectedDuration: number | null; // in seconds
  isFadingOut: boolean;
  fadeVolume: number; // 1 normally; ramps 1 -> 0 while isFadingOut

  // Actions
  startTimer: (durationSeconds: number) => void;
  cancelTimer: () => void;
  extendTimer: (additionalSeconds: number) => void;
}

// --- Context Definition ---
const PlaybackTimerContext = createContext<PlaybackTimerContextType | undefined>(undefined);

/**
 * Provider component for sleep timer and fade-out management.
 *
 * Manages countdown intervals and fade-out interpolation. When the timer
 * expires, smoothly fades audio volume to silence over 10 seconds before
 * pausing playback.
 */
export function PlaybackTimerProvider({ children }: { children: React.ReactNode }) {
  // --- State: Timer Lifecycle ---
  const [isActive, setIsActive] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  // Published volume multiplier the observing player mirrors onto its audio.
  // 1 during normal playback; ramps 1 -> 0 over the fade-out window.
  const [fadeVolume, setFadeVolume] = useState(1);

  // --- Refs: Interval Management ---
  // Stored in refs so we can clear them in cleanup and on cancel.
  // Not in state because we don't need to trigger re-renders when intervals change.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
   * Begin the fade-out: publish a volume multiplier that ramps to silence
   * over 10 seconds, then hold the terminal state for the player to finalize.
   *
   * Implements a smooth fade (not a hard stop) via linear interpolation:
   * fadeVolume = 1 - (step / totalSteps), 100 steps at 100ms = 10 seconds.
   * The context only publishes state — the observing player mirrors fadeVolume
   * onto its audio, pauses when it reaches 0, and calls cancelTimer() to reset.
   */
  const performFadeOut = useCallback(() => {
    setIsFadingOut(true);

    // --- Fade-out Interpolation ---
    // Publish a volume multiplier that ramps linearly from 1.0 to 0 over
    // 10 seconds (100 steps at 100ms each): fadeVolume = 1 - (step / steps).
    // The observing player mirrors fadeVolume onto its audio; the context
    // itself never touches the player.
    const fadeSteps = 100;
    const fadeInterval = 100; // milliseconds between steps
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      setFadeVolume(Math.max(0, 1 - (currentStep / fadeSteps)));

      if (currentStep >= fadeSteps) {
        // --- Fade Complete ---
        // Stop ramping and hold the terminal state (isFadingOut true,
        // fadeVolume 0). The observing player detects fadeVolume === 0,
        // pauses its audio, and calls cancelTimer() to finalize — which
        // restores fadeVolume to 1 and clears the timer. Holding the state
        // here keeps the inversion race-free: the player always observes
        // fadeVolume === 0 before the reset happens.
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
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
    setFadeVolume(1); // start from full published volume, regardless of prior fade

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
    // Restore the published volume to full. The observing player mirrors this,
    // so a fade that was in progress (or just completed) returns the audio to
    // full volume for the next session.
    setFadeVolume(1);

    setIsActive(false);
    setRemainingSeconds(0);
    setSelectedDuration(null);
    setIsFadingOut(false);
  }, []);

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

  return (
    <PlaybackTimerContext.Provider
      value={{
        isActive,
        remainingSeconds,
        selectedDuration,
        isFadingOut,
        fadeVolume,
        startTimer,
        cancelTimer,
        extendTimer,
      }}
    >
      {children}
    </PlaybackTimerContext.Provider>
  );
}

/**
 * Hook to access the sleep timer context.
 *
 * Throws if used outside PlaybackTimerProvider (guard clause).
 * Screens use this to start/cancel timers and read countdown state.
 */
export function usePlaybackTimer() {
  const context = useContext(PlaybackTimerContext);
  if (!context) {
    throw new Error('usePlaybackTimer must be used within a PlaybackTimerProvider');
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
