/**
 * ============================================================
 * features/cbt/data/socraticQuestions.ts — Socratic questioning prompts
 * ============================================================
 *
 * Questions used to interrogate a troubling thought from several angles. The
 * Socratic flow walks the user through a subset of these one at a time. Static.
 * ============================================================
 */

import { SocraticQuestion } from "../types";

export const socraticQuestions: SocraticQuestion[] = [
  { id: "evidence-for", text: "What's the evidence for this thought?" },
  { id: "evidence-against", text: "What's the evidence against it?" },
  { id: "alternative-view", text: "Is there another way to look at this?" },
  { id: "tell-a-friend", text: "What would I tell a friend who had this thought?" },
  { id: "worst-case", text: "What's the worst that could happen? Could I cope with that?" },
  { id: "most-likely", text: "What's most likely to happen?" },
  { id: "helping-me", text: "Is this thought helping me?" },
  { id: "five-years", text: "Five years from now, will this still matter?" },
];
