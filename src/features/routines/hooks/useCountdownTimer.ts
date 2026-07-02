/**
 * ============================================================
 * features/routines/hooks/useCountdownTimer.ts — Countdown w/ overtime (feat 13)
 * ============================================================
 *
 * Ticks down once per second while running. `remaining` goes negative past
 * zero (overtime) so the timer keeps counting until the user stops it. No
 * persistence — a focus aid, not a scheduled task.
 * ============================================================
 */

import { useEffect, useRef, useState } from "react";

export function useCountdownTimer(initialSeconds: number) {
  const [duration, setDuration] = useState(initialSeconds);
  const [remaining, setRemaining] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setRemaining((r) => r - 1), 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = (seconds: number = duration) => {
    setRunning(false);
    setDuration(seconds);
    setRemaining(seconds);
  };

  return {
    remaining,
    running,
    isOvertime: remaining < 0,
    duration,
    start,
    pause,
    reset,
  };
}
