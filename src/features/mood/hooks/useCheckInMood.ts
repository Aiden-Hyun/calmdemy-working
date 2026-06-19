/**
 * ============================================================
 * features/mood/hooks/useCheckInMood.ts — Check-in mutation
 * ============================================================
 *
 * Records (or replaces) today's mood. Invalidates both today's entry and the
 * history list on success so the UI reflects the new check-in immediately.
 * ============================================================
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { checkInMood } from "../api/moodEntries";
import { MoodValue } from "../types";

export function useCheckInMood() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { value: MoodValue; note?: string }) =>
      checkInMood(user!.uid, input.value, input.note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todayMood", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["moodHistory", user?.uid] });
    },
  });
}
