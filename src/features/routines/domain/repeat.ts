/**
 * ============================================================
 * features/routines/domain/repeat.ts — Repeat-schedule logic (PURE)
 * ============================================================
 *
 * feat 2 — decides whether a habit is "due" on a given calendar day, from its
 * RepeatConfig. This is the gate the Today screen uses to build the day's list,
 * and the gate the streak walk uses to decide which days count.
 *
 * Two layers:
 *   - isDueOn / isRepeatDueOn — pure schedule eligibility. `daily` and
 *     `weekdays` are exact; `weekly` and `times-per-week` are "eligible any
 *     day" (their limit is a weekly quota, not a per-day rule).
 *   - isDueToday — composes eligibility with the week's quota, so a
 *     times-per-week habit drops off Today once its target is met. Quota needs
 *     completion context, which is passed IN (this stays pure — no I/O).
 * ============================================================
 */

import type { Habit, RepeatConfig, Weekday } from "../types";

/** Is `habit` eligible to appear on `date`'s calendar day (ignoring quota)? */
export function isDueOn(habit: Habit, date: Date): boolean {
  return isRepeatDueOn(habit.repeat, date);
}

/** Lower-level: schedule eligibility straight off a RepeatConfig. */
export function isRepeatDueOn(repeat: RepeatConfig, date: Date): boolean {
  switch (repeat.type) {
    case "daily":
      return true;
    case "weekdays":
      return repeat.days.includes(date.getDay() as Weekday);
    case "weekly":
    case "times-per-week":
      // Eligible any day; the cap is a weekly quota handled by isDueToday.
      return true;
    default:
      return false;
  }
}

/**
 * The number of completions a habit needs per week, or null if its cadence is
 * per-day (daily/weekdays) rather than a weekly quota.
 */
export function weeklyQuota(repeat: RepeatConfig): number | null {
  if (repeat.type === "weekly") return 1;
  if (repeat.type === "times-per-week") return repeat.target;
  return null;
}

/**
 * Should this habit show on Today? Composes schedule eligibility with the
 * weekly quota for `weekly`/`times-per-week` habits:
 *   - `handledToday` — the user already set a state for it today (done/rest/
 *     shielded); keep it visible so today's action stays on screen.
 *   - `weekDoneCount` — fulfilling completions (done/shielded) already logged
 *     this week; once it reaches the quota the habit drops off Today.
 * Daily/weekdays habits ignore the quota entirely.
 */
export function isDueToday(
  habit: Habit,
  date: Date,
  ctx: { handledToday: boolean; weekDoneCount: number }
): boolean {
  if (!isDueOn(habit, date)) return false;
  const quota = weeklyQuota(habit.repeat);
  if (quota === null) return true; // daily / weekdays scheduled today
  if (ctx.handledToday) return true; // keep today's action visible
  return ctx.weekDoneCount < quota; // still short of the weekly target
}
