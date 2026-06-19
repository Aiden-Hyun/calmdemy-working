/**
 * ============================================================
 * features/journal/api/entries.ts — Journal entries data access
 * ============================================================
 *
 * Firestore reads/writes for journal entries, stored per-user under the
 * subcollection users/{uid}/journalEntries. Append-only in v1 (create + read;
 * no update/delete). All reads degrade gracefully (return [] / null on error).
 *
 * Security: writes succeed only if Firestore rules allow
 *   match /users/{userId}/journalEntries/{id} { allow read, write: if
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
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { JournalEntry } from "../types";

/** The user's journalEntries subcollection reference. */
function entriesCollection(userId: string) {
  return collection(db, "users", userId, "journalEntries");
}

/**
 * Create a new journal entry. Returns the new document id.
 *
 * `createdAt` is stamped client-side (Date.now()) to keep the type a plain
 * number; v1 accepts the minor clock-skew tradeoff over a serverTimestamp()
 * that would need Timestamp→number conversion on every read.
 */
export async function createJournalEntry(
  userId: string,
  input: { text: string; promptId?: string }
): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    text: input.text,
    createdAt: Date.now(),
  };
  // Only persist promptId when present — keeps the document clean for free-form
  // entries (and Firestore rejects `undefined` field values).
  if (input.promptId) {
    data.promptId = input.promptId;
  }
  const docRef = await addDoc(entriesCollection(userId), data);
  return docRef.id;
}

/**
 * All of the user's journal entries, most recent first.
 * Returns [] on error (Graceful Degradation).
 */
export async function getJournalEntries(userId: string): Promise<JournalEntry[]> {
  try {
    const q = query(entriesCollection(userId), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId,
        text: data.text ?? "",
        promptId: data.promptId,
        createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
      } as JournalEntry;
    });
  } catch (error) {
    console.error("Error fetching journal entries:", error);
    return [];
  }
}

/**
 * A single journal entry by id (used by the detail screen / deep links).
 * Returns null if missing or on error.
 */
export async function getJournalEntryById(
  userId: string,
  entryId: string
): Promise<JournalEntry | null> {
  try {
    const snap = await getDoc(doc(entriesCollection(userId), entryId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      userId,
      text: data.text ?? "",
      promptId: data.promptId,
      createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    } as JournalEntry;
  } catch (error) {
    console.error("Error fetching journal entry:", error);
    return null;
  }
}
