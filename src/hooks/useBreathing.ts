/**
 * ============================================================
 * useBreathing.ts — Guided Breathing Exercise Hook (State Machine)
 * ============================================================
 *
 * Architectural Role:
 *   This module implements a fully-featured breathing exercise engine
 *   using a State Machine pattern. It drives a sequence of breathing
 *   phases (inhale → hold → exhale → pause), tracks progress through
 *   multiple cycles, and fires callbacks when each cycle completes or
 *   when the entire exercise finishes.
 *
 *   Screens that offer breathing exercises (e.g., "4-7-8 breathing",
 *   "box breathing") consume this hook to orchestrate the timing, phase
 *   transitions, and progress tracking. The hook abstracts away all the
 *   complexity of animation frames, timers, and state transitions.
 *
 * Design Patterns:
 *   - State Machine: Maintains a discrete state (currentPhase) that
 *     transitions through a fixed sequence: idle → inhale → hold →
 *     exhale → pause → [repeat or complete]. Transitions are triggered
 *     by timer callbacks, not external events, creating a deterministic,
 *     time-driven state graph.
 *   - Hooks Composition: Combines useState (for phase, cycle, progress),
 *     useRef (for animation frame and timer bookkeeping), useCallback
 *     (for memoized transitions and action methods), and useEffect
 *     (for effect cleanup).
 *   - Animation Timing: Uses requestAnimationFrame for smooth progress
 *     updates (independent of phase timer duration) and setTimeout for
 *     precise phase transitions. This dual-timer pattern provides both
 *     smooth UI feedback and accurate timing.
 *   - Ref Pattern: Maintains animationFrameRef, intervalRef, and
 *     phaseStartTimeRef to manage async resources (animation frames,
 *     timers) and timestamp-based elapsed time calculations.
 *   - Cleanup/Teardown: The stop() action cancels both the animation
 *     frame and the timer, ensuring no orphaned async tasks continue
 *     after the component unmounts.
 *   - Observer Pattern: onCycleComplete and onComplete callbacks
 *     subscribe the parent (usually a ViewModel or screen) to
 *     exercise-level events.
 *
 * Key Dependencies:
 *   - React Hooks (useState, useEffect, useRef, useCallback)
 *   - BreathingPattern type (defines inhale_duration, exhale_duration,
 *     hold_duration, pause_duration, cycles)
 *
 * Consumed By:
 *   - Breathing exercise screens that guide users through guided breathing
 *   - Screens that display phase progress, time remaining, and instructions
 * ============================================================
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { BreathingPattern } from '../types';

/**
 * Discriminated union of all breathing states. Each represents a distinct
 * phase in the breathing cycle. The state machine transitions through these
 * in a fixed sequence.
 */
type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'pause' | 'idle';

/**
 * Configuration options for the breathing hook.
 */
interface UseBreathingOptions {
  pattern: BreathingPattern;
  onCycleComplete?: () => void;
  onComplete?: () => void;
}

/**
 * Executes a complete guided breathing exercise using a State Machine
 * pattern with time-based phase transitions.
 *
 * This hook manages the breathing cycle: it starts in 'idle', transitions
 * through phases (inhale, hold, exhale, pause) at precise intervals, tracks
 * progress within each phase, counts completed cycles, and fires callbacks
 * when cycles complete or the entire exercise finishes.
 *
 * The hook uses two timing mechanisms:
 * 1. requestAnimationFrame: For smooth progress updates (every ~16ms on 60Hz displays)
 * 2. setTimeout: For precise phase transitions (fires exactly when a phase should end)
 *
 * This decoupling ensures the UI updates smoothly while transitions happen at
 * the exact configured times.
 *
 * @param options - Configuration object with pattern, onCycleComplete, onComplete
 * @returns Object with state properties and control actions
 */
