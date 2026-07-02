/**
 * ============================================================
 * features/routines/domain/greenLight.ts — Green Light (PURE, feat 14)
 * ============================================================
 *
 * A traffic-light read on the day, derived (never stored) from today's due
 * habits and their completion states — see BUILD_PLAN §6.9. Zero extra reads:
 * the caller already has both in memory from the Today query.
 *
 *   score = Σ(priority of satisfied due habits) / Σ(priority of all due habits)
 *   green ≥ 0.8   yellow ≥ 0.4   red < 0.4
 *
 * "Satisfied" = done, rest, or shielded (a rest day never counts against you).
 * Thresholds are tunable constants here (OQ3).
 * ============================================================
 */

import type { CompletionState, GreenLight, Habit } from "../types";

export const GREEN_THRESHOLD = 0.8;
export const YELLOW_THRESHOLD = 0.4;

const SATISFIED: CompletionState[] = ["done", "rest", "shielded"];

/** Priority-weighted traffic light for today. Empty day → green (nothing owed). */
export function computeGreenLight(
  dueHabits: Habit[],
  stateByHabit: Map<string, CompletionState>
): GreenLight {
  let total = 0;
  let satisfied = 0;
  for (const habit of dueHabits) {
    total += habit.priority;
    const state = stateByHabit.get(habit.id);
    if (state && SATISFIED.includes(state)) satisfied += habit.priority;
  }
  if (total === 0) return "green";
  const score = satisfied / total;
  if (score >= GREEN_THRESHOLD) return "green";
  if (score >= YELLOW_THRESHOLD) return "yellow";
  return "red";
}
