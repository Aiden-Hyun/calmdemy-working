/**
 * ============================================================
 * features/mood/hooks/useMoodHistory.ts — Mood history query
 * ============================================================
 *
 * The user's recent mood entries (default last 14), newest first. Auth-guarded.
 * ============================================================
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { getMoodHistory } from "../api/moodEntries";

export function useMoodHistory(days = 14) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["moodHistory", user?.uid, days],
    queryFn: () => getMoodHistory(user!.uid, days),
    enabled: !!user?.uid,
  });
}
