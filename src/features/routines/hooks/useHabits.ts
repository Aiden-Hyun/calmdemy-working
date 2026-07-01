/**
 * ============================================================
 * features/routines/hooks/useHabits.ts — Habit definition queries/mutations
 * ============================================================
 *
 * React Query wrappers over api/habits.ts. Conventions (§5.4): query keys are
 * [resource, uid, ...args]; queries guard `enabled: !!user?.uid`; mutations
 * invalidate every affected key.
 *
 * NOTE: the habits key is `["habits", uid]` in M1 (single default profile). It
 * gains a profileId segment in M5 when real profiles land.
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  archiveHabit,
  createHabit,
  getHabit,
  listHabits,
  updateHabit,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "../api/habits";

/** All of the current user's habits (archived included; screens filter). */
export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habits", user?.uid],
    queryFn: () => listHabits(user!.uid),
    enabled: !!user?.uid,
  });
}

/** A single habit by id. */
export function useHabit(habitId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit", user?.uid, habitId],
    queryFn: () => getHabit(user!.uid, habitId!),
    enabled: !!user?.uid && !!habitId,
  });
}

/** Create a habit, then refresh the list. */
export function useCreateHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => createHabit(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", user?.uid] });
    },
  });
}

/** Patch a habit, then refresh the list + that habit's detail. */
export function useUpdateHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { habitId: string; patch: UpdateHabitInput }) =>
      updateHabit(user!.uid, input.habitId, input.patch),
    onSuccess: (_r, input) => {
      queryClient.invalidateQueries({ queryKey: ["habits", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["habit", user?.uid, input.habitId] });
    },
  });
}

/** Soft-delete (archive) a habit, then refresh the list. */
export function useArchiveHabit() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => archiveHabit(user!.uid, habitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits", user?.uid] });
    },
  });
}
