/**
 * ============================================================
 * features/routines/data/difficulty.ts — Difficulty metadata (feat 4)
 * ============================================================
 *
 * Display copy for the Mini / Plus / Max effort tiers. "Plus" is the normal
 * default — the UI only badges Mini and Max so the calm list stays quiet.
 * ============================================================
 */

import type { Difficulty } from "../types";

export const DIFFICULTY_ORDER: Difficulty[] = ["mini", "plus", "max"];

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; short: string; description: string }
> = {
  mini: { label: "Mini", short: "S", description: "The tiniest version — barely any effort." },
  plus: { label: "Plus", short: "M", description: "A solid, everyday effort." },
  max: { label: "Max", short: "L", description: "Go all in when you have the energy." },
};
