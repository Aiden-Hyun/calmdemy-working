/**
 * ============================================================
 * features/routines/domain/dateKeys.ts — Local date-key helpers (PURE)
 * ============================================================
 *
 * Every routines collection that is one-per-day (completions, tracker entries,
 * day notes) keys documents by the LOCAL calendar date as "YYYY-MM-DD". These
 * helpers are the single place that conversion happens.
 *
 * `toDateKey` is intentionally a copy of the identical helper in
 * src/features/mood/api/moodEntries.ts. That one is not exported from mood's
 * public index.ts, and a cross-feature internal import would be forbidden by
 * the boundaries lint rule — so we re-implement the pure function locally.
 *
 * No I/O. No imports.
 * ============================================================
 */

/** Local date key (YYYY-MM-DD) for a given epoch-ms timestamp. */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Today's local date key. */
export function todayKey(): string {
  return toDateKey(Date.now());
}

/** Parse a "YYYY-MM-DD" key back into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** A new key offset by `days` from the given key (negative = earlier). */
export function addDaysToKey(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d.getTime());
}

/** First and last day keys of the calendar month that `key` falls in. */
export function monthBounds(key: string): { start: string; end: string } {
  const d = fromDateKey(key);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: toDateKey(start.getTime()), end: toDateKey(end.getTime()) };
}

/** Friendly label for a date key relative to today ("Today", "Tomorrow", "Mon, Jul 5"). */
export function dayLabel(key: string): string {
  const today = todayKey();
  if (key === today) return "Today";
  if (key === addDaysToKey(today, 1)) return "Tomorrow";
  if (key === addDaysToKey(today, -1)) return "Yesterday";
  return fromDateKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * First (Sunday) and last (Saturday) day keys of the week `key` falls in.
 * Sunday-start matches the Weekday type (0 = Sunday) and the day picker order.
 */
export function weekBounds(key: string): { start: string; end: string } {
  const d = fromDateKey(key);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateKey(start.getTime()), end: toDateKey(end.getTime()) };
}
