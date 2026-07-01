/**
 * ============================================================
 * features/routines/types.ts — Routines suite domain types
 * ============================================================
 *
 * Owned by the routines feature. This is the AUTHORITATIVE data model for the
 * whole suite (see docs/routines/BUILD_PLAN.md §6). Other features must not
 * import these directly; surface through index.ts if ever needed.
 *
 * Conventions:
 *   - Every timestamp is epoch ms as a plain `number` (Date.now()) — never a
 *     Firestore Timestamp.
 *   - Optional fields use `?` and are NEVER written when empty (Firestore
 *     rejects `undefined`).
 *   - Enums are string-literal unions.
 *
 * Firestore collections (all user-scoped under users/{uid}/…):
 *   A  routineProfiles/{profileId}                    RoutineProfile
 *   B  routineHabits/{habitId}                         Habit
 *   C  routineCompletions/{habitId}_{YYYY-MM-DD}       HabitCompletion  ← source of truth for everything derived
 *   D  routineTodos/{todoId}                           Todo
 *   E  routineGoalTags/{tagId}                          GoalTag
 *   F  routineTrackers/{trackerId}                      NumericTracker
 *   G  routineTrackers/{trackerId}/entries/{YYYY-MM-DD} TrackerEntry
 *   H  routineDayNotes/{YYYY-MM-DD}                      RoutineDayNote
 *   I  routineReminders/{reminderKey}  (optional mirror — see BUILD_PLAN §8.1)
 *
 * Streaks, shields balance, Green Light, and all stats/heatmaps/reports are
 * DERIVED client-side from C (never stored). See domain/.
 * ============================================================
 */

import type { Ionicons } from "@expo/vector-icons";

/** Ionicons glyph name, reused across every icon field in the suite. */
export type IoniconName = keyof typeof Ionicons.glyphMap;

// ── Habits (features 1–5, 22) — collection B ───────────────────────────────

/** feat 1 — the moment/anchor a habit hangs off ("when I wake up", etc.). */
export type RoutineMoment =
  | "wake-up"
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "before-bed"
  | "anytime";

/** feat 2 — repeat cadence kind. */
export type RepeatType = "daily" | "weekly" | "weekdays" | "times-per-week";

/** 0 = Sunday, matching JS `Date.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** feat 4 — effort tier the user scales to their energy that day. */
export type Difficulty = "mini" | "plus" | "max";

/** feat 5 — 1 = low, 3 = high; weights the Green Light score. */
export type Priority = 1 | 2 | 3;

/**
 * feat 2 — discriminated union so weekday/quota fields only exist when they
 * are meaningful.
 */
export type RepeatConfig =
  | { type: "daily" }
  | { type: "weekly" } // once per calendar week, any day
  | { type: "weekdays"; days: Weekday[] } // chosen weekdays
  | { type: "times-per-week"; target: number }; // X times/week, any days

/** Firestore path: users/{userId}/routineHabits/{habitId} */
export interface Habit {
  id: string;
  userId: string;
  profileId: string; // → RoutineProfile.id (feat 7)
  name: string;
  icon: IoniconName;
  color: string;
  moment: RoutineMoment; // feat 1 anchor
  scheduledTime?: string; // "HH:MM" if time-anchored instead of moment-anchored
  repeat: RepeatConfig; // feat 2
  difficulty: Difficulty; // feat 4
  priority: Priority; // feat 5
  goalTagIds: string[]; // feat 22 → GoalTag.id[]
  shieldsMax: number; // feat 6 shields granted per period (0 = none)
  order: number; // manual sort within its moment group
  reminderKey?: string; // feat 24 key into the reminders map
  archivedAt?: number; // soft-delete: keeps completions intact for history
  createdAt: number;
}

// ── Completions (features 3, 6) — collection C, the load-bearing table ──────

/** Absence of a doc = not-yet-done (no "fail" is ever stored). */
export type CompletionState =
  | "done" // checked off
  | "skipped" // consciously skipped (counts against, unless rest/shield)
  | "rest" // feat 3 rest day — does NOT count as a fail
  | "shielded"; // feat 6 a shield was spent to protect the streak this day

