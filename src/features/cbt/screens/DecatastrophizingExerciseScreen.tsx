/**
 * features/cbt/screens/DecatastrophizingExerciseScreen.tsx — Decatastrophizing.
 *
 * Worry → worst case → likelihood (slider) → what would actually happen → how
 * you'd cope → a more realistic scenario. Thin wrapper over the shared StepFlow.
 */

import React from "react";
import { useRouter } from "expo-router";
import { StepFlow } from "../components/StepFlow";
import { cbtFlows, getCbtMethod } from "../data/methods";
import { useCreateCbtEntry } from "../hooks/useCreateCbtEntry";

export function DecatastrophizingExerciseScreen() {
  const router = useRouter();
  const createEntry = useCreateCbtEntry();
  const method = getCbtMethod("decatastrophizing");

  return (
    <StepFlow
      headerTitle={method?.label ?? "Decatastrophizing"}
      accent={method?.color ?? "#A8B89F"}
      steps={cbtFlows.decatastrophizing ?? []}
      saving={createEntry.isPending}
      onSave={(values) =>
        createEntry.mutate(
          { method: "decatastrophizing", steps: values },
          { onSuccess: () => router.back() }
        )
      }
    />
  );
}
