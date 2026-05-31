/**
 * ============================================================
 * features/breathing/api/exercises.ts — Breathing Firestore access
 * ============================================================
 *
 * Owns the breathing feature's data access. Split out of the legacy
 * `src/services/firestoreService.ts` mega-repository in Phase 3.
 * The old path keeps a barrel re-export so existing consumers don't
 * break; they migrate off it in Phase 5/6.
 * ============================================================
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";
import { BreathingExercise } from "../types";

const breathingCollection = collection(db, "breathing_exercises");

/**
 * Retrieve all breathing exercises.
 *
 * Simple collection read — exercises are standalone, not part of programs.
 *
 * @returns Array of breathing exercises
 *         Empty array on error (Graceful Degradation)
 */
export async function getBreathingExercises(): Promise<BreathingExercise[]> {
  try {
    const snapshot = await getDocs(breathingCollection);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        pattern: {
          inhale_duration: data.inhale_duration,
          hold_duration: data.hold_duration,
          exhale_duration: data.exhale_duration,
          pause_duration: data.pause_duration,
          cycles: data.cycles,
        },
        duration_minutes: Math.ceil(
          ((data.inhale_duration +
            (data.hold_duration || 0) +
            data.exhale_duration +
            (data.pause_duration || 0)) *
            data.cycles) /
            60
        ),
        difficulty_level: data.difficulty_level,
        benefits: data.benefits || [],
      } as BreathingExercise;
    });
  } catch (error) {
    console.error("Error fetching breathing exercises:", error);
    return [];
  }
}
