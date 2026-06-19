/**
 * ============================================================
 * features/journal/hooks/useJournalEntries.ts — Journal read queries
 * ============================================================
 *
 * React Query hooks for the journal feature's server state. Both are
 * user-partitioned and guard on auth (enabled: !!user?.uid) so they don't
 * fetch before sign-in.
 * ============================================================
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { getJournalEntries, getJournalEntryById } from "../api/entries";

/** All of the signed-in user's journal entries, most recent first. */
export function useJournalEntries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["journalEntries", user?.uid],
    queryFn: () => getJournalEntries(user!.uid),
    enabled: !!user?.uid,
  });
}

/** A single journal entry by id (detail screen / deep links). */
export function useJournalEntry(entryId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["journalEntry", user?.uid, entryId],
    queryFn: () => getJournalEntryById(user!.uid, entryId),
    enabled: !!user?.uid && !!entryId,
  });
}
