/**
 * features/cbt/screens/CoreBeliefsExerciseScreen.tsx — Challenge Core Beliefs.
 *
 * Identify a core belief → evidence for → evidence against → a more balanced
 * belief. Thin wrapper over the shared StepFlow.
 */

import React from "react";
import { useRouter } from "expo-router";
import { StepFlow } from "../components/StepFlow";
import { cbtFlows, getCbtMethod } from "../data/methods";
import { useCreateCbtEntry } from "../hooks/useCreateCbtEntry";

export function CoreBeliefsExerciseScreen() {
  const router = useRouter();
  const createEntry = useCreateCbtEntry();
  const method = getCbtMethod("core-beliefs");

  return (
    <StepFlow
      headerTitle={method?.label ?? "Challenge Core Beliefs"}
      accent={method?.color ?? "#B4A7C7"}
      steps={cbtFlows["core-beliefs"] ?? []}
      saving={createEntry.isPending}
      onSave={(values) =>
        createEntry.mutate(
          { method: "core-beliefs", steps: values },
          { onSuccess: () => router.back() }
        )
      }
    />
  );
}
