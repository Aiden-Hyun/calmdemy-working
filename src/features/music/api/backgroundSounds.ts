/**
 * ============================================================
 * features/music/api/backgroundSounds.ts — Background sound access
 * ============================================================
 *
 * Ambient sounds for work/focus (ambient noise, coffee shop, etc.).
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

export interface FirestoreBackgroundSound {
  id: string;
  title: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
}

/**
 * Retrieve all background sounds.
 *
 * Simple full-collection read for ambient focus/work sounds.
 *
 * @returns Array of all background sounds
 *         Empty array on error (Graceful Degradation)
 */
export async function getBackgroundSounds(): Promise<
  FirestoreBackgroundSound[]
> {
  try {
    const snapshot = await getDocs(collection(db, "background_sounds"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreBackgroundSound)
    );
  } catch (error) {
    console.error("Error fetching background sounds:", error);
    return [];
  }
}

/**
 * Retrieve background sounds filtered by category.
 *
 * @param category - Category to filter by (e.g., "coffee-shop", "ambient")
 * @returns Array of background sounds matching the category
 *         Empty array on error (Graceful Degradation)
 */
export async function getBackgroundSoundsByCategory(
  category: string
): Promise<FirestoreBackgroundSound[]> {
  try {
    const q = query(
      collection(db, "background_sounds"),
      where("category", "==", category)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreBackgroundSound)
    );
  } catch (error) {
    console.error("Error fetching background sounds by category:", error);
    return [];
  }
}

/**
 * Retrieve a single background sound by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The background sound object, or null if not found
 */
export async function getBackgroundSoundById(
  id: string
): Promise<FirestoreBackgroundSound | null> {
  try {
    const docRef = doc(db, "background_sounds", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as FirestoreBackgroundSound;
  } catch (error) {
    console.error("Error fetching background sound:", error);
    return null;
  }
}
