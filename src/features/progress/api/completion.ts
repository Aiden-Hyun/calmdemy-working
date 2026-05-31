/**
 * ============================================================
 * features/progress/api/completion.ts — Completion tracking
 * ============================================================
 *
 * Marks individual content items as completed (course/program progress).
 * Split out of the legacy firestoreService.ts in Phase 3 (Group C).
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";

const completedContentCollection = collection(db, "completed_content");

/**
 * Mark a piece of content as completed.
 *
 * This records the user's achievement and is used for:
 *   - Displaying progress bars (X of Y items completed)
 *   - Unlocking next modules (if course structure requires sequential completion)
 *   - Analytics (tracking course graduation rates)
 *
 * Document ID is deterministic: `${userId}_${contentId}`, allowing idempotent updates.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for filtering/analytics)
 */
export async function markContentCompleted(
  userId: string,
  contentId: string,
  contentType: string
): Promise<void> {
  try {
    const docId = `${userId}_${contentId}`;
    await setDoc(doc(completedContentCollection, docId), {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      completed_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking content as completed:", error);
  }
}

/**
 * Retrieve all completed content IDs for a given user and content type.
 *
 * Used to filter course/program content and show which items have been completed.
 * Returns a Set for fast O(1) lookup when rendering item lists.
 *
 * @param userId - The authenticated user's UID
 * @param contentType - Filter by content type (e.g., "course_session")
 * @returns Set of completed content IDs for fast lookup
 */
export async function getCompletedContentIds(
  userId: string,
  contentType: string
): Promise<Set<string>> {
  try {
    const q = query(
      completedContentCollection,
      where("user_id", "==", userId),
      where("content_type", "==", contentType)
    );
    const snapshot = await getDocs(q);
    const completedIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      completedIds.add(data.content_id);
    });
    return completedIds;
  } catch (error) {
    console.error("Error getting completed content:", error);
    return new Set<string>();
  }
}

/**
 * Check if a specific content item has been completed by the user.
 *
 * Quick existence check; used to show/hide "Resume" vs "Start" buttons.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns true if the content has been marked complete
 */
export async function isContentCompleted(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    const docId = `${userId}_${contentId}`;
    const docSnap = await getDoc(doc(completedContentCollection, docId));
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking content completion:", error);
    return false;
  }
}
