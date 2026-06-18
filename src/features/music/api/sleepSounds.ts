/**
 * ============================================================
 * features/music/api/sleepSounds.ts — Sleep sound access
 * ============================================================
 *
 * Ambient nature sounds and sleep soundscapes (water, rain, forest, etc.).
 * Split out of the legacy firestoreService.ts in Phase 3 (Group G).
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { FirestoreSleepSound } from "../../../shared/types/content";

/**
 * Retrieve all sleep sounds.
 *
 * Simple full-collection read. Typically paired with React Query for caching.
 *
 * @returns Array of all sleep sounds
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepSounds(): Promise<FirestoreSleepSound[]> {
  try {
    const snapshot = await getDocs(collection(db, "sleep_sounds"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepSound)
    );
  } catch (error) {
    console.error("Error fetching sleep sounds:", error);
    return [];
  }
}

/**
 * Retrieve sleep sounds filtered by category.
 *
 * Special case: category === "all" bypasses the filter and returns all sounds.
 *
 * @param category - Category to filter by (e.g., "nature", "urban"), or "all"
 * @returns Array of sleep sounds matching the category
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepSoundsByCategory(
  category: string
): Promise<FirestoreSleepSound[]> {
  try {
    if (category === "all") return getSleepSounds();
    const q = query(
      collection(db, "sleep_sounds"),
      where("category", "==", category)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepSound)
    );
  } catch (error) {
    console.error("Error fetching sleep sounds by category:", error);
    return [];
  }
}

/**
 * Retrieve a single sleep sound by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The sleep sound object, or null if not found
 */
export async function getSleepSoundById(
  id: string
): Promise<FirestoreSleepSound | null> {
  try {
    const docRef = doc(db, "sleep_sounds", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as FirestoreSleepSound;
  } catch (error) {
    console.error("Error fetching sleep sound by id:", error);
    return null;
  }
}
