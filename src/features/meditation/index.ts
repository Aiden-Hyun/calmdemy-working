/**
 * ============================================================
 * features/meditation/index.ts — Public API
 * ============================================================
 *
 * Screens (consumed by route files), the meditation query hooks, useMeditation,
 * and the manifest. (useEmergencyMeditations moved to features/emergency in 6d-4.)
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
  useCourses,
  useGuidedMeditations,
  useMeditationsByTheme,
  useMeditationsByTechnique,
} from './hooks/queries';
export { useMeditation } from './hooks/useMeditation';
export { manifest } from './manifest';
