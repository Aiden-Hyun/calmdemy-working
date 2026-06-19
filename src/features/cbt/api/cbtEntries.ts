/**
 * ============================================================
 * features/cbt/api/cbtEntries.ts — CBT entries data access
 * ============================================================
 *
 * Firestore reads/writes for completed CBT exercises, stored per-user under
 * users/{uid}/cbtEntries. Append-only (create + read; no update/delete in v1).
 * Reads degrade gracefully ([] / null).
 *
 * Security: writes succeed only if Firestore rules allow
 *   match /users/{userId}/cbtEntries/{id} { allow read, write: if
 *     request.auth.uid == userId; }
 * ============================================================
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { CbtEntry, CbtMethod } from "../types";

/** The user's cbtEntries subcollection reference. */
function cbtCollection(userId: string) {
  return collection(db, "users", userId, "cbtEntries");
}

function mapEntry(id: string, data: Record<string, unknown>, userId: string): CbtEntry {
  return {
    id,
    userId,
    method: data.method as CbtMethod,
    steps:
      data.steps && typeof data.steps === "object"
        ? (data.steps as Record<string, string>)
        : {},
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

/** Create a CBT entry. Returns the new document id. */
export async function createCbtEntry(
  userId: string,
  method: CbtMethod,
  steps: Record<string, string>
): Promise<string> {
  const docRef = await addDoc(cbtCollection(userId), {
    userId,
    method,
    steps,
    createdAt: Date.now(),
  });
  return docRef.id;
}

/**
 * The user's most recent CBT entries (default last 10), newest first.
 * Returns [] on error.
 */
export async function getCbtHistory(userId: string, max = 10): Promise<CbtEntry[]> {
  try {
    const q = query(cbtCollection(userId), orderBy("createdAt", "desc"), limit(max));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapEntry(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching CBT history:", error);
    return [];
  }
}

/** A single CBT entry by id (detail / deep links). Null if missing or on error. */
export async function getCbtEntryById(
  userId: string,
  entryId: string
): Promise<CbtEntry | null> {
  try {
    const snap = await getDoc(doc(cbtCollection(userId), entryId));
    if (!snap.exists()) return null;
    return mapEntry(snap.id, snap.data(), userId);
  } catch (error) {
    console.error("Error fetching CBT entry:", error);
    return null;
  }
}
