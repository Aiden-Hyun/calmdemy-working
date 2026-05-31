/**
 * ============================================================
 * features/progress/api/listeningHistory.ts — Listening history
 * ============================================================
 *
 * Audit trail of user content consumption (denormalized for fast rendering).
 * Split out of the legacy firestoreService.ts in Phase 3 (Group C).
 * ============================================================
 */

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { ListeningHistoryItem } from "../../../types";

const listeningHistoryCollection = collection(db, "listening_history");

/**
 * Add a content play to the user's listening history.
 *
 * Denormalization: we store content metadata (title, thumbnail, duration) in the
 * history record itself. This allows rendering the history without re-fetching
 * content details, and persists the title even if the original is updated/deleted.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the played content
 * @param contentType - Discriminated union tag for the content type
 * @param contentTitle - Denormalized title (stored in case source is deleted)
 * @param durationMinutes - Length of the content (for time-spent analytics)
 * @param contentThumbnail - Denormalized thumbnail URL
 * @param courseCode - If this is a course_session, the parent course code (e.g., "CBT101")
 * @param sessionCode - If this is a course_session, this session's code (e.g., "CBT101M1L1")
 * @returns The ID of the newly created history record
 */
export async function addToListeningHistory(
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
  contentTitle: string,
  durationMinutes: number,
  contentThumbnail?: string,
  courseCode?: string,
  sessionCode?: string
): Promise<string> {
  try {
    const docData: Record<string, any> = {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      content_title: contentTitle,
      content_thumbnail: contentThumbnail || null,
      duration_minutes: durationMinutes,
      played_at: serverTimestamp(),
    };

    // Add course codes for course_session content type
    if (courseCode) {
      docData.course_code = courseCode;
    }
    if (sessionCode) {
      docData.session_code = sessionCode;
    }

    const docRef = await addDoc(listeningHistoryCollection, docData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error adding to listening history:", error);
    return "";
  }
}

/**
 * Retrieve the user's listening history (recently played content).
 *
 * This demonstrates the Deduplication pattern: even if a user plays the same
 * content multiple times, we only return the most recent play per content ID.
 * This makes the UI less cluttered and highlights what the user is currently engaged with.
 *
 * Client-side processing: we fetch all history records and sort/deduplicate locally
 * to avoid a composite Firestore index. For large histories (1000+ items), consider
 * pagination or delegating to a Cloud Function.
 *
 * @param userId - The authenticated user's UID
 * @param maxLimit - Maximum number of unique items to return (default: 10)
 * @returns Array of recently-played content (deduped, sorted by most recent first)
 *         Empty array on error (Graceful Degradation)
 */
export async function getListeningHistory(
  userId: string,
  maxLimit = 10
): Promise<ListeningHistoryItem[]> {
  try {
    // Fetch recent history sorted by Firestore, with a generous limit to allow
    // for deduplication (user may replay the same content multiple times).
    const fetchLimit = maxLimit * 5;
    const q = query(
      listeningHistoryCollection,
      where("user_id", "==", userId),
      orderBy("played_at", "desc"),
      limit(fetchLimit)
    );
    const snapshot = await getDocs(q);

    // Transform Timestamp objects to ISO strings
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        played_at:
          data.played_at instanceof Timestamp
            ? data.played_at.toDate().toISOString()
            : new Date().toISOString(),
      } as ListeningHistoryItem;
    });

    // Deduplication — keep only the most recent play per content
    const seen = new Set<string>();
    const deduplicated = items.filter((item) => {
      if (seen.has(item.content_id)) return false;
      seen.add(item.content_id);
      return true;
    });

    return deduplicated.slice(0, maxLimit);
  } catch (error: any) {
    console.error("Error fetching listening history:", error);
    return [];
  }
}
