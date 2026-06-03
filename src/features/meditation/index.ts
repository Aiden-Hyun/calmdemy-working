/**
 * ============================================================
 * features/meditation/index.ts — Public API
 * ============================================================
 *
 * Screens (consumed by route files), the meditation query hooks (consumed by
 * Home for useEmergencyMeditations until Home migrates), useMeditation, and
 * the manifest.
 *
 * NOTE: useEmergencyMeditations currently lives in this feature's queries
 * (relocated as-is from useMeditateQueries). It really belongs to the
 * emergency feature — flagged for a later cleanup.
 *
 * NOTE: the GuidedMeditation / MeditationTechnique types stay in
 * src/types/index.ts for now (they're entangled with MeditationTheme /
 * MeditationCategory); the feature reads them via the neutral types path.
 * Template application + category-array reconciliation were deferred per the
 * 6c "relocate as-is" decision.
 * ============================================================
 */

export { MeditateHomeScreen } from './screens/MeditateHomeScreen';
export { MeditationPlayerScreen } from './screens/MeditationPlayerScreen';
export { AllMeditationsScreen } from './screens/AllMeditationsScreen';
export { TechniquesScreen } from './screens/TechniquesScreen';
export { TherapiesScreen } from './screens/TherapiesScreen';
export {
  useEmergencyMeditations,
  useCourses,
  useGuidedMeditations,
  useMeditationsByTheme,
  useMeditationsByTechnique,
} from './hooks/queries';
export { useMeditation } from './hooks/useMeditation';
export { manifest } from './manifest';
