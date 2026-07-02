/**
 * ============================================================
 * features/routines/hooks/useHabitCompletions.ts — Completion queries/mutations
 * ============================================================
 *
 * React Query wrappers over api/completions.ts. The toggle mutation is the one
 * write path for checking a habit done, marking a rest day, or clearing it.
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  clearCompletion,
  getCompletionsForDate,
  getCompletionsForRange,
  getCompletionsRange,
  setCompletion,
} from "../api/completions";
import { todayKey, weekBounds } from "../domain/dateKeys";
import type { CompletionState } from "../types";

/** Every completion recorded today (across all habits). */
export function useTodayCompletions() {
  const { user } = useAuth();
  const dateKey = todayKey();
  return useQuery({
    queryKey: ["habitCompletions", user?.uid, dateKey],
    queryFn: () => getCompletionsForDate(user!.uid, dateKey),
    enabled: !!user?.uid,
  });
}

/** Every completion in the current week (for the times-per-week quota check). */
export function useWeekCompletions() {
  const { user } = useAuth();
  const { start, end } = weekBounds(todayKey());
  return useQuery({
    queryKey: ["habitCompletionsWeek", user?.uid, start],
    queryFn: () => getCompletionsForRange(user!.uid, start, end),
    enabled: !!user?.uid,
  });
}

/** One habit's completions across a date range (for streaks/heatmaps, later). */
export function useCompletionsRange(
  habitId: string | undefined,
  startKey: string,
  endKey: string
) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habitCompletionsRange", user?.uid, habitId, startKey, endKey],
    queryFn: () => getCompletionsRange(user!.uid, habitId!, startKey, endKey),
    enabled: !!user?.uid && !!habitId,
  });
}

/**
 * Set or clear a habit's state for a day. `nextState: null` clears it (deletes
 * the doc); any CompletionState writes it. Invalidates that day's completions.
 */
export function useToggleCompletion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      habitId: string;
      profileId: string;
      dateKey: string;
      nextState: CompletionState | null;
    }): Promise<void> => {
      if (input.nextState === null) {
        await clearCompletion(user!.uid, input.habitId, input.dateKey);
        return;
      }
      await setCompletion(user!.uid, {
        habitId: input.habitId,
        profileId: input.profileId,
        dateKey: input.dateKey,
        state: input.nextState,
      });
    },
    onSuccess: (_r, input) => {
      queryClient.invalidateQueries({
        queryKey: ["habitCompletions", user?.uid, input.dateKey],
      });
      // The week query drives the times-per-week quota — refresh it.
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsWeek", user?.uid],
      });
      // Range queries (streaks/heatmap) overlap this day — refresh them too.
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsRange", user?.uid, input.habitId],
      });
    },
  });
}

/**
 * Spend a shield: write today's completion as `shielded`, preserving the streak
 * across a day the user can't complete. Same invalidations as a toggle.
 */
export function useSpendShield() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { habitId: string; profileId: string; dateKey: string }) =>
      setCompletion(user!.uid, {
        habitId: input.habitId,
        profileId: input.profileId,
        dateKey: input.dateKey,
        state: "shielded",
      }),
    onSuccess: (_r, input) => {
      queryClient.invalidateQueries({
        queryKey: ["habitCompletions", user?.uid, input.dateKey],
      });
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsWeek", user?.uid],
      });
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsRange", user?.uid, input.habitId],
      });
    },
  });
}
