/**
 * ============================================================
 * features/mood/hooks/useTodayMood.ts — Today's check-in query
 * ============================================================
 *
 * Today's mood entry (or null if not yet checked in). Auth-guarded. Used to
 * pre-select the picker and show the "checked in" state.
 * ============================================================
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { getTodayMood } from "../api/moodEntries";

export function useTodayMood() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todayMood", user?.uid],
    queryFn: () => getTodayMood(user!.uid),
    enabled: !!user?.uid,
  });
}
