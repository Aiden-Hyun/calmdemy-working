/**
 * ============================================================
 * features/emergency/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the emergency feature. Code
 * outside features/emergency/ may import ONLY the symbols re-exported
 * here (Phase 8 makes this machine-checked).
 *
 * - EmergencyPlayerScreen — rendered by app/emergency/[id].tsx (route file)
 * - manifest              — consumed by src/registry.ts (Phase 7)
 *
 * Data access (api/emergencyMeditations.ts) stays internal for now;
 * its consumers still reach it through the firestoreService barrel until
 * Phase 6e. Re-export it here when those consumers migrate.
 * ============================================================
 */

export { EmergencyPlayerScreen } from './screens/EmergencyPlayerScreen';
export { manifest } from './manifest';
