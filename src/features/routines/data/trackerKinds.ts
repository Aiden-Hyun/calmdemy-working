/**
 * ============================================================
 * features/routines/data/trackerKinds.ts — Tracker kinds + value formatting
 * ============================================================
 *
 * Static metadata for the tracker-kind picker plus a pure formatter for
 * displaying a stored numeric value per kind.
 * ============================================================
 */

import type { TrackerKind } from "../types";

export const TRACKER_KINDS: { key: TrackerKind; label: string; hint: string }[] = [
  { key: "number", label: "Number", hint: "e.g. weight, reps" },
  { key: "duration", label: "Duration", hint: "in minutes" },
  { key: "time-of-day", label: "Time of day", hint: "e.g. wake-up time" },
];

/** Human-readable value for a tracker reading. */
export function formatTrackerValue(kind: TrackerKind, unit: string, value: number): string {
  if (kind === "time-of-day") {
    const clamped = Math.max(0, Math.min(1439, Math.round(value)));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  if (kind === "duration") return `${value} min`;
  return unit ? `${value} ${unit}` : `${value}`;
}
