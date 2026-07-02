/**
 * ============================================================
 * features/routines/api/goalTags.ts — Goal-tag data access (collection E, feat 22)
 * ============================================================
 *
 * CRUD for user-defined goal tags under users/{uid}/routineGoalTags, plus
 * idempotent seeding of the defaults on first use.
 *
 * Conventions (§5.3): reads try/caught → []; writes throw; never write
 * `undefined`.
 * ============================================================
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { GoalTag, IoniconName } from "../types";
import { DEFAULT_GOAL_TAGS } from "../data/goalTags";

function goalTagsCollection(userId: string) {
  return collection(db, "users", userId, "routineGoalTags");
}

function mapGoalTag(id: string, data: Record<string, unknown>, userId: string): GoalTag {
  return {
    id,
    userId,
    label: typeof data.label === "string" ? data.label : "",
    icon: (typeof data.icon === "string" ? data.icon : "pricetag-outline") as IoniconName,
    color: typeof data.color === "string" ? data.color : "#8FA98C",
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

export interface CreateGoalTagInput {
  label: string;
  icon: IoniconName;
  color: string;
  order?: number;
}

/** Create a user-defined goal tag. Returns the new id. */
export async function createGoalTag(userId: string, input: CreateGoalTagInput): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    label: input.label.trim(),
    icon: input.icon,
    color: input.color,
    order: input.order ?? Date.now(),
    createdAt: Date.now(),
  };
  const docRef = await addDoc(goalTagsCollection(userId), data);
  return docRef.id;
}

export type UpdateGoalTagInput = Partial<Pick<GoalTag, "label" | "icon" | "color" | "order">>;

/** Patch a goal tag. Habits reference tags by id, so renaming is one write. */
export async function updateGoalTag(
  userId: string,
  tagId: string,
  patch: UpdateGoalTagInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;
  await updateDoc(doc(goalTagsCollection(userId), tagId), data);
}

/** Delete a goal tag. (Habits keep the dangling id; the UI ignores unknown ids.) */
export async function deleteGoalTag(userId: string, tagId: string): Promise<void> {
  await deleteDoc(doc(goalTagsCollection(userId), tagId));
}

/** All goal tags, ascending by `order`. [] on error. */
export async function listGoalTags(userId: string): Promise<GoalTag[]> {
  try {
    const q = query(goalTagsCollection(userId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapGoalTag(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching goal tags:", error);
    return [];
  }
}

/** Write the default tags (idempotent — slug doc ids). */
export async function seedDefaultGoalTags(userId: string): Promise<void> {
  await Promise.all(
    DEFAULT_GOAL_TAGS.map((tag, index) =>
      setDoc(doc(goalTagsCollection(userId), tag.slug), {
        userId,
        label: tag.label,
        icon: tag.icon,
        color: tag.color,
        order: index,
        createdAt: Date.now(),
      })
    )
  );
}

/**
 * Goal tags for the user, seeding the defaults the first time they have none.
 * Idempotent thanks to the slug doc ids, so a double-run can't duplicate.
 */
export async function getOrSeedGoalTags(userId: string): Promise<GoalTag[]> {
  const existing = await listGoalTags(userId);
  if (existing.length > 0) return existing;
  await seedDefaultGoalTags(userId);
  return listGoalTags(userId);
}
