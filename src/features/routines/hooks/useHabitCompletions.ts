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
import type { CompletionState, HabitCompletion } from "../types";

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
/**
 * Set or clear a habit's state for a day — OPTIMISTIC: the day's completion
 * cache is patched immediately (so the check circle and the Green Light flip
 * without waiting for Firestore), then the write and reconciling refetches run
 * in the background, with rollback on error. `nextState: null` clears (deletes).
 */
export function useToggleCompletion() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      habitId: string;
      profileId: string;
      dateKey: string;
      nextState: CompletionState | null;
    }): Promise<void> => {
      if (input.nextState === null) {
        await clearCompletion(uid!, input.habitId, input.dateKey);
        return;
      }
      await setCompletion(uid!, {
        habitId: input.habitId,
        profileId: input.profileId,
        dateKey: input.dateKey,
        state: input.nextState,
      });
    },
    onMutate: async (input) => {
      const key = ["habitCompletions", uid, input.dateKey];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<HabitCompletion[]>(key);

      queryClient.setQueryData<HabitCompletion[]>(key, (list) => {
        const arr = list ?? [];
        if (input.nextState === null) {
          return arr.filter((c) => c.habitId !== input.habitId);
        }
        const optimistic: HabitCompletion = {
          id: `${input.habitId}_${input.dateKey}`,
          userId: uid ?? "",
          habitId: input.habitId,
          profileId: input.profileId,
          dateKey: input.dateKey,
          state: input.nextState,
          createdAt: Date.now(),
        };
        const idx = arr.findIndex((c) => c.habitId === input.habitId);
        if (idx >= 0) {
          const next = arr.slice();
          next[idx] = optimistic;
          return next;
        }
        return [...arr, optimistic];
      });

      return { key, prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({
        queryKey: ["habitCompletions", uid, input.dateKey],
      });
      // The week query drives the times-per-week quota — refresh it.
      queryClient.invalidateQueries({ queryKey: ["habitCompletionsWeek", uid] });
      // Range queries (streaks/heatmap) overlap this day — refresh them too.
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsRange", uid, input.habitId],
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
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { habitId: string; profileId: string; dateKey: string }) =>
      setCompletion(uid!, {
        habitId: input.habitId,
        profileId: input.profileId,
        dateKey: input.dateKey,
        state: "shielded",
      }),
    onMutate: async (input) => {
      const key = ["habitCompletions", uid, input.dateKey];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<HabitCompletion[]>(key);
      queryClient.setQueryData<HabitCompletion[]>(key, (list) => {
        const arr = list ?? [];
        const optimistic: HabitCompletion = {
          id: `${input.habitId}_${input.dateKey}`,
          userId: uid ?? "",
          habitId: input.habitId,
          profileId: input.profileId,
          dateKey: input.dateKey,
          state: "shielded",
          createdAt: Date.now(),
        };
        const idx = arr.findIndex((c) => c.habitId === input.habitId);
        if (idx >= 0) {
          const next = arr.slice();
          next[idx] = optimistic;
          return next;
        }
        return [...arr, optimistic];
      });
      return { key, prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx) queryClient.setQueryData(ctx.key, ctx.prev);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({
        queryKey: ["habitCompletions", uid, input.dateKey],
      });
      queryClient.invalidateQueries({ queryKey: ["habitCompletionsWeek", uid] });
      queryClient.invalidateQueries({
        queryKey: ["habitCompletionsRange", uid, input.habitId],
      });
    },
  });
}
