/**
 * ============================================================
 * features/routines/hooks/useTrackers.ts — Tracker queries/mutations (feat 10)
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  createTracker,
  deleteTracker,
  listTrackers,
  listTrackerEntries,
  logTrackerValue,
  type CreateTrackerInput,
} from "../api/trackers";
import { optimisticList } from "./optimistic";
import type { NumericTracker, TrackerEntry } from "../types";

/** All of the user's trackers. */
export function useTrackers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trackers", user?.uid],
    queryFn: () => listTrackers(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Recent entries for one tracker (newest first). */
export function useTrackerEntries(trackerId: string | undefined, max = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trackerEntries", user?.uid, trackerId, max],
    queryFn: () => listTrackerEntries(user!.uid, trackerId!, max),
    enabled: !!user?.uid && !!trackerId,
  });
}

/** Create — OPTIMISTIC (temp id, reconciled on refetch). */
export function useCreateTracker() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTrackerInput) => createTracker(uid!, input),
    ...optimisticList<NumericTracker, CreateTrackerInput>(
      queryClient,
      ["trackers", uid],
      (list, input) => [
        ...list,
        {
          id: `temp-${Date.now()}`,
          userId: uid ?? "",
          name: input.name.trim(),
          unit: input.unit.trim(),
          kind: input.kind,
          icon: input.icon,
          color: input.color,
          goalValue: input.goalValue,
          order: Date.now(),
          createdAt: Date.now(),
        },
      ]
    ),
  });
}

/** Delete — OPTIMISTIC (row vanishes instantly). */
export function useDeleteTracker() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (trackerId: string) => deleteTracker(uid!, trackerId),
    ...optimisticList<NumericTracker, string>(queryClient, ["trackers", uid], (list, trackerId) =>
      list.filter((t) => t.id !== trackerId)
    ),
  });
}

/** Log a value — OPTIMISTIC: upsert today's entry across cached ranges so the
 * chart + latest value update instantly. */
export function useLogTrackerValue() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { trackerId: string; dateKey: string; value: number }) =>
      logTrackerValue(uid!, input.trackerId, input.dateKey, input.value),
    onMutate: async (input) => {
      const filter = { queryKey: ["trackerEntries", uid, input.trackerId] };
      await queryClient.cancelQueries(filter);
      const prev = queryClient.getQueriesData<TrackerEntry[]>(filter);
      queryClient.setQueriesData<TrackerEntry[]>(filter, (list) => {
        const arr = list ?? [];
        const entry: TrackerEntry = {
          id: input.dateKey,
          userId: uid ?? "",
          trackerId: input.trackerId,
          dateKey: input.dateKey,
          value: input.value,
          createdAt: Date.now(),
        };
        const idx = arr.findIndex((e) => e.dateKey === input.dateKey);
        if (idx >= 0) {
          const next = arr.slice();
          next[idx] = entry;
          return next;
        }
        return [entry, ...arr];
      });
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      ctx?.prev.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: ["trackerEntries", uid, input.trackerId] });
    },
  });
}
