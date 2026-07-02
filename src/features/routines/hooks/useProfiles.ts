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

/** All routine profiles (seeds the default on first use). */
export function useProfiles() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["routineProfiles", user?.uid],
    queryFn: () => getOrSeedProfiles(user!.uid),
    enabled: !!user?.uid,
  });
}

export function useCreateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProfileInput) => createProfile(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineProfiles", user?.uid] });
    },
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

export function useDeleteProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => deleteProfile(user!.uid, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineProfiles", user?.uid] });
    },
  });
}

/** "Apply Today" — swap the active profile. */
export function useApplyProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => applyToday(user!.uid, profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineProfiles", user?.uid] });
    },
  });
}
