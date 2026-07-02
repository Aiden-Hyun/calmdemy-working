/**
 * ============================================================
 * features/routines/hooks/useGoalTags.ts — Goal-tag queries/mutations (feat 22)
 * ============================================================
 *
 * The list query seeds the defaults on first use (getOrSeedGoalTags), so a new
 * user always has a starter set.
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  createGoalTag,
  deleteGoalTag,
  getOrSeedGoalTags,
  updateGoalTag,
  type CreateGoalTagInput,
  type UpdateGoalTagInput,
} from "../api/goalTags";
import { optimisticList } from "./optimistic";
import type { GoalTag } from "../types";

/** All of the user's goal tags (seeds defaults on first use). */
export function useGoalTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goalTags", user?.uid],
    queryFn: () => getOrSeedGoalTags(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Create — OPTIMISTIC (temp id chip appears instantly; `mutateAsync` still
 * resolves to the real id for the editor to select). */
export function useCreateGoalTag() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalTagInput) => createGoalTag(uid!, input),
    ...optimisticList<GoalTag, CreateGoalTagInput>(queryClient, ["goalTags", uid], (list, input) => [
      ...list,
      {
        id: `temp-${Date.now()}`,
        userId: uid ?? "",
        label: input.label.trim(),
        icon: input.icon,
        color: input.color,
        order: input.order ?? Date.now(),
        createdAt: Date.now(),
      },
    ]),
  });
}

export function useUpdateGoalTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { tagId: string; patch: UpdateGoalTagInput }) =>
      updateGoalTag(user!.uid, input.tagId, input.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goalTags", user?.uid] });
    },
  });
}

export function useDeleteGoalTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tagId: string) => deleteGoalTag(user!.uid, tagId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goalTags", user?.uid] });
    },
  });
}
