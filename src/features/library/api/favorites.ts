/**
 * ============================================================
 * features/library/api/favorites.ts — User favorites
 * ============================================================
 *
 * User-maintained lists of favorited content (music, stories, meditations, etc.).
 * Denormalized: metadata is stored redundantly in the favorite document to avoid
 * N+1 queries when displaying favorites. Split out of the legacy
 * firestoreService.ts in Phase 3 (Group H).
 * ============================================================
 */

import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { UserFavorite } from "../types";

const favoritesCollection = collection(db, "user_favorites");

/**
 * Retrieve all favorites for a user.
 *
 * This reads from a dedicated "user_favorites" collection, which is a Denormalized
 * view: each favorite document contains not only IDs but also metadata (title,
 * thumbnail URL, duration) for fast rendering. Without denormalization, rendering
 * a favorites list would require a separate fetch for each item (N+1 problem).
 *
 * Firestore limitation note: we cannot use orderBy + where together without a
 * composite index. To avoid index overhead, we fetch unordered and sort client-side
 * by favorited_at (most recent first). This trades off a bit of client computation
 * for simpler Firestore setup.
 *
 * @param userId - The authenticated user's UID
 * @returns Array of favorites sorted by favorited_at descending
 *         Empty array on error (Graceful Degradation)
 */
export async function getUserFavorites(
  userId: string
): Promise<UserFavorite[]> {
  try {
    // Query phase: fetch all favorites for this user (no orderBy, to avoid index)
    const q = query(favoritesCollection, where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    // Transform phase: convert Firestore Timestamp objects to ISO strings
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestamp Conversion: Same pattern as getUserSessions
        favorited_at:
          data.favorited_at instanceof Timestamp
            ? data.favorited_at.toDate().toISOString()
            : new Date().toISOString(),
      } as UserFavorite;
    });

    // Client-side Sort (in-app sorting avoids the need for a composite index)
    return items.sort(
      (a, b) =>
        new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime()
    );
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

/**
 * Toggle favorite status for a piece of content.
 *
 * This is an Idempotent Toggle: it checks for an existing favorite document
 * and either deletes it (unfavorite) or creates it (favorite). The operation
 * is idempotent: calling it twice in a row with the same contentId has the
 * same effect as calling it once.
 *
 * Deduplication note: we query by (user_id, content_id) but DON'T filter by
 * content_type. This handles legacy data where an item might be favorited with
 * the wrong type. If we find ANY favorite record for this (user, content), we
 * delete all of them (handles duplicates/corruption).
 *
 * Denormalization: we store metadata (title, thumbnail, duration) redundantly
 * in the favorite document. This supports fast favorites lists without N+1 lookups.
 * If metadata changes in the source (meditation document), favorites will serve
 * stale metadata until the next favorite/unfavorite cycle. This is an acceptable
 * tradeoff (Eventual Consistency).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the content being favorited
 * @param contentType - Discriminated union tag: "meditation", "nature_sound", etc.
 *                     Used for context; all types stored in the same collection
 * @param metadata - Denormalized content metadata (title, thumbnail, duration)
 *                  Stored alongside the favorite for instant display
 * @returns true if the item is now favorited, false if it was removed
 */
export async function toggleFavorite(
  userId: string,
  contentId: string,
  contentType:
    | "meditation"
    | "nature_sound"
    | "bedtime_story"
    | "breathing_exercise"
    | "series_chapter"
    | "album_track"
    | "emergency"
    | "course_session"
    | "sleep_meditation",
  metadata?: {
    title: string;
    thumbnail_url?: string;
    duration_minutes: number;
    course_code?: string;
    session_code?: string;
  }
): Promise<boolean> {
  try {
    // Phase 1: Check for existing favorite (Deduplication pattern)
    // Query ignores content_type; if ANY favorite exists for this (user, content),
    // we delete it (handles legacy entries with wrong type or duplicates)
    const q = query(
      favoritesCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const existing = await getDocs(q);

    if (!existing.empty) {
      // Phase 2a: Unfavorite — batch-delete all matching docs (handles duplicates)
      const deletePromises = existing.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return false; // New state: unfavorited
    } else {
      // Phase 2b: Favorite — create new favorite document with denormalized metadata
      await addDoc(favoritesCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType, // Stored for analytics/debugging, not used in queries
        favorited_at: serverTimestamp(),
        // Denormalization: embed metadata to avoid N+1 lookups when displaying favorites.
        // Optional fields are conditionally included to keep document size minimal.
        ...(metadata && {
          title: metadata.title,
          thumbnail_url: metadata.thumbnail_url || null,
          duration_minutes: metadata.duration_minutes,
          ...(metadata.course_code && { course_code: metadata.course_code }),
          ...(metadata.session_code && { session_code: metadata.session_code }),
        }),
      });
      return true; // New state: favorited
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }
}

/**
 * Check if a piece of content is in the user's favorites (boolean query).
 *
 * This is a quick existence check without fetching the full document.
 * Used by UI to show/hide favorite buttons without loading metadata.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the content
 * @returns true if the content is favorited, false otherwise
 */
export async function isFavorite(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    const q = query(
      favoritesCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
}
