/**
 * ============================================================
 * features/mood/api/moodEntries.ts — Mood check-in data access
 * ============================================================
 *
 * Firestore reads/writes for daily mood check-ins, stored per-user under
 * users/{uid}/moodEntries. One entry per day (v1): the document id is the local
 * date key (YYYY-MM-DD), so a re-check-in overwrites the day's entry rather than
 * appending. Reads degrade gracefully (null / []).
 *
 * Security: writes succeed only if Firestore rules allow
 *   match /users/{userId}/moodEntries/{id} { allow read, write: if
 *     request.auth.uid == userId; }
 * ============================================================
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { MoodEntry, MoodValue } from "../types";

/** The user's moodEntries subcollection reference. */
function moodCollection(userId: string) {
  return collection(db, "users", userId, "moodEntries");
}

/** Local date key (YYYY-MM-DD) used as the per-day document id. */
export function toDateKey(ms: number): string {
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function mapEntry(id: string, data: Record<string, unknown>, userId: string): MoodEntry {
  return {
    id,
    userId,
    value: data.value as MoodValue,
    note: typeof data.note === "string" ? data.note : undefined,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

/**
 * Record (or replace) today's mood check-in. Returns the day key written.
 *
 * Uses setDoc against the date-keyed document, so re-checking-in the same day
 * overwrites the entry entirely (replace semantics — single check-in per day).
 */
export async function checkInMood(
  userId: string,
  value: MoodValue,
  note?: string
): Promise<string> {
  const now = Date.now();
  const key = toDateKey(now);
  const data: Record<string, unknown> = { userId, value, createdAt: now };
  if (note && note.trim()) {
    data.note = note.trim();
  }
  await setDoc(doc(moodCollection(userId), key), data);
  return key;
}

/** Today's mood entry, or null if the user hasn't checked in yet today. */
export async function getTodayMood(userId: string): Promise<MoodEntry | null> {
  try {
    const key = toDateKey(Date.now());
    const snap = await getDoc(doc(moodCollection(userId), key));
    if (!snap.exists()) return null;
    return mapEntry(snap.id, snap.data(), userId);
  } catch (error) {
    console.error("Error fetching today's mood:", error);
    return null;
  }
}

/**
 * The most recent `days` mood entries (default 14), newest first. One per day,
 * so this is effectively the last `days` check-ins. Returns [] on error.
 */
export async function getMoodHistory(
  userId: string,
  days = 14
): Promise<MoodEntry[]> {
  try {
    const q = query(moodCollection(userId), orderBy("createdAt", "desc"), limit(days));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching mood history:", error);
    return [];
  }
}
