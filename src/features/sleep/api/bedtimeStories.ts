/**
 * ============================================================
 * features/sleep/api/bedtimeStories.ts — Bedtime story access
 * ============================================================
 *
 * Split out of the legacy firestoreService.ts in Phase 3 (Group F).
 * `getSleepStories` / `getSleepStoryById` are legacy aliases kept for
 * backward compatibility.
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { BedtimeStory } from "../types";

const bedtimeStoriesCollection = collection(db, "bedtime_stories");

/**
 * Retrieve all bedtime stories.
 *
 * Stories are simple documents with title, narrator, duration, and audio URL.
 *
 * @returns Array of bedtime stories
 *         Empty array on error (Graceful Degradation)
 */
export async function getBedtimeStories(): Promise<BedtimeStory[]> {
  try {
    const q = query(bedtimeStoriesCollection, orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as BedtimeStory)
    );
  } catch (error) {
    console.error("Error fetching bedtime stories:", error);
    return [];
  }
}

/**
 * Retrieve a single bedtime story by ID.
 *
 * Direct document lookup, returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The story object, or null if not found
 */
export async function getBedtimeStoryById(
  id: string
): Promise<BedtimeStory | null> {
  try {
    const docRef = doc(db, "bedtime_stories", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as BedtimeStory;
  } catch (error) {
    console.error("Error fetching bedtime story:", error);
    return null;
  }
}

// Legacy aliases for backward compatibility
export const getSleepStories = getBedtimeStories;
export const getSleepStoryById = getBedtimeStoryById;
