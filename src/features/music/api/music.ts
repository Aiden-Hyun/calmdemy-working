/**
 * ============================================================
 * features/music/api/music.ts — White noise / music / ASMR access
 * ============================================================
 *
 * Ambient audio collections (background sounds for relaxation, sleep, focus).
 * Split out of the legacy firestoreService.ts in Phase 3 (Group G).
 * ============================================================
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { FirestoreMusicItem } from "../../../shared/types/content";

/**
 * Retrieve all white noise tracks.
 *
 * White noise (e.g., static, fan hum) is used for masking environmental noise
 * and aiding sleep/focus.
 *
 * @returns Array of all white noise items
 *         Empty array on error (Graceful Degradation)
 */
export async function getWhiteNoise(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "white_noise"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching white noise:", error);
    return [];
  }
}

/**
 * Retrieve all music tracks.
 *
 * Music for relaxation, meditation, or background listening.
 *
 * @returns Array of all music items
 *         Empty array on error (Graceful Degradation)
 */
export async function getMusic(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "music"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching music:", error);
    return [];
  }
}

/**
 * Retrieve all ASMR tracks.
 *
 * ASMR (Autonomous Sensory Meridian Response) content: whispering, tapping, etc.
 * Popular for relaxation and sleep.
 *
 * @returns Array of all ASMR items
 *         Empty array on error (Graceful Degradation)
 */
export async function getAsmr(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "asmr"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching asmr:", error);
    return [];
  }
}
