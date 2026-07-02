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
  DEFAULT_PROFILE_ID,
  type CreateHabitInput,
  type UpdateHabitInput,
} from "../api/habits";
import { optimisticList } from "./optimistic";
import type { Habit } from "../types";

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

/** Create — OPTIMISTIC: the habit appears on Today immediately (temp id). */
export function useCreateHabit() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateHabitInput) => createHabit(uid!, input),
    ...optimisticList<Habit, CreateHabitInput>(queryClient, ["habits", uid], (list, input) => [
      ...list,
      {
        id: `temp-${Date.now()}`,
        userId: uid ?? "",
        profileId: input.profileId ?? DEFAULT_PROFILE_ID,
        name: input.name.trim(),
        icon: input.icon,
        color: input.color,
        moment: input.moment,
        scheduledTime: input.scheduledTime,
        repeat: input.repeat,
        difficulty: input.difficulty ?? "plus",
        priority: input.priority ?? 2,
        goalTagIds: input.goalTagIds ?? [],
        shieldsMax: input.shieldsMax ?? 0,
        order: Date.now(),
        createdAt: Date.now(),
      },
    ]),
  });
}

/** Patch — OPTIMISTIC: updates both the list and the detail caches instantly. */
export function useUpdateHabit() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { habitId: string; patch: UpdateHabitInput }) =>
      updateHabit(uid!, input.habitId, input.patch),
    onMutate: async (input) => {
      const listKey = ["habits", uid];
      const detailKey = ["habit", uid, input.habitId];
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({ queryKey: detailKey });
      const prevList = queryClient.getQueryData<Habit[]>(listKey);
      const prevDetail = queryClient.getQueryData<Habit | null>(detailKey);
      queryClient.setQueryData<Habit[]>(listKey, (list) =>
        list?.map((h) => (h.id === input.habitId ? { ...h, ...input.patch } : h))
      );
      queryClient.setQueryData<Habit | null>(detailKey, (h) => (h ? { ...h, ...input.patch } : h));
      return { listKey, detailKey, prevList, prevDetail };
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(ctx.listKey, ctx.prevList);
      queryClient.setQueryData(ctx.detailKey, ctx.prevDetail);
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["habits", uid] });
      queryClient.invalidateQueries({ queryKey: ["habit", uid, input.habitId] });
    },
  });
}

/** Archive (soft-delete) — OPTIMISTIC: sets `archivedAt` so Today drops it now. */
export function useArchiveHabit() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => archiveHabit(uid!, habitId),
    ...optimisticList<Habit, string>(queryClient, ["habits", uid], (list, habitId) =>
      list.map((h) => (h.id === habitId ? { ...h, archivedAt: Date.now() } : h))
    ),
  });
}
