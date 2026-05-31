/**
 * ============================================================
 * features/sleep/api/sleepMeditations.ts — Sleep meditation access
 * ============================================================
 *
 * Specialized meditation content optimized for sleep induction.
 * Split out of the legacy firestoreService.ts in Phase 3 (Group F).
 *
 * Note: library's polymorphic getContentById resolves `sleep_meditation`
 * content using getSleepMeditationById and this interface; during Phase 3 the
 * barrel re-exports them, Phase 5 imports directly from here.
 * ============================================================
 */

import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";

/**
 * Sleep meditation data model.
 */
export interface FirestoreSleepMeditation {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  instructor: string;
  icon: string;
  audioPath: string;
  thumbnailUrl?: string;
  color: string;
  isFree?: boolean;
}

/**
 * Retrieve all sleep meditations.
 *
 * Sleep meditations are specialized content designed to help users fall asleep.
 * This is a full-collection read; typically cached via React Query for performance.
 *
 * @returns Array of sleep meditations with all fields
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepMeditations(): Promise<
  FirestoreSleepMeditation[]
> {
  try {
    const snapshot = await getDocs(collection(db, "sleep_meditations"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepMeditation)
    );
  } catch (error) {
    console.error("Error fetching sleep meditations:", error);
    return [];
  }
}

/**
 * Retrieve a single sleep meditation by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns Sleep meditation object, or null if not found
 */
export async function getSleepMeditationById(
  id: string
): Promise<FirestoreSleepMeditation | null> {
  try {
    const docRef = doc(db, "sleep_meditations", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as FirestoreSleepMeditation;
  } catch (error) {
    console.error("Error fetching sleep meditation:", error);
    return null;
  }
}
