/**
 * ============================================================
 * features/routines/api/completions.ts — Habit completion log (collection C)
 * ============================================================
 *
 * The load-bearing table. One document per habit per day, keyed by the
 * composite id `${habitId}_${dateKey}` so a check-off is an idempotent setDoc
 * (re-checking overwrites; no read-modify-write, no dupes). Absence of a doc =
 * not-yet-done — a "fail" is never stored.
 *
 * Everything derived (streaks, Green Light, stats, heatmaps) reads from here.
 *
 * Conventions (§5.3): reads try/caught → []; writes throw; never write
 * `undefined`. `dateKey` and `habitId` are denormalized onto the doc because
 * Firestore cannot query on doc-id substrings.
 * ============================================================
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { CompletionState, HabitCompletion } from "../types";

/** The user's routineCompletions subcollection reference. */
function completionsCollection(userId: string) {
  return collection(db, "users", userId, "routineCompletions");
}

/** The deterministic per-habit-per-day document id. */
function completionId(habitId: string, dateKey: string): string {
  return `${habitId}_${dateKey}`;
}

function mapCompletion(
  id: string,
  data: Record<string, unknown>,
  userId: string
): HabitCompletion {
  return {
    id,
    userId,
    habitId: typeof data.habitId === "string" ? data.habitId : "",
    profileId: typeof data.profileId === "string" ? data.profileId : "default",
    dateKey: typeof data.dateKey === "string" ? data.dateKey : "",
    state: (typeof data.state === "string" ? data.state : "done") as CompletionState,
    value: typeof data.value === "number" ? data.value : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

export interface SetCompletionInput {
  habitId: string;
  profileId: string;
  dateKey: string;
  state: CompletionState;
  value?: number;
}

/**
 * Record (or replace) a habit's state for a given day. Idempotent per habit per
 * day. Returns the composite doc id written.
 */
export async function setCompletion(
  userId: string,
  input: SetCompletionInput
): Promise<string> {
  const key = completionId(input.habitId, input.dateKey);
  const data: Record<string, unknown> = {
    userId,
    habitId: input.habitId,
    profileId: input.profileId,
    dateKey: input.dateKey,
    state: input.state,
    createdAt: Date.now(),
  };
  if (typeof input.value === "number") data.value = input.value;
  await setDoc(doc(completionsCollection(userId), key), data);
  return key;
}

/**
 * Clear a habit's completion for a day (back to not-yet-done). Deleting the doc
 * keeps "absence = not done" true. Safe to call when nothing exists.
 */
export async function clearCompletion(
  userId: string,
  habitId: string,
  dateKey: string
): Promise<void> {
  await deleteDoc(doc(completionsCollection(userId), completionId(habitId, dateKey)));
}

/** Every completion recorded on `dateKey` (whole day across habits). [] on error. */
export async function getCompletionsForDate(
  userId: string,
  dateKey: string
): Promise<HabitCompletion[]> {
  try {
    const q = query(completionsCollection(userId), where("dateKey", "==", dateKey));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapCompletion(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching completions for date:", error);
    return [];
  }
}

/**
 * All habits' completions across a date range (inclusive) — used for the weekly
 * quota check on `times-per-week`/`weekly` habits. Single-field `dateKey` range
 * (auto index). [] on error.
 */
export async function getCompletionsForRange(
  userId: string,
  startKey: string,
  endKey: string
): Promise<HabitCompletion[]> {
  try {
    const q = query(
      completionsCollection(userId),
      where("dateKey", ">=", startKey),
      where("dateKey", "<=", endKey)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapCompletion(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching completions for range:", error);
    return [];
  }
}

/**
 * One habit's completions across a date range (inclusive) — the basis for
 * streaks and heatmaps. Requires the composite index (habitId ASC, dateKey ASC)
 * from BUILD_PLAN §6.13. [] on error.
 */
export async function getCompletionsRange(
  userId: string,
  habitId: string,
  startKey: string,
  endKey: string
): Promise<HabitCompletion[]> {
  try {
    const q = query(
      completionsCollection(userId),
      where("habitId", "==", habitId),
      where("dateKey", ">=", startKey),
      where("dateKey", "<=", endKey)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapCompletion(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching completions range:", error);
    return [];
  }
}
