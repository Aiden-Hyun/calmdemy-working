/**
 * features/cbt/screens/SocraticExerciseScreen.tsx — Socratic questioning flow.
 *
 * Identify the thought → walk six Socratic questions one at a time → reframe.
 * Thin wrapper over the shared StepFlow.
 */

import React from "react";
import { useRouter } from "expo-router";
import { StepFlow } from "../components/StepFlow";
import { cbtFlows, getCbtMethod } from "../data/methods";
import { useCreateCbtEntry } from "../hooks/useCreateCbtEntry";

export function SocraticExerciseScreen() {
  const router = useRouter();
  const createEntry = useCreateCbtEntry();
  const method = getCbtMethod("socratic");

  return (
    <StepFlow
      headerTitle={method?.label ?? "Socratic Questions"}
      accent={method?.color ?? "#7DAFB4"}
      steps={cbtFlows.socratic ?? []}
      saving={createEntry.isPending}
      onSave={(values) =>
        createEntry.mutate(
          { method: "socratic", steps: values },
          { onSuccess: () => router.back() }
        )
      }
    />
  );
}
