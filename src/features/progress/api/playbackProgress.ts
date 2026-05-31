/**
 * ============================================================
 * features/progress/api/playbackProgress.ts — Resume points
 * ============================================================
 *
 * "Resume where you left off" playback positions for long-form content.
 * Split out of the legacy firestoreService.ts in Phase 3 (Group C).
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";

export interface PlaybackProgress {
  user_id: string;
  content_id: string;
  content_type: string;
  position_seconds: number;
  duration_seconds: number;
  updated_at: Timestamp;
}

const playbackProgressCollection = collection(db, "playback_progress");

/**
 * Save or update the playback position for a content item.
 *
 * This enables the "resume where you left off" feature. To avoid cluttering Firestore
 * with trivial updates, we use filtering heuristics:
 *   - Skip if position < 5 seconds (user just started)
 *   - Skip if position >= 95% of duration (nearly complete; mark as "completed" instead)
 *
 * Document ID is deterministic: `${userId}_${contentId}`, allowing idempotent upserts.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for filtering/analytics)
 * @param positionSeconds - Current playback position in seconds
 * @param durationSeconds - Total content duration in seconds
 */
export async function savePlaybackProgress(
  userId: string,
  contentId: string,
  contentType: string,
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  // Heuristic: skip if position is less than 5 seconds (user just started, not meaningful)
  if (positionSeconds < 5) return;

  // Heuristic: skip if content is nearly complete (95%+).
  // User should mark as completed instead, and progress will be cleared.
  if (durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95) return;

  try {
    const docId = `${userId}_${contentId}`;
    await setDoc(doc(playbackProgressCollection, docId), {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      position_seconds: positionSeconds,
      duration_seconds: durationSeconds,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving playback progress:", error);
  }
}

/**
 * Retrieve the saved playback position for a content item.
 *
 * Used at content launch to restore the user to their previous position.
 * Returns null if no progress has been saved (new content, or already completed).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns PlaybackProgress object with position/duration, or null if none found
 */
export async function getPlaybackProgress(
  userId: string,
  contentId: string
): Promise<PlaybackProgress | null> {
  try {
    const docId = `${userId}_${contentId}`;
    const docSnap = await getDoc(doc(playbackProgressCollection, docId));

    if (!docSnap.exists()) return null;

    return docSnap.data() as PlaybackProgress;
  } catch (error) {
    console.error("Error getting playback progress:", error);
    return null;
  }
}

/**
 * Clear playback progress after content completion.
 *
 * Called when the user reaches the end of content (or marks it complete).
 * Deletes the progress record so future plays start from the beginning.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 */
export async function clearPlaybackProgress(
  userId: string,
  contentId: string
): Promise<void> {
  try {
    const docId = `${userId}_${contentId}`;
    await deleteDoc(doc(playbackProgressCollection, docId));
  } catch (error) {
    console.error("Error clearing playback progress:", error);
  }
}
