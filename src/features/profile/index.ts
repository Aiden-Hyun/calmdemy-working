/**
 * ============================================================
 * features/profile/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the profile feature. Code outside
 * features/profile/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - ProfileScreen — rendered by app/(tabs)/profile.tsx (route file)
 * - manifest      — consumed by src/registry.ts (Phase 7)
 * ============================================================
 */

export { ProfileScreen } from './screens/ProfileScreen';
export { manifest } from './manifest';