/**
 * Firestore path: users/{userId}/routineCompletions/{habitId}_{YYYY-MM-DD}
 * Composite doc id e.g. "ab12cd34_2026-07-01" → idempotent per habit per day.
 */
export interface HabitCompletion {
  id: string; // "${habitId}_${dateKey}"
  userId: string;
  habitId: string; // → Habit.id (denormalized — needed as a real field to query)
  profileId: string; // denormalized: cheap whole-profile day query
  dateKey: string; // "YYYY-MM-DD" (denormalized from id for range queries)
  state: CompletionState;
  value?: number; // optional: count-style habits ("drink 3 glasses")
  createdAt: number;
}

// ── Profiles (feature 7) — collection A ─────────────────────────────────────

/** Firestore path: users/{userId}/routineProfiles/{profileId} */
export interface RoutineProfile {
  id: string;
  userId: string;
  name: string; // "Weekday", "Vacation", "Recovery"
  icon: IoniconName;
  color: string;
  order: number; // manual sort among the ≤10 profiles
  isActive: boolean; // exactly one active at a time
  createdAt: number;
}

// ── To-dos (features 8, 9) — collection D ───────────────────────────────────

export type TodoKind = "task" | "appointment";

/** Firestore path: users/{userId}/routineTodos/{todoId} */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  dateKey?: string; // "YYYY-MM-DD" placement (feat 9); omit = unscheduled backlog
  time?: string; // "HH:MM" for appointments; omit = all-day (feat 8)
  kind: TodoKind;
  done: boolean; // one-off completion lives on the instance — NO occurrence collection
  completedAt?: number; // set when done flips true
  goalTagIds?: string[];
  reminderKey?: string; // feat 24
  order: number;
  createdAt: number;
}

// ── Goal tags (feature 22) — collection E ───────────────────────────────────

/** Firestore path: users/{userId}/routineGoalTags/{tagId} */
export interface GoalTag {
  id: string;
  userId: string;
  label: string; // "Tidy", "Growth", "Self-care"
  icon: IoniconName;
  color: string;
  order: number;
  createdAt: number;
}

// ── Numeric trackers (feature 10) — collections F & G ───────────────────────

/** time-of-day = minutes-since-midnight (0–1439), keeps `value` a number. */
export type TrackerKind = "number" | "duration" | "time-of-day";

/** Firestore path: users/{userId}/routineTrackers/{trackerId} */
export interface NumericTracker {
  id: string;
  userId: string;
  name: string; // "Weight", "Push-ups", "Wake-up time"
  unit: string; // "kg", "reps", "time"
  kind: TrackerKind;
  icon: IoniconName;
  color: string;
  goalValue?: number; // optional target line on the chart
  order: number;
  createdAt: number;
}

/** Firestore path: users/{userId}/routineTrackers/{trackerId}/entries/{YYYY-MM-DD} */
export interface TrackerEntry {
  id: string; // "YYYY-MM-DD"
  userId: string;
  trackerId: string;
  dateKey: string; // denormalized for range queries
  value: number; // interpreted per NumericTracker.kind
  createdAt: number;
}

// ── Day notes (feature 12) — collection H ───────────────────────────────────

/** Firestore path: users/{userId}/routineDayNotes/{YYYY-MM-DD} */
export interface RoutineDayNote {
  id: string; // "YYYY-MM-DD"
  userId: string;
  dateKey: string;
  text: string;
  journalEntryId?: string; // optional link out to a full journal entry
  createdAt: number;
  updatedAt: number;
}

// ── Derived view-models (features 15–18) — never Firestore docs ─────────────

export type GreenLight = "green" | "yellow" | "red";

export interface HabitStat {
  habitId: string;
  scheduled: number;
  done: number;
  rested: number;
  shielded: number;
  rate: number; // done / (scheduled - rested), 0..1
  currentStreak: number;
}

export interface RoutineStats {
  rangeStart: string; // "YYYY-MM-DD"
  rangeEnd: string;
  perHabit: HabitStat[];
  overallRate: number;
  greenLightByDay: Record<string, GreenLight>;
}
