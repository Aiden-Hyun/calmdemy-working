/**
 * ============================================================
 * features/routines/api/habits.ts — Habit definitions data access
 * ============================================================
 *
 * Firestore CRUD for habit DEFINITIONS (collection B), stored per-user under
 * users/{uid}/routineHabits. Completions (whether a habit was done on a given
 * day) live in a separate collection — see api/completions.ts.
 *
 * Conventions (see docs/routines/BUILD_PLAN.md §5.3):
 *   - Reads are try/caught → [] / null. Writes throw.
 *   - Never write `undefined` (built conditionally).
 *   - `mapHabit` defensively coerces every field.
 *
 * NOTE (profiles): every habit carries a `profileId`. Real profiles (feature 7)
 * arrive in M5; until then every habit uses DEFAULT_PROFILE_ID so the schema is
 * already correct and the day query never needs a special case.
 * ============================================================
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type {
  Difficulty,
  Habit,
  IoniconName,
  Priority,
  RepeatConfig,
  RoutineMoment,
} from "../types";

/**
 * The single profile every habit belongs to until real profiles (M5) exist.
 * Kept as a constant so M5's migration can find every legacy habit.
 */
export const DEFAULT_PROFILE_ID = "default";

/** The user's routineHabits subcollection reference. */
function habitsCollection(userId: string) {
  return collection(db, "users", userId, "routineHabits");
}

/** Defensive mapper: coerce every field off an untrusted Firestore document. */
function mapHabit(id: string, data: Record<string, unknown>, userId: string): Habit {
  const repeat =
    data.repeat && typeof data.repeat === "object"
      ? (data.repeat as RepeatConfig)
      : { type: "daily" as const };
  return {
    id,
    userId,
    profileId: typeof data.profileId === "string" ? data.profileId : DEFAULT_PROFILE_ID,
    name: typeof data.name === "string" ? data.name : "",
    icon: (typeof data.icon === "string" ? data.icon : "ellipse-outline") as IoniconName,
    color: typeof data.color === "string" ? data.color : "#8FA98C",
    moment: (typeof data.moment === "string" ? data.moment : "anytime") as RoutineMoment,
    scheduledTime: typeof data.scheduledTime === "string" ? data.scheduledTime : undefined,
    repeat,
    difficulty: (typeof data.difficulty === "string" ? data.difficulty : "plus") as Difficulty,
    priority: (typeof data.priority === "number" ? data.priority : 2) as Priority,
    goalTagIds: Array.isArray(data.goalTagIds) ? (data.goalTagIds as string[]) : [],
    shieldsMax: typeof data.shieldsMax === "number" ? data.shieldsMax : 0,
    order: typeof data.order === "number" ? data.order : 0,
    reminderKey: typeof data.reminderKey === "string" ? data.reminderKey : undefined,
    archivedAt: typeof data.archivedAt === "number" ? data.archivedAt : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

/**
 * Input for creating a habit. Attribute fields (difficulty/priority/goalTags/
 * shields) are optional and default here, so milestones that add their pickers
 * (M2, M3) can pass them without changing this signature.
 */
export interface CreateHabitInput {
  name: string;
  icon: IoniconName;
  color: string;
  moment: RoutineMoment;
  repeat: RepeatConfig;
  scheduledTime?: string;
  difficulty?: Difficulty;
  priority?: Priority;
  goalTagIds?: string[];
  shieldsMax?: number;
  profileId?: string;
}

/** Create a habit. Returns the new habit id. */
export async function createHabit(userId: string, input: CreateHabitInput): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    profileId: input.profileId ?? DEFAULT_PROFILE_ID,
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    moment: input.moment,
    repeat: input.repeat,
    difficulty: input.difficulty ?? "plus",
    priority: input.priority ?? 2,
    goalTagIds: input.goalTagIds ?? [],
    shieldsMax: input.shieldsMax ?? 0,
    order: Date.now(),
    createdAt: Date.now(),
  };
  if (input.scheduledTime) data.scheduledTime = input.scheduledTime;

  const docRef = await addDoc(habitsCollection(userId), data);
  return docRef.id;
}

/** Fields a caller may patch on an existing habit. */
export type UpdateHabitInput = Partial<
  Pick<
    Habit,
    | "name"
    | "icon"
    | "color"
    | "moment"
    | "scheduledTime"
    | "repeat"
    | "difficulty"
    | "priority"
    | "goalTagIds"
    | "shieldsMax"
    | "order"
    | "reminderKey"
  >
>;

/** Patch an existing habit. Only provided keys are written. */
export async function updateHabit(
  userId: string,
  habitId: string,
  patch: UpdateHabitInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;
  await updateDoc(doc(habitsCollection(userId), habitId), data);
}

/**
 * Soft-delete a habit: set `archivedAt`. Never hard-delete — completions would
 * orphan and streak/stat math would break. Today filters `!archivedAt`; history
 * keeps archived habits.
 */
export async function archiveHabit(userId: string, habitId: string): Promise<void> {
  await updateDoc(doc(habitsCollection(userId), habitId), { archivedAt: Date.now() });
}

/** All of a user's habits (archived included), oldest first. Returns [] on error. */
export async function listHabits(userId: string): Promise<Habit[]> {
  try {
    const q = query(habitsCollection(userId), orderBy("createdAt", "asc"), limit(500));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapHabit(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching habits:", error);
    return [];
  }
}

/** A single habit by id, or null if missing / on error. */
export async function getHabit(userId: string, habitId: string): Promise<Habit | null> {
  try {
    const snap = await getDoc(doc(habitsCollection(userId), habitId));
    if (!snap.exists()) return null;
    return mapHabit(snap.id, snap.data(), userId);
  } catch (error) {
    console.error("Error fetching habit:", error);
    return null;
  }
}
