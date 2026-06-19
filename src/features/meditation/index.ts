/**
 * ============================================================
 * features/meditation/index.ts — Public API
 * ============================================================
 *
 * Screens (consumed by route files), the meditation query hooks, useMeditation,
 * and the manifest. (useEmergencyMeditations moved to features/emergency in 6d-4.)
 *
 * Domain types (GuidedMeditation / MeditationTheme / MeditationTechnique /
 * MeditationCategory) now live in ./types, relocated from src/types/index.ts
 * in 6d-4. Template application + category-array reconciliation remain deferred
 * per the 6c "relocate as-is" decision.
 * ============================================================
 */

export { MeditateHomeScreen } from './screens/MeditateHomeScreen';
export { MeditationPlayerScreen } from './screens/MeditationPlayerScreen';
export { AllMeditationsScreen } from './screens/AllMeditationsScreen';
export { TechniquesScreen } from './screens/TechniquesScreen';
export { TherapiesScreen } from './screens/TherapiesScreen';
export {
  useCourses,
  useGuidedMeditations,
  useMeditationsByTheme,
  useMeditationsByTechnique,
} from './hooks/queries';
export { useMeditation } from './hooks/useMeditation';
// getCourseById surfaced for library's contentTypes registry when the
// firestoreService barrel was deleted (Phase 6e-B). getCourses is surfaced for
// library's polymorphic content resolver (api/content.ts) — both consumed
// through this public index (Phase 8: feature → feature via index.ts only).
export { getCourseById, getCourses } from './api/courses';
export { manifest } from './manifest';
