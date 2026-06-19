/**
 * ============================================================
 * features/cbt/hooks/useCbtHistory.ts — CBT read queries
 * ============================================================
 *
 * The user's recent CBT entries (default last 10) and a single-entry lookup for
 * the detail screen / deep links. Both auth-guarded.
 * ============================================================
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { getCbtHistory, getCbtEntryById } from "../api/cbtEntries";

export function useCbtHistory(max = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cbtHistory", user?.uid, max],
    queryFn: () => getCbtHistory(user!.uid, max),
    enabled: !!user?.uid,
  });
}

export function useCbtEntry(entryId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["cbtEntry", user?.uid, entryId],
    queryFn: () => getCbtEntryById(user!.uid, entryId),
    enabled: !!user?.uid && !!entryId,
  });
}
