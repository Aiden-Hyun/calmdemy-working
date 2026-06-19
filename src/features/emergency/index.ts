/**
 * ============================================================
 * features/emergency/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the emergency feature. Code
 * outside features/emergency/ may import ONLY the symbols re-exported
 * here (Phase 8 makes this machine-checked).
 *
 * - EmergencyPlayerScreen  — rendered by app/emergency/[id].tsx (route file)
 * - useEmergencyMeditations — emergency content query; consumed by Home
 * - getEmergencyMeditationById — single-item resolver; consumed by library's
 *   polymorphic content resolver (api/content.ts) through this public index
 *   (Phase 8: feature → feature is allowed via index.ts only).
 * - manifest               — consumed by src/registry.ts (Phase 7)
 * ============================================================
 */

export { EmergencyPlayerScreen } from './screens/EmergencyPlayerScreen';
export { useEmergencyMeditations } from './hooks/queries';
export { getEmergencyMeditationById } from './api/emergencyMeditations';
export { manifest } from './manifest';
