/**
 * ============================================================
 * features/meditation/api/meditations.ts — Guided meditation access
 * ============================================================
 *
 * Retrieval of guided meditation metadata by id, theme, and technique.
 * Split out of the legacy firestoreService.ts in Phase 3 (Group E).
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
import { GuidedMeditation } from "../types";

const meditationsCollection = collection(db, "guided_meditations");

/**
 * Retrieve all guided meditations from the collection.
 *
 * This performs an unconditional full-collection scan. Suitable for client-side
 * filtering, caching, or building indices. The Graceful Degradation pattern
 * applies: if the query fails, we return an empty array so the UI doesn't crash.
 *
 * @returns Array of meditations with all fields and isFree flag set to true
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditations(): Promise<GuidedMeditation[]> {
  try {
    const snapshot = await getDocs(meditationsCollection);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations:", error);
    return [];
  }
}

/**
 * Retrieve meditations by theme using Firestore's array-contains operator.
 *
 * Firestore schema: each meditation has a "themes" array field (e.g., ["stress", "sleep"]).
 * This uses array-contains to match meditations where themes includes the given theme.
 * Note: requires a composite index if combined with other filters, but a single
 * array-contains clause uses the built-in array index (automatic, no configuration needed).
 *
 * @param theme - A single theme string to match (e.g., "stress", "sleep", "morning")
 * @returns Array of meditations tagged with the given theme
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditationsByTheme(
  theme: string
): Promise<GuidedMeditation[]> {
  try {
    const q = query(
      meditationsCollection,
      where("themes", "array-contains", theme)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations by theme:", error);
    return [];
  }
}

/**
 * Retrieve meditations by technique using Firestore's array-contains operator.
 *
 * Analogous to getMeditationsByTheme(), but filters on the "techniques" array field
 * (e.g., ["body-scan", "breathing"]) instead of themes. Allows users to find content
 * by practice method rather than by topic/mood.
 *
 * @param technique - A single technique string to match (e.g., "body-scan", "breathing")
 * @returns Array of meditations tagged with the given technique
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditationsByTechnique(
  technique: string
): Promise<GuidedMeditation[]> {
  try {
    const q = query(
      meditationsCollection,
      where("techniques", "array-contains", technique)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations by technique:", error);
    return [];
  }
}

/**
 * Retrieve a single meditation by document ID.
 *
 * Direct document access is the fastest Firestore operation (no index required).
 * Returns null if the document doesn't exist (Graceful Degradation).
 *
 * @param id - The Firestore document ID of the meditation
 * @returns The meditation object, or null if not found or on error
 */
export async function getMeditationById(
  id: string
): Promise<GuidedMeditation | null> {
  try {
    const docRef = doc(meditationsCollection, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as GuidedMeditation;
  } catch (error) {
    console.error("Error fetching meditation by id:", error);
    return null;
  }
}
