/**
 * ============================================================
 * features/cbt/hooks/useCreateCbtEntry.ts — CBT create mutation
 * ============================================================
 *
 * Persists a completed exercise and invalidates the history list on success.
 * ============================================================
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import { createCbtEntry } from "../api/cbtEntries";
import { CbtMethod } from "../types";

export function useCreateCbtEntry() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { method: CbtMethod; steps: Record<string, string> }) =>
      createCbtEntry(user!.uid, input.method, input.steps),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cbtHistory", user?.uid] });
    },
  });
}
