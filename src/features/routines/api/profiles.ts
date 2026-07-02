/**
 * ============================================================
 * features/routines/api/profiles.ts — Routine profiles (collection A, feat 7)
 * ============================================================
 *
 * A profile is a named set of habits ("Weekday", "Vacation", …). Exactly one is
 * active; the Today screen shows the active profile's habits. "Apply Today"
 * flips `isActive` across profiles in a single batch.
 *
 * The seeded default profile uses the doc id DEFAULT_PROFILE_ID so the habits
 * created before M5 (which carry `profileId: "default"`) belong to it — no data
 * migration needed.
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
  writeBatch,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { IoniconName, RoutineProfile } from "../types";
import { DEFAULT_PROFILE_ID } from "./habits";

export const MAX_PROFILES = 10;

function profilesCollection(userId: string) {
  return collection(db, "users", userId, "routineProfiles");
}

function mapProfile(id: string, data: Record<string, unknown>, userId: string): RoutineProfile {
  return {
    id,
    userId,
    name: typeof data.name === "string" ? data.name : "",
    icon: (typeof data.icon === "string" ? data.icon : "albums-outline") as IoniconName,
    color: typeof data.color === "string" ? data.color : "#8FA98C",
    order: typeof data.order === "number" ? data.order : 0,
    isActive: data.isActive === true,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

export interface CreateProfileInput {
  name: string;
  icon: IoniconName;
  color: string;
  order?: number;
}

/** Create a profile (inactive). Returns its id. Caller enforces the ≤10 cap. */
export async function createProfile(userId: string, input: CreateProfileInput): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    order: input.order ?? Date.now(),
    isActive: false,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(profilesCollection(userId), data);
  return docRef.id;
}

export type UpdateProfileInput = Partial<Pick<RoutineProfile, "name" | "icon" | "color" | "order">>;

export async function updateProfile(
  userId: string,
  profileId: string,
  patch: UpdateProfileInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;
  await updateDoc(doc(profilesCollection(userId), profileId), data);
}

export async function deleteProfile(userId: string, profileId: string): Promise<void> {
  await deleteDoc(doc(profilesCollection(userId), profileId));
}

/** All profiles, ascending by `order`. [] on error. */
export async function listProfiles(userId: string): Promise<RoutineProfile[]> {
  try {
    const q = query(profilesCollection(userId), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapProfile(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
}

/** Seed the default profile (idempotent — fixed doc id, active). */
export async function seedDefaultProfile(userId: string): Promise<void> {
  await setDoc(doc(profilesCollection(userId), DEFAULT_PROFILE_ID), {
    userId,
    name: "My Routine",
    icon: "albums-outline",
    color: "#8FA98C",
    order: 0,
    isActive: true,
    createdAt: Date.now(),
  });
}

/** Profiles for the user, seeding the default the first time they have none. */
export async function getOrSeedProfiles(userId: string): Promise<RoutineProfile[]> {
  const existing = await listProfiles(userId);
  if (existing.length > 0) return existing;
  await seedDefaultProfile(userId);
  return listProfiles(userId);
}

/**
 * Make `profileId` the active profile: one batch sets `isActive` true on it and
 * false on every other profile (only writing docs that actually change).
 */
export async function applyToday(userId: string, profileId: string): Promise<void> {
  const snap = await getDocs(profilesCollection(userId));
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    const shouldBeActive = d.id === profileId;
    if ((d.data().isActive === true) !== shouldBeActive) {
      batch.update(d.ref, { isActive: shouldBeActive });
    }
  });
  await batch.commit();
}
