/**
 * ============================================================
 * features/cbt/data/gratitudePrompts.ts — Gratitude writing prompts
 * ============================================================
 *
 * Optional prompts shown in the Gratitude exercise. The user can pick one to
 * focus on or skip and write free-form. Static.
 * ============================================================
 */

import { GratitudePrompt } from "../types";

export const gratitudePrompts: GratitudePrompt[] = [
  { id: "three-people", text: "Who are three people you're grateful for, and why?" },
  { id: "small-smile", text: "What's a small thing today that made you smile?" },
  { id: "body-grateful", text: "What's something about your body you're grateful for?" },
  { id: "difficulty-taught", text: "What's a difficulty that's also taught you something?" },
  { id: "treasured-memory", text: "What's a memory you treasure?" },
  {
    id: "taken-for-granted",
    text: "What's something you usually take for granted that you'd miss?",
  },
];
