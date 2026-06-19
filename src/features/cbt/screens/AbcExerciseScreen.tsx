/**
 * features/cbt/screens/AbcExerciseScreen.tsx — A-B-C guided flow.
 *
 * Activating event → Belief → Consequence → distortions → balanced thought.
 * Thin wrapper that hands the A-B-C flow definition to the shared StepFlow and
 * persists on the final Save.
 */

import React from "react";
import { useRouter } from "expo-router";
import { StepFlow } from "../components/StepFlow";
import { cbtFlows, getCbtMethod } from "../data/methods";
import { useCreateCbtEntry } from "../hooks/useCreateCbtEntry";

export function AbcExerciseScreen() {
  const router = useRouter();
  const createEntry = useCreateCbtEntry();
  const method = getCbtMethod("abc");

  return (
    <StepFlow
      headerTitle={method?.label ?? "A-B-C"}
      accent={method?.color ?? "#C4A77D"}
      steps={cbtFlows.abc ?? []}
      saving={createEntry.isPending}
      onSave={(values) =>
        createEntry.mutate(
          { method: "abc", steps: values },
          { onSuccess: () => router.back() }
        )
      }
    />
  );
}
