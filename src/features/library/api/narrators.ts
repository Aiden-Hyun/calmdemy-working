/**
 * ============================================================
 * features/library/api/narrators.ts — Narrator metadata
 * ============================================================
 *
 * Metadata about content narrators/instructors (biographies, photos), with a
 * simple in-memory Cache-Aside for frequently accessed names. Split out of the
 * legacy firestoreService.ts in Phase 3 (Group H).
 * ============================================================
 */

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { FirestoreNarrator } from "../../../shared/types/content";

/**
 * In-memory cache for narrator lookups (Cache-Aside pattern).
 * Populated by getNarrators() and getNarratorByName(), keyed by lowercase name.
 * Trades off eventual consistency for reduced Firestore queries.
 */
const narratorCache: Map<string, FirestoreNarrator> = new Map();

/**
 * Retrieve all narrators.
 *
 * Populates the narratorCache for subsequent name-based lookups.
 *
 * @returns Array of all narrators
 *         Empty array on error (Graceful Degradation)
 */
export async function getNarrators(): Promise<FirestoreNarrator[]> {
  try {
    const snapshot = await getDocs(collection(db, "narrators"));
    const narrators = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreNarrator)
    );
    // Update cache
    narrators.forEach((n) => narratorCache.set(n.name.toLowerCase(), n));
    return narrators;
  } catch (error) {
    console.error("Error fetching narrators:", error);
    return [];
  }
}

/**
 * Retrieve a narrator by name (Cache-Aside pattern).
 *
 * Checks the in-memory cache first; if not found, queries Firestore and caches the result.
 * This avoids repeated queries for the same narrator across multiple features/screens.
 *
 * @param name - The narrator's name (case-insensitive)
 * @returns The narrator object, or null if not found
 */
export async function getNarratorByName(
  name: string
): Promise<FirestoreNarrator | null> {
  // Cache lookup (case-insensitive)
  const cached = narratorCache.get(name.toLowerCase());
  if (cached) return cached;

  try {
    const q = query(collection(db, "narrators"), where("name", "==", name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const narrator = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as FirestoreNarrator;

    // Update cache for future lookups
    narratorCache.set(name.toLowerCase(), narrator);
    return narrator;
  } catch (error) {
    console.error("Error fetching narrator by name:", error);
    return null;
  }
}

/**
 * Get a narrator's profile photo URL by name (cache-based lookup).
 *
 * Synchronous function that checks only the in-memory cache (doesn't hit Firestore).
 * Use after calling getNarrators() or getNarratorByName() to ensure the cache is warm.
 *
 * @param name - The narrator's name (case-insensitive)
 * @returns The photo URL, or null if not found in cache
 */
export function getNarratorProfileUrl(name: string): string | null {
  const cached = narratorCache.get(name.toLowerCase());
  return cached?.photoUrl || null;
}
