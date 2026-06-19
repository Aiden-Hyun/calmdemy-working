/**
 * ============================================================
 * features/journal/data/prompts.ts — Starter prompt catalogue
 * ============================================================
 *
 * Static, optional writing prompts shown in the new-entry modal. The user can
 * pick one to seed a reflection or write free-form. Only the prompt's `id` is
 * persisted on an entry (see JournalEntry.promptId); the text lives here.
 * ============================================================
 */

import { JournalPrompt } from "../types";

export const journalPrompts: JournalPrompt[] = [
  { id: "three-grateful", text: "What are three things you're grateful for today?" },
  { id: "small-win", text: "What's one small win you had today?" },
  { id: "let-go", text: "What's something you want to let go of?" },
  { id: "feeling-now", text: "Describe how you're feeling right now without judgment." },
  { id: "kindness-received", text: "What's a kindness you received this week?" },
  { id: "future-thanks", text: "What would your future self thank you for today?" },
  { id: "unsaid", text: "What's been on your mind that you haven't said out loud?" },
  {
    id: "time-energy-peace",
    text: "What three things could you give up that would give you more time, energy, and peace?",
  },
  { id: "one-thing-well", text: "What's one thing you did well this week?" },
  { id: "grateful-for-whom", text: "Who are you grateful for, and why?" },
  { id: "looking-forward", text: "What's something you're looking forward to?" },
  { id: "remember-today", text: "What's one thing you want to remember about today?" },
];

/** Look up a prompt's text by id (for rendering on an entry that used one). */
export function getPromptById(id: string): JournalPrompt | undefined {
  return journalPrompts.find((p) => p.id === id);
}
