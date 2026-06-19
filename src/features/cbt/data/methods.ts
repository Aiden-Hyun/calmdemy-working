/**
 * ============================================================
 * features/cbt/data/methods.ts — Method tiles + guided flow definitions
 * ============================================================
 *
 * Single source of truth for the five CBT methods:
 *   - cbtMethods: tile metadata for the home picker (label, blurb, icon, color)
 *   - cbtFlows: the step-by-step definitions the four guided methods render
 *     through StepFlow (Gratitude is a standalone screen, not a step flow)
 *   - cbtStepTitle: maps a stored step key back to its human title (detail view)
 *
 * Keeping flows here (not in the screens) lets the exercise screens AND the
 * entry-detail screen share one definition, so step labels never drift.
 * ============================================================
 */

import { CbtFlowStep, CbtMethod, CbtMethodInfo } from "../types";
import { cognitiveDistortions } from "./cognitiveDistortions";
import { socraticQuestions } from "./socraticQuestions";

/** Home-picker tiles, in display order. */
export const cbtMethods: CbtMethodInfo[] = [
  {
    id: "abc",
    label: "A-B-C",
    description: "Trace an event to the belief and feeling it triggered, then spot distortions.",
    icon: "git-branch-outline",
    color: "#C4A77D",
  },
  {
    id: "socratic",
    label: "Socratic Questions",
    description: "Question a troubling thought from several angles to loosen its grip.",
    icon: "help-circle-outline",
    color: "#7DAFB4",
  },
  {
    id: "core-beliefs",
    label: "Challenge Core Beliefs",
    description: "Weigh the evidence for and against a deep-seated belief.",
    icon: "construct-outline",
    color: "#B4A7C7",
  },
  {
    id: "decatastrophizing",
    label: "Decatastrophizing",
    description: "Right-size a worst-case fear and plan how you'd actually cope.",
    icon: "trending-down-outline",
    color: "#A8B89F",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    description: "Name what you're thankful for, with optional prompts.",
    icon: "heart-outline",
    color: "#D4A5A5",
  },
];

const TEXT_PLACEHOLDER = "Take your time…";

const abcFlow: CbtFlowStep[] = [
  {
    key: "activating",
    title: "What happened?",
    subtitle: "The activating event — describe the situation as plainly as you can.",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "belief",
    title: "What did you tell yourself?",
    subtitle: "The beliefs and thoughts that ran through your mind.",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "consequence",
    title: "How did you feel, and what did you do?",
    subtitle: "The consequence — your emotions and reactions.",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "distortions",
    title: "Which thinking patterns showed up?",
    subtitle: "Tap any that apply — or none.",
    input: "distortions",
    options: cognitiveDistortions,
  },
  {
    key: "balanced",
    title: "Try a more balanced thought",
    subtitle: "A fairer, kinder way to see the same situation.",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
];

const socraticFlow: CbtFlowStep[] = [
  {
    key: "thought",
    title: "What thought is troubling you?",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  // Walk through the first six Socratic questions, one screen each.
  ...socraticQuestions.slice(0, 6).map(
    (q): CbtFlowStep => ({
      key: q.id,
      title: q.text,
      input: "text",
      placeholder: TEXT_PLACEHOLDER,
    })
  ),
  {
    key: "reframe",
    title: "Now, a more balanced thought",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
];

const coreBeliefsFlow: CbtFlowStep[] = [
  {
    key: "belief",
    title: "Identify a core belief",
    subtitle: "e.g. \"I'm not enough\", \"I always fail\", \"I never get it right\".",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "evidenceFor",
    title: "Evidence FOR this belief",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "evidenceAgainst",
    title: "Evidence AGAINST it",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "balanced",
    title: "A more balanced belief",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
];

const decatastrophizingFlow: CbtFlowStep[] = [
  {
    key: "worry",
    title: "What are you worried about?",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "worstCase",
    title: "What's the worst that could happen?",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "likelihood",
    title: "How likely is it, really?",
    subtitle: "1 = extremely unlikely, 10 = almost certain.",
    input: "slider",
  },
  {
    key: "ifHappened",
    title: "If it did happen, what would actually happen?",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "cope",
    title: "How would you cope?",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
  {
    key: "realistic",
    title: "A more realistic scenario",
    input: "text",
    placeholder: TEXT_PLACEHOLDER,
  },
];

/** Step definitions for the four guided (StepFlow) methods. */
export const cbtFlows: Partial<Record<CbtMethod, CbtFlowStep[]>> = {
  abc: abcFlow,
  socratic: socraticFlow,
  "core-beliefs": coreBeliefsFlow,
  decatastrophizing: decatastrophizingFlow,
};

/** Look up a method's tile metadata. */
export function getCbtMethod(id: CbtMethod): CbtMethodInfo | undefined {
  return cbtMethods.find((m) => m.id === id);
}

// Gratitude is a standalone screen; its stored keys get their labels here.
const gratitudeLabels: Record<string, string> = {
  prompt: "Prompt",
  text: "What I'm grateful for",
};

/** Human-readable title for a stored step key (used by the detail screen). */
export function cbtStepTitle(method: CbtMethod, key: string): string {
  if (method === "gratitude") return gratitudeLabels[key] ?? key;
  const step = (cbtFlows[method] ?? []).find((s) => s.key === key);
  return step?.title ?? key;
}
