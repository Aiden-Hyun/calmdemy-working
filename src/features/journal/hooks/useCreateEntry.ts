/**
 * ============================================================
 * features/journal/hooks/useCreateEntry.ts — Journal create mutation
 * ============================================================
 *
 * Wraps createJournalEntry in a React Query mutation and invalidates the
 * entries list on success so the home screen reflects the new entry without a
 * manual refetch.
 * ============================================================
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { createJournalEntry } from "../api/entries";

/** Create a journal entry; invalidates the user's entries list on success. */
export function useCreateEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; promptId?: string }) =>
      createJournalEntry(user!.uid, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journalEntries", user?.uid] });
    },
  });
}
