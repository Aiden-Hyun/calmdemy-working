import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSession } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { MeditationSession } from '../types';

/**
 * ============================================================
 * useMeditation.ts — Meditation Session Timer (State Machine + Lifecycle)
 * ============================================================
 *
 * Architectural Role:
 *   This custom hook encapsulates the complete lifecycle of a meditation
 *   session — initialization, playback controls (start/pause/resume/stop),
 *   timer management, app lifecycle integration, and persistence to Firestore.
 *   It is a ViewModel-level hook consumed by meditation playback screens.
 *
 * Design Patterns:
 *   - State Machine: The hook manages four distinct states (isActive, isPaused)
 *     that form a simple state machine: Stopped → Active → Paused → Active → Complete
 *   - Subscription Management (Observer): Listens to React Native's AppState
 *     lifecycle events to handle background/foreground transitions gracefully
 *   - Cleanup/Teardown: Properly cleans up intervals and event subscriptions
 *     to prevent memory leaks and stale closures
 *   - Optimistic Update: Persists completed sessions to Firestore immediately
 *     after completion; errors are logged but don't interrupt the UX
 *   - Hooks Composition: Uses useRef to maintain mutable state (timing data)
 *     alongside useState for reactive state, creating a hybrid approach
 *
 * Key Responsibilities:
 *   1. Countdown timer logic (1-second ticks)
 *   2. Pause/resume with elapsed-time correction
 *   3. App lifecycle handling (user backgrounds app mid-session)
 *   4. Progress calculation (0-100%)
 *   5. Session persistence to Firestore on completion
 * ============================================================
 */

interface UseMeditationOptions {
  duration: number; // in minutes
  sessionType: 'meditation' | 'breathing' | 'nature_sound' | 'bedtime_story';
  onComplete?: (sessionId: string) => void;
}

/**
 * useMeditation — Manages a meditation session's complete lifecycle.
 *
 * This hook exposes both state (isActive, isPaused, timeRemaining, progress)
 * and control methods (start, pause, resume, stop, complete) so a screen can
 * render the timer UI and wire up playback controls.
 *
 * Internal State:
 *   - isActive: Whether the session is currently running (true) or stopped (false)
 *   - isPaused: Whether playback is paused (only meaningful when isActive is true)
 *   - timeRemaining: Seconds left in the session
 *   - progress: 0-100, used for progress bars
 *
 * Refs (Non-Reactive Mutable State):
 *   - intervalRef: Holds the setInterval ID for the timer tick
 *   - startTimeRef: Stores the timestamp when the session started (for elapsed calculation)
 *   - pausedTimeRef: Stores the timestamp when pause began (for resume correction)
 *   - appStateRef: Caches the current app lifecycle state to detect foreground/background transitions
 *
 * @returns Object containing state + control methods
 */