export function useBreathing({ pattern, onCycleComplete, onComplete }: UseBreathingOptions) {
  /**
   * Control flow state: whether the exercise is running, paused, or stopped.
   */
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  /**
   * State Machine: currentPhase is the discrete state that defines what the
   * user is doing right now. Transitions are deterministic and follow the
   * sequence: idle → inhale → hold → exhale → pause → [repeat].
   *
   * Optional phases (hold, pause) are skipped if their durations are 0 or falsy.
   */
  const [currentPhase, setCurrentPhase] = useState<BreathingPhase>('idle');

  /**
   * Smooth progress feedback: phaseProgress is 0..100 (percentage of current
   * phase complete). Updated every animation frame, independent of the phase
   * timer, so the UI feels smooth even on slower devices or with longer phases.
   */
  const [phaseProgress, setPhaseProgress] = useState(0);

  /**
   * Exercise progress: currentCycle tracks how many cycles (complete inhale-
   * hold-exhale-pause sequences) have been finished. Starts at 0, increments
   * every time a cycle boundary is crossed, and triggers onCycleComplete callbacks.
   */
  const [currentCycle, setCurrentCycle] = useState(0);

  /**
   * Countdown display: phaseTimeRemaining (in seconds) is shown to the user
   * so they know how much time is left in the current phase. Updated by the
   * animation frame loop to stay in sync with phaseProgress.
   */
  const [phaseTimeRemaining, setPhaseTimeRemaining] = useState(0);

  /**
   * Ref Pattern: These refs persist across renders without triggering re-renders,
   * allowing us to manage async resources (timers, animation frames) and maintain
   * precise timing information.
   */

  /**
   * Phase transition timer. Holds the setTimeout handle returned by setTimeout.
   * Stored here so we can clearTimeout in cleanup functions.
   */
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Timestamp (Date.now()) when the current phase started. Used to calculate
   * elapsed time within the current phase (now - phaseStartTimeRef.current).
   * This is more precise than relying on the timer duration alone, because it
   * accounts for variation in when callbacks actually fire.
   */
  const phaseStartTimeRef = useRef<number>(0);

  /**
   * Animation frame request ID. Stored so we can cancelAnimationFrame in cleanup.
   */
  const animationFrameRef = useRef<number | null>(null);

  /**
   * Derived computation: total cycle duration is the sum of all phase durations.
   * Used to calculate progress bars and to estimate total exercise time.
   * This is computed every render (not memoized) because if pattern changes,
   * we want the new duration reflected immediately.
   */
  const cycleDuration =
    pattern.inhale_duration +
    (pattern.hold_duration || 0) +
    pattern.exhale_duration +
    (pattern.pause_duration || 0);

  /**
   * Looks up the duration (in seconds) of a given phase.
   * Optional phases (hold, pause) return 0 if not configured.
   * This is used by the animation loop and phase transitions.
   *
   * @param phase - The current breathing phase
   * @returns Duration in seconds
   */
  const getCurrentPhaseDuration = useCallback((phase: BreathingPhase): number => {
    switch (phase) {
      case 'inhale':
        return pattern.inhale_duration;
      case 'hold':
        return pattern.hold_duration || 0;
      case 'exhale':
        return pattern.exhale_duration;
      case 'pause':
        return pattern.pause_duration || 0;
      default:
        return 0;
    }
  }, [pattern]);

  /**
   * State Machine Transition: Determines the next phase given the current phase.
   * This is the transition function of the state machine. The sequence is
   * deterministic and always follows the same cycle:
   *
   *   idle → inhale → [hold?] → exhale → [pause?] → [repeat or complete]
   *
   * Optional phases are skipped: if hold_duration is 0 or falsy, inhale
   * transitions directly to exhale.
   *
   * @param current - The current phase
   * @returns The next phase in the sequence
   */
  const getNextPhase = useCallback((current: BreathingPhase): BreathingPhase => {
    switch (current) {
      case 'inhale':
        return pattern.hold_duration ? 'hold' : 'exhale';
      case 'hold':
        return 'exhale';
      case 'exhale':
        return pattern.pause_duration ? 'pause' : 'inhale';
      case 'pause':
        return 'inhale';
      default:
        return 'inhale';
    }
  }, [pattern]);

  /**
   * Animation Timing: Recursive animation frame loop that updates progress
   * independently of the phase timer.
   *
   * This runs at ~60fps (or the display refresh rate), computing phaseProgress
   * and phaseTimeRemaining from the elapsed time since phaseStartTimeRef.current.
   * This provides smooth visual feedback even if the phase timer is long (e.g.,
   * a 10-second inhale).
   *
   * The function checks isActive and isPaused guards before doing any work,
   * so it automatically stops when the exercise is paused or stopped (because
   * the useEffect cleanup will cancel the animation frame).
   */
  const updateProgress = useCallback(() => {
    if (!isActive || isPaused || currentPhase === 'idle') return;

    const now = Date.now();
    const elapsed = (now - phaseStartTimeRef.current) / 1000;
    const phaseDuration = getCurrentPhaseDuration(currentPhase);

    if (phaseDuration > 0) {
      // Progress as a percentage (0..100) of the current phase
      const progress = Math.min((elapsed / phaseDuration) * 100, 100);
      setPhaseProgress(progress);
      // Time remaining (in seconds) for countdown display
      setPhaseTimeRemaining(Math.max(0, phaseDuration - elapsed));
    }

    // Schedule the next animation frame
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isActive, isPaused, currentPhase, getCurrentPhaseDuration]);

  /**
   * Cleanup/Teardown: Start the animation loop when the exercise is active
   * and not paused. Cancel the animation frame when pausing, stopping, or
   * transitioning to a terminal phase.
   *
   * The dependency array includes updateProgress, which itself depends on
   * [isActive, isPaused, currentPhase, getCurrentPhaseDuration]. This ensures
   * the loop restarts if any of these change — e.g., when the user presses
   * play, or when a phase transition occurs.
   */
  useEffect(() => {
    if (isActive && !isPaused && currentPhase !== 'idle') {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, isPaused, currentPhase, updateProgress]);

  /**
   * State Machine Transition: Advances the state machine to the next phase.
   *
   * This function:
   * 1. Computes the next phase using getNextPhase()
   * 2. Detects cycle boundaries and fires onCycleComplete if a cycle just finished
   * 3. Detects exercise completion if all cycles are done
   * 4. Updates currentPhase and resets progress counters
   * 5. Resets the phase start time so elapsed calculations in updateProgress
   *    are accurate for the new phase
   *
   * The transition happens at the moment a phase's timer expires (via setTimeout).
   * This is called from the useEffect that manages the phase timer below.
   */
  const transitionToNextPhase = useCallback(() => {
    const nextPhase = getNextPhase(currentPhase);

    /**
     * Cycle boundary detection. A cycle is complete when:
     * - We finish an exhale and there's no pause phase (pause_duration is falsy), OR
     * - We finish a pause
     * In both cases, we increment the cycle counter and fire the cycle callback.
     */
    if (currentPhase === 'exhale' && !pattern.pause_duration && currentCycle < pattern.cycles) {
      setCurrentCycle(c => c + 1);
      if (onCycleComplete) onCycleComplete();
    } else if (currentPhase === 'pause' && currentCycle < pattern.cycles) {
      setCurrentCycle(c => c + 1);
      if (onCycleComplete) onCycleComplete();
    }

    /**
     * Exercise completion check. The exercise is complete when:
     * - We've finished >= pattern.cycles - 1 cycles (i.e., we're on or past the last cycle), AND
     * - We're at a cycle boundary (exhale or pause)
     *
     * At this point, we call complete() which fires onComplete and stops the exercise.
     */
    if (currentCycle >= pattern.cycles - 1 &&
        ((currentPhase === 'exhale' && !pattern.pause_duration) || currentPhase === 'pause')) {
      complete();
      return;
    }

    /**
     * Normal phase transition: update the phase, reset progress, and capture
     * the current timestamp as the start of the new phase.
     */
    setCurrentPhase(nextPhase);
    setPhaseProgress(0);
    phaseStartTimeRef.current = Date.now();
  }, [currentPhase, currentCycle, pattern, getNextPhase, onCycleComplete]);

  /**
   * Animation Timing: Phase transition timer. This effect schedules the exact
   * moment when the current phase should end and the next one should begin.
   *
   * There are two cases:
   * 1. Normal phase (duration > 0): Schedule a setTimeout to fire after that duration
   * 2. Zero-duration phase: Call transitionToNextPhase immediately to skip it
   *
   * The dependency array includes transitionToNextPhase, which depends on
   * currentPhase and currentCycle. This means when a phase transition occurs,
   * the entire effect re-runs, scheduling the next timer. The cleanup function
   * clears the previous timeout so we don't have orphaned timers.
   *
   * This is the heartbeat of the state machine: it drives phase transitions at
   * precise intervals.
   */
  useEffect(() => {
    if (isActive && !isPaused && currentPhase !== 'idle') {
      const phaseDuration = getCurrentPhaseDuration(currentPhase);

      if (phaseDuration > 0) {
        intervalRef.current = setTimeout(() => {
          transitionToNextPhase();
        }, phaseDuration * 1000);
      } else {
        // Skip phases with 0 duration (e.g., no hold phase in some patterns)
        transitionToNextPhase();
      }
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isActive, isPaused, currentPhase, getCurrentPhaseDuration, transitionToNextPhase]);

  /**
   * Controlled Component actions: These methods give callers direct control
   * over the state machine.
   */

  /**
   * Starts the breathing exercise from the beginning.
   * Resets all counters and enters the 'inhale' phase.
   */
  const start = useCallback(() => {
    setIsActive(true);
    setIsPaused(false);
    setCurrentPhase('inhale');
    setCurrentCycle(0);
    setPhaseProgress(0);
    phaseStartTimeRef.current = Date.now();
  }, []);

  /**
   * Pauses the exercise in place. The timers and animation frame are
   * cancelled by the useEffect guards (which check isPaused), allowing
   * the user to pause and resume without losing progress.
   */
  const pause = useCallback(() => {
    setIsPaused(true);
  }, []);

  /**
   * Resumes a paused exercise. The tricky part here is adjusting
   * phaseStartTimeRef so that the elapsed time calculation remains accurate.
   * If we just set it to Date.now(), the animation loop would think 0 time
   * has elapsed, resetting the progress bar.
   *
   * Instead, we calculate how much time has already elapsed (phaseProgress
   * as a percentage of the phase duration), and back-calculate a start time
   * that yields the same elapsed time. This preserves the visual state across
   * pause/resume.
   */
  const resume = useCallback(() => {
    setIsPaused(false);
    phaseStartTimeRef.current = Date.now() - (phaseProgress / 100 * getCurrentPhaseDuration(currentPhase) * 1000);
  }, [currentPhase, phaseProgress, getCurrentPhaseDuration]);

  /**
   * Cleanup/Teardown: Stops the exercise completely. This clears all state
   * (currentPhase = 'idle', cycles = 0, progress = 0), cancels both the
   * animation frame and the phase timer, and resets all refs to null.
   *
   * After calling stop(), the exercise is fully at rest with no async tasks
   * running. It's safe to unmount the component or reuse the hook.
   */
  const stop = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setCurrentPhase('idle');
    setPhaseProgress(0);
    setCurrentCycle(0);
    setPhaseTimeRemaining(0);

    // Cancel the phase transition timer
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }

    // Cancel the animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  /**
   * Completes the exercise. This fires the onComplete callback (if provided)
   * and then stops the exercise. Typically called by transitionToNextPhase
   * when the final cycle finishes.
   */
  const complete = useCallback(() => {
    if (onComplete) onComplete();
    stop();
  }, [onComplete, stop]);

  /**
   * Computes the instruction text for the current phase. Used by screens
   * to display "Breathe in", "Hold", etc. to guide the user.
   *
   * @returns Instruction string for the current phase
   */
  const getInstructions = useCallback((): string => {
    switch (currentPhase) {
      case 'inhale':
        return 'Breathe in';
      case 'hold':
        return 'Hold';
      case 'exhale':
        return 'Breathe out';
      case 'pause':
        return 'Pause';
      default:
        return 'Ready to begin';
    }
  }, [currentPhase]);

  /**
   * Return value: a complete interface for controlling and observing the
   * breathing exercise.
   *
   * State properties (read-only):
   * - isActive, isPaused: exercise control state
   * - currentPhase: the current phase in the state machine
   * - phaseProgress: 0..100 percentage through the current phase
   * - currentCycle, totalCycles: progress through the exercise
   * - phaseTimeRemaining: countdown for the current phase (in seconds)
   * - instructions: human-readable prompt for the current phase
   * - cycleDuration: total duration of one breathing cycle (in seconds)
   *
   * Action methods:
   * - start, pause, resume, stop: control the exercise
   *
   * Screens typically destructure these and wire them into buttons and
   * progress displays.
   */
  return {
    isActive,
    isPaused,
    currentPhase,
    phaseProgress,
    currentCycle,
    totalCycles: pattern.cycles,
    phaseTimeRemaining,
    instructions: getInstructions(),
    cycleDuration,
    start,
    pause,
    resume,
    stop,
  };
}
