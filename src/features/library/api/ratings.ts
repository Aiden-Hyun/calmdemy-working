/**
 * ============================================================
 * features/library/api/ratings.ts — Ratings & reports
 * ============================================================
 *
 * User-generated quality signals (thumbs up/down, star ratings) and content
 * moderation reports. Split out of the legacy firestoreService.ts in Phase 3
 * (Group H).
 * ============================================================
 */

import {
  collection,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { RatingType, ReportCategory } from "../../../types";

const contentRatingsCollection = collection(db, "content_ratings");
const contentReportsCollection = collection(db, "content_reports");

/**
 * Retrieve the user's rating for a piece of content.
 *
 * Ratings are quality signals: typically "liked" / "disliked" or star counts.
 * Used to filter trending/popular content and personalize recommendations.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns The user's RatingType (e.g., "liked", "disliked"), or null if not rated
 */
export async function getUserRating(
  userId: string,
  contentId: string
): Promise<RatingType | null> {
  try {
    const q = query(
      contentRatingsCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().rating as RatingType;
  } catch (error) {
    console.error("Error getting user rating:", error);
    return null;
  }
}

/**
 * Set or toggle the user's rating for content (Idempotent Toggle pattern).
 *
 * Supports three cases:
 *   1. No existing rating → create a new rating document
 *   2. Different existing rating → update it (e.g., change "disliked" to "liked")
 *   3. Same existing rating → toggle off (delete the document)
 *
 * This gives users the ability to like/unlike or rate/unrate content, treating
 * the action as a toggle. Returns the new rating state (or null if toggled off).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for analytics/filtering)
 * @param rating - The rating to set (e.g., "liked", "disliked")
 * @returns The new rating state, or null if the rating was toggled off
 */
export async function setContentRating(
  userId: string,
  contentId: string,
  contentType: string,
  rating: RatingType
): Promise<RatingType | null> {
  try {
    // Phase 1: Check for existing rating
    const q = query(
      contentRatingsCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingRating = existingDoc.data().rating as RatingType;

      if (existingRating === rating) {
        // Phase 2a: Same rating — toggle off (idempotent unfavorite pattern)
        await deleteDoc(existingDoc.ref);
        return null; // New state: unrated
      } else {
        // Phase 2b: Different rating — update (user changed mind)
        await setDoc(existingDoc.ref, {
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          rating: rating,
          rated_at: serverTimestamp(),
        });
        return rating; // New state: updated rating
      }
    } else {
      // Phase 2c: No existing rating — create new
      await addDoc(contentRatingsCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        rating: rating,
        rated_at: serverTimestamp(),
      });
      return rating; // New state: newly rated
    }
  } catch (error) {
    console.error("Error setting content rating:", error);
    return null;
  }
}

/**
 * Submit a content report for moderation review.
 *
 * Users can report content for violations: spam, inappropriate material, copyright,
 * etc. These reports are reviewed by moderators and may result in content removal.
 * The description field allows users to provide context.
 *
 * @param userId - The authenticated user's UID (who is making the report)
 * @param contentId - Firestore document ID of the reported content
 * @param contentType - Content type (for filtering reports by content kind)
 * @param category - ReportCategory enum value (e.g., "inappropriate", "spam", "copyright")
 * @param description - Optional free-text context (e.g., "This guided meditation contains explicit language")
 * @returns true if the report was successfully submitted, false on error (Graceful Degradation)
 */
export async function reportContent(
  userId: string,
  contentId: string,
  contentType: string,
  category: ReportCategory,
  description?: string
): Promise<boolean> {
  try {
    await addDoc(contentReportsCollection, {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      category: category,
      description: description || null,
      reported_at: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error reporting content:", error);
    return false;
  }
}
