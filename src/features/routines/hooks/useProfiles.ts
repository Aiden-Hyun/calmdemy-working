/**
 * ============================================================
 * features/routines/hooks/useProfiles.ts — Profile queries/mutations (feat 7)
 * ============================================================
 *
 * The list query seeds the default profile on first use. Applying a profile
 * only changes which habits Today shows (Today reads the active profile from
 * this query), so mutations invalidate just the profiles key.
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  applyToday,
  createProfile,
  deleteProfile,
  getOrSeedProfiles,
  updateProfile,
  type CreateProfileInput,
  type UpdateProfileInput,
} from "../api/profiles";
import { optimisticList } from "./optimistic";
import type { RoutineProfile } from "../types";

/** All routine profiles (seeds the default on first use). */
export function useProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["routineProfiles", user?.uid],
    queryFn: () => getOrSeedProfiles(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Create — OPTIMISTIC (temp id, inactive). */
export function useCreateProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProfileInput) => createProfile(uid!, input),
    ...optimisticList<RoutineProfile, CreateProfileInput>(
      queryClient,
      ["routineProfiles", uid],
      (list, input) => [
        ...list,
        {
          id: `temp-${Date.now()}`,
          userId: uid ?? "",
          name: input.name.trim(),
          icon: input.icon,
          color: input.color,
          order: input.order ?? Date.now(),
          isActive: false,
          createdAt: Date.now(),
        },
      ]
    ),
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { profileId: string; patch: UpdateProfileInput }) =>
      updateProfile(user!.uid, input.profileId, input.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineProfiles", user?.uid] });
    },
  });
}

/** Delete — OPTIMISTIC (row vanishes instantly). */
export function useDeleteProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => deleteProfile(uid!, profileId),
    ...optimisticList<RoutineProfile, string>(queryClient, ["routineProfiles", uid], (list, profileId) =>
      list.filter((p) => p.id !== profileId)
    ),
  });
}

/** "Apply Today" — swap the active profile. OPTIMISTIC: flips `isActive` in the
 * cache so the active badge (and Today's habit set) update instantly. */
export function useApplyProfile() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => applyToday(uid!, profileId),
    ...optimisticList<RoutineProfile, string>(queryClient, ["routineProfiles", uid], (list, profileId) =>
      list.map((p) => ({ ...p, isActive: p.id === profileId }))
    ),
  });
}