export function useMeditation({ duration, sessionType, onComplete }: UseMeditationOptions) {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // Convert to seconds
  const [progress, setProgress] = useState(0);

  // --- Mutable state (refs): Not reactive, used for timing calculations ---
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * --- App Lifecycle Integration (Observer Pattern) ---
   *
   * When the user backgrounds the app (switches to another app), the timer
   * should pause but resume when they return to the meditation screen.
   * This effect subscribes to AppState lifecycle events and accounts for
   * wall-clock time elapsed while backgrounded.
   *
   * Behavior:
   *   - If app is backgrounded while timer is running: record the timestamp
   *   - If app returns to foreground: calculate elapsed wall-clock time,
   *     subtract from timeRemaining, and trigger completion if time expired
   *
   * This prevents the timer from "cheating" — if a session has 30 seconds
   * left and the user backgrounds for 60 seconds, the session should complete
   * when they return.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isActive &&
        !isPaused
      ) {
        // App came to foreground while timer was running:
        // Calculate actual elapsed time and update timeRemaining
        const elapsedWhileInBackground = Date.now() - pausedTimeRef.current;
        const newTimeRemaining = Math.max(0, timeRemaining - Math.floor(elapsedWhileInBackground / 1000));
        setTimeRemaining(newTimeRemaining);

        // If session should have completed in the background, complete immediately
        if (newTimeRemaining === 0) {
          complete();
        }
      } else if (nextAppState.match(/inactive|background/) && isActive && !isPaused) {
        // App going to background while timer is running:
        // Record the timestamp so we can calculate elapsed time on resume
        pausedTimeRef.current = Date.now();
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isActive, isPaused, timeRemaining]);

  /**
   * --- Core Timer Logic ---
   *
   * Drives the 1-second countdown. This is the "heartbeat" of the session:
   * each tick decrements timeRemaining by 1 second and updates progress.
   *
   * Gatekeeper Pattern: The interval only runs when isActive && !isPaused.
   * Any other state (stopped or paused) immediately clears the interval to
   * avoid wasted CPU and stale closures.
   *
   * Cleanup/Teardown: Always clears the interval in the cleanup function
   * to prevent memory leaks if the component unmounts or dependencies change.
   */
  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
      // Start the timer: tick once per second
      intervalRef.current = setInterval(() => {
        setTimeRemaining((time) => {
          const newTime = Math.max(0, time - 1);
          const totalSeconds = duration * 60;
          const elapsed = totalSeconds - newTime;
          // Calculate progress as a percentage (0-100)
          setProgress((elapsed / totalSeconds) * 100);

          // Auto-complete when timer reaches zero
          if (newTime === 0) {
            complete();
          }

          return newTime;
        });
      }, 1000);
    } else {
      // If not active or paused, clear the interval (Gatekeeper)
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup: always clear the interval when the effect re-runs or unmounts
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeRemaining, duration]);

  /**
   * start — Begin the meditation session.
   *
   * Transitions from "Stopped" state to "Active" state. Records the current
   * timestamp for elapsed-time calculations (used during pause/resume cycles).
   */
  const start = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
  }, []);

  /**
   * pause — Pause the meditation session.
   *
   * Stops the countdown (isActive remains true, but isPaused becomes true).
   * Records the pause timestamp for resume correction.
   */
  const pause = useCallback(() => {
    setIsPaused(true);
    pausedTimeRef.current = Date.now();
  }, []);

  /**
   * resume — Resume a paused meditation session.
   *
   * Resumes the countdown. Corrects the startTimeRef to account for the
   * duration the session was paused, so elapsed-time calculations remain
   * consistent across pause/resume cycles.
   */
  const resume = useCallback(() => {
    setIsPaused(false);
    const pauseDuration = Date.now() - pausedTimeRef.current;
    startTimeRef.current += pauseDuration;
  }, []);

  /**
   * stop — Stop and reset the meditation session.
   *
   * Transitions to "Stopped" state, clears the timer interval, and resets
   * all reactive state (timeRemaining, progress). Does not persist data;
   * use this for user-initiated cancellations.
   */
  const stop = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setTimeRemaining(duration * 60);
    setProgress(0);
    // Cleanup/Teardown: ensure the interval is cleared
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [duration]);

  /**
   * complete — Mark the session as complete and persist to Firestore.
   *
   * This method is called when the timer reaches zero (auto-complete) or
   * when the user manually completes the session. It:
   *
   *   1. Calculates actual duration (requested - remaining)
   *   2. Persists the session to Firestore via Repository (firestoreService)
   *   3. Calls the optional onComplete callback with the session ID
   *   4. Resets state via stop()
   *
   * Error Recovery: If Firestore persistence fails, the error is logged but
   * the local state is still reset. This is a graceful degradation — the
   * session completed locally even if persistence failed; the user can retry
   * or the failure is captured in server logs for debugging.
   */
  const complete = useCallback(async () => {
    if (!user) return;

    // Calculate actual duration completed (rounded up to nearest minute)
    const actualDuration = Math.ceil((duration * 60 - timeRemaining) / 60);

    try {
      // Optimistic Update + Persistence: save to Firestore immediately
      const sessionId = await createSession({
        user_id: user.uid,
        duration_minutes: actualDuration,
        session_type: sessionType,
      });

      // Notify the consumer (screen) that completion is done
      if (onComplete) {
        onComplete(sessionId);
      }
    } catch (error) {
      // Error Recovery: log the error but continue with state reset
      console.error('Failed to save meditation session:', error);
    }

    // Always reset state, regardless of persistence outcome
    stop();
  }, [user, duration, timeRemaining, sessionType, onComplete, stop]);

  /**
   * formatTime — Convert seconds to MM:SS display format.
   *
   * Pure utility function, memoized with useCallback to maintain referential
   * stability if this function is passed as a dependency to other hooks.
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // --- Reactive State ---
    isActive,
    isPaused,
    timeRemaining,
    progress,
    formattedTime: formatTime(timeRemaining),
    // --- Control Methods ---
    start,
    pause,
    resume,
    stop,
    complete,
  };
}
