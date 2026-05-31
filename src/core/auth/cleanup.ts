/**
 * ============================================================
 * core/auth/cleanup.ts — Account-deletion data purge
 * ============================================================
 *
 * Cross-collection cleanup invoked from AuthContext.deleteAccount. Lives in
 * core (not a feature) because it is auth housekeeping that touches data owned
 * by many features. Split out of the legacy firestoreService.ts in Phase 3
 * (Group D); the barrel still re-exports `deleteUserAccount` so consumers stay
 * unchanged.
 *
 * Phase 6 may evolve this into a `cleanup-registry` where each feature registers
 * its own teardown hook at boot. For now it is deliberately single-purpose and
 * owns its own collection references by path.
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const favoritesCollection = collection(db, "user_favorites");
const listeningHistoryCollection = collection(db, "listening_history");
const sessionsCollection = collection(db, "meditation_sessions");
const playbackProgressCollection = collection(db, "playback_progress");
const completedContentCollection = collection(db, "completed_content");
const usersCollection = collection(db, "users");

/**
 * Permanently delete all user data from Firestore (GDPR compliance).
 *
 * This performs a cross-collection purge: after the user initiates account deletion,
 * this function removes all Firestore documents associated with the user's UID.
 * Call this BEFORE deleting the Firebase Auth account (if Auth account is deleted first,
 * you lose the UID and cannot query by user_id).
 *
 * Affected collections:
 *   - user_favorites: All favorited content
 *   - listening_history: Full playback audit trail
 *   - meditation_sessions: All completed sessions
 *   - playback_progress: Resume points
 *   - completed_content: Course/program progress
 *   - users: The user's stats document
 *
 * Implementation note: We use a batch query+delete pattern (fetch all docs matching
 * user_id, then batch-delete them). For large user datasets, consider using a
 * Cloud Function to handle this asynchronously, or Firestore's bulk delete API.
 *
 * @param userId - The authenticated user's UID
 * @throws Error if any delete operation fails (transaction incomplete)
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  console.log(`Starting account deletion for user: ${userId}`);

  try {
    // Helper: Query and batch-delete all docs from a collection matching a field value
    // This pattern queries then mass-deletes in parallel, avoiding a composite index.
    const deleteCollection = async (
      collectionRef: ReturnType<typeof collection>,
      fieldName: string
    ) => {
      const q = query(collectionRef, where(fieldName, "==", userId));
      const snapshot = await getDocs(q);
      // Batch delete: Promise.all() ensures all deletes happen in parallel
      const deletePromises = snapshot.docs.map((docSnapshot) =>
        deleteDoc(docSnapshot.ref)
      );
      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.docs.length} docs from ${collectionRef.path}`);
    };

    // Phase 1: Delete user data from all collections
    await deleteCollection(favoritesCollection, "user_id");
    await deleteCollection(listeningHistoryCollection, "user_id");
    await deleteCollection(sessionsCollection, "user_id");
    await deleteCollection(playbackProgressCollection, "user_id");
    await deleteCollection(completedContentCollection, "user_id");

    // Phase 2: Delete the user's stats/profile document
    const userDocRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      await deleteDoc(userDocRef);
      console.log("Deleted user document");
    }

    console.log("Account deletion complete");
  } catch (error) {
    console.error("Error deleting user account data:", error);
    throw error;
  }
}
