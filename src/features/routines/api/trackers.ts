/**
 * ============================================================
 * features/routines/api/trackers.ts — Numeric trackers (collections F & G, feat 10)
 * ============================================================
 *
 * A tracker is a definition (users/{uid}/routineTrackers/{id}); its readings
 * are a date-keyed subcollection (…/{id}/entries/{YYYY-MM-DD}), so a chart is
 * one scoped, ordered query and logging a day is an idempotent setDoc.
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
  limit,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { IoniconName, NumericTracker, TrackerEntry, TrackerKind } from "../types";

function trackersCollection(userId: string) {
  return collection(db, "users", userId, "routineTrackers");
}
function entriesCollection(userId: string, trackerId: string) {
  return collection(db, "users", userId, "routineTrackers", trackerId, "entries");
}

function mapTracker(id: string, data: Record<string, unknown>, userId: string): NumericTracker {
  return {
    id,
    userId,
    name: typeof data.name === "string" ? data.name : "",
    unit: typeof data.unit === "string" ? data.unit : "",
    kind: (typeof data.kind === "string" ? data.kind : "number") as TrackerKind,
    icon: (typeof data.icon === "string" ? data.icon : "stats-chart-outline") as IoniconName,
    color: typeof data.color === "string" ? data.color : "#8FA98C",
    goalValue: typeof data.goalValue === "number" ? data.goalValue : undefined,
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

function mapEntry(id: string, data: Record<string, unknown>, userId: string): TrackerEntry {
  return {
    id,
    userId,
    trackerId: typeof data.trackerId === "string" ? data.trackerId : "",
    dateKey: typeof data.dateKey === "string" ? data.dateKey : id,
    value: typeof data.value === "number" ? data.value : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

export interface CreateTrackerInput {
  name: string;
  unit: string;
  kind: TrackerKind;
  icon: IoniconName;
  color: string;
  goalValue?: number;
}

export async function createTracker(userId: string, input: CreateTrackerInput): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    name: input.name.trim(),
    unit: input.unit.trim(),
    kind: input.kind,
    icon: input.icon,
    color: input.color,
    order: Date.now(),
    createdAt: Date.now(),
  };
  if (typeof input.goalValue === "number") data.goalValue = input.goalValue;
  const docRef = await addDoc(trackersCollection(userId), data);
  return docRef.id;
}

export async function deleteTracker(userId: string, trackerId: string): Promise<void> {
  // Note: deleting the tracker doc leaves its `entries` subcollection orphaned
  // in Firestore; that's acceptable here (no reads reach orphaned entries).
  await deleteDoc(doc(trackersCollection(userId), trackerId));
}

export async function listTrackers(userId: string): Promise<NumericTracker[]> {
  try {
    const q = query(trackersCollection(userId), orderBy("createdAt", "asc"), limit(100));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTracker(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching trackers:", error);
    return [];
  }
}

/** Log (or replace) a day's value for a tracker. Returns the day key. */
export async function logTrackerValue(
  userId: string,
  trackerId: string,
  dateKey: string,
  value: number
): Promise<string> {
  await setDoc(doc(entriesCollection(userId, trackerId), dateKey), {
    userId,
    trackerId,
    dateKey,
    value,
    createdAt: Date.now(),
  });
  return dateKey;
}

/** The most recent `max` entries for a tracker, newest first. [] on error. */
export async function listTrackerEntries(
  userId: string,
  trackerId: string,
  max = 30
): Promise<TrackerEntry[]> {
  try {
    const q = query(
      entriesCollection(userId, trackerId),
      orderBy("dateKey", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapEntry(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching tracker entries:", error);
    return [];
  }
}
