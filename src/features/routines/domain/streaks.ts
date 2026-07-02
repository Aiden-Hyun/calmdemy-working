/**
 * ============================================================
 * features/routines/domain/streaks.ts — Streaks & shields (PURE, feat 6)
 * ============================================================
 *
 * Nothing here is stored — everything is derived from a habit's completion log
 * (see BUILD_PLAN §6.8). No I/O; completions are passed in.
 *
 * Streak semantics:
 *   - daily / weekdays  → DAY streak. Walk scheduled days backward from today;
 *     `done`/`shielded` extend, `rest` is neutral (skip), a missing/`skipped`
 *     scheduled day breaks it. Today counts only once acted on (a not-yet-done
 *     today is "pending", not a break).
 *   - weekly / times-per-week → WEEK streak. Walk weeks backward; a week counts
 *     if its `done`/`shielded` total meets the quota. The current week is
 *     pending until it does.
 *
 * Shields: `shieldsMax` per period (default period = week — resolved OQ4).
 * Balance = shieldsMax − shielded completions in the current period.
 * ============================================================
 */

import type { Habit, HabitCompletion } from "../types";
import { isRepeatDueOn, weeklyQuota } from "./repeat";
import { addDaysToKey, monthBounds, toDateKey, weekBounds } from "./dateKeys";

export type ShieldPeriod = "week" | "month";

export interface Streak {
  value: number;
  unit: "day" | "week";
}

function countFulfilled(completions: HabitCompletion[], startKey: string, endKey: string): number {
  let n = 0;
  for (const c of completions) {
    if (c.dateKey >= startKey && c.dateKey <= endKey && (c.state === "done" || c.state === "shielded")) {
      n += 1;
    }
  }
  return n;
}

/** Current streak — day-based for per-day cadences, week-based for quotas. */
export function computeStreak(
  habit: Habit,
  completions: HabitCompletion[],
  today: Date = new Date()
): Streak {
  const quota = weeklyQuota(habit.repeat);
  return quota === null
    ? { value: dayStreak(habit, completions, today), unit: "day" }
    : { value: weekStreak(habit, completions, quota, today), unit: "week" };
}

function dayStreak(habit: Habit, completions: HabitCompletion[], today: Date): number {
  const states = new Map<string, string>();
  completions.forEach((c) => states.set(c.dateKey, c.state));

  const createdKey = toDateKey(habit.createdAt);
  const cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;

  for (let i = 0; i < 366; i++) {
    const key = toDateKey(cursor.getTime());
    if (key < createdKey) break;
    if (isRepeatDueOn(habit.repeat, cursor)) {
      const st = states.get(key);
      if (st === "done" || st === "shielded") {
        streak += 1;
      } else if (st === "rest") {
        // neutral — neither extends nor breaks
      } else if (i === 0 && st === undefined) {
        // today isn't over — pending, don't break
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function weekStreak(
  habit: Habit,
  completions: HabitCompletion[],
  quota: number,
  today: Date
): number {
  const createdKey = toDateKey(habit.createdAt);
  let weekStart = weekBounds(toDateKey(today.getTime())).start;
  let streak = 0;

  for (let i = 0; i < 105; i++) {
    const end = addDaysToKey(weekStart, 6);
    if (end < createdKey) break;
    const done = countFulfilled(completions, weekStart, end);
    if (done >= quota) {
      streak += 1;
    } else if (i === 0) {
      // current week still in progress — pending
    } else {
      break;
    }
    weekStart = addDaysToKey(weekStart, -7);
  }
  return streak;
}

/** Shields left in the current period. 0 when the habit grants none. */
export function shieldsRemaining(
  habit: Habit,
  completions: HabitCompletion[],
  period: ShieldPeriod = "week",
  today: Date = new Date()
): number {
  if (habit.shieldsMax <= 0) return 0;
  const key = toDateKey(today.getTime());
  const { start, end } = period === "week" ? weekBounds(key) : monthBounds(key);
  let used = 0;
  for (const c of completions) {
    if (c.dateKey >= start && c.dateKey <= end && c.state === "shielded") used += 1;
  }
  return Math.max(0, habit.shieldsMax - used);
}
