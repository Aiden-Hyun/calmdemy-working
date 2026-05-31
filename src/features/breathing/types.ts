/**
 * ============================================================
 * features/breathing/types.ts — Breathing feature domain types
 * ============================================================
 *
 * Owned by the breathing feature. Other features should not import
 * these directly; if they need to, surface them through index.ts.
 *
 * After Phase 3 these types are only consumed inside the feature
 * (api/exercises, hooks/useBreathing, screens/BreathingScreen,
 * data/techniques) — no cross-feature imports remain.
 * ============================================================
 */

/**
 * Breathing pattern: structure of a single breathing cycle.
 *
 * All durations in seconds. Example — Box Breathing (4-4-4-4):
 *   { inhale_duration: 4, hold_duration: 4, exhale_duration: 4,
 *     pause_duration: 4, cycles: 5 }
 */
export interface BreathingPattern {
  inhale_duration: number;
  hold_duration?: number;
  exhale_duration: number;
  pause_duration?: number;
  cycles: number;
}

/**
 * Breathing exercise content stored in Firestore /breathingExercises.
 *
 * Standalone technique with pattern instructions and metadata.
 * Currently not actively used by the breathing screen (which renders
 * a hardcoded `data/techniques.ts` catalogue); kept for the planned
 * Firestore-backed exercise library.
 */
export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  pattern: BreathingPattern;
  duration_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  benefits: string[];
}

/**
 * UI catalogue entry used by `data/techniques.ts` and the breathing
 * screen. Adds the visual presentation (gradient, benefits chips) on
 * top of the data shape.
 */
export interface BreathingTechnique {
  id: string;
  name: string;
  description: string;
  pattern: BreathingPattern;
  benefits: string[];
  gradient: [string, string];
}
