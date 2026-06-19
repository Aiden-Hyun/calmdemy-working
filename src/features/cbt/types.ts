/**
 * ============================================================
 * features/cbt/types.ts — CBT feature domain types
 * ============================================================
 *
 * Five cognitive-behavioral methods in one feature. Owned by the cbt feature;
 * other features must not import these directly (Phase 8 enforces this).
 * ============================================================
 */

import type { Ionicons } from "@expo/vector-icons";

/** The five CBT methods shipped in v1. */
export type CbtMethod =
  | "abc"
  | "socratic"
  | "core-beliefs"
  | "decatastrophizing"
  | "gratitude";

/**
 * A completed CBT exercise.
 *
 * `steps` is a flat string map of method-specific keys → the user's answers
 * (v1 keeps it loose for flexibility across the five methods). Append-only.
 *
 * Firestore path: users/{userId}/cbtEntries/{id}
 */
export interface CbtEntry {
  id: string;
  userId: string;
  method: CbtMethod;
  steps: Record<string, string>;
  createdAt: number;
}

/** Input kind a flow step renders. */
export type CbtStepInput = "text" | "slider" | "distortions";

/**
 * One step of a guided flow (one input per screen). `options` carries the
 * distortion catalogue for a 'distortions' multi-select step.
 */
export interface CbtFlowStep {
  key: string;
  title: string;
  subtitle?: string;
  input: CbtStepInput;
  placeholder?: string;
  options?: CognitiveDistortion[];
}

/** Method tile metadata shown on the CBT home picker. */
export interface CbtMethodInfo {
  id: CbtMethod;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

/** A named cognitive distortion (A-B-C method). */
export interface CognitiveDistortion {
  id: string;
  label: string;
  description: string;
}

/** A Socratic question used to interrogate a thought. */
export interface SocraticQuestion {
  id: string;
  text: string;
}

/** An optional gratitude writing prompt. */
export interface GratitudePrompt {
  id: string;
  text: string;
}
