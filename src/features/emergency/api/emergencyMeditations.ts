/**
 * ============================================================
 * features/emergency/api/emergencyMeditations.ts — Emergency Firestore access
 * ============================================================
 *
 * Owns the emergency feature's data access. Split out of the legacy
 * `src/services/firestoreService.ts` mega-repository in Phase 3 (Group B).
 * The old path keeps a barrel re-export so existing consumers don't
 * break; they migrate off it in Phase 5/6.
 * ============================================================
 */

import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { FirestoreEmergencyMeditation } from "../../../shared/types/content";

/**
 * Retrieve all emergency meditations.
 *
 * Emergency meditations are short, high-impact content for immediate anxiety relief.
 * Typically 1-5 minutes, these are designed for moments of acute stress or panic.
 *
 * @returns Array of emergency meditations
 *         Empty array on error (Graceful Degradation)
 */
export async function getEmergencyMeditations(): Promise<
  FirestoreEmergencyMeditation[]
> {
  try {
    const snapshot = await getDocs(collection(db, "emergency_meditations"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreEmergencyMeditation)
    );
  } catch (error) {
    console.error("Error fetching emergency meditations:", error);
    return [];
  }
}

/**
 * Retrieve a single emergency meditation by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns Emergency meditation object, or null if not found
 */
export async function getEmergencyMeditationById(
  id: string
): Promise<FirestoreEmergencyMeditation | null> {
  try {
    const docRef = doc(db, "emergency_meditations", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return {
      id: docSnap.id,
      ...docSnap.data(),
      isFree: true,
    } as FirestoreEmergencyMeditation;
  } catch (error) {
    console.error("Error fetching emergency meditation:", error);
    return null;
  }
}
