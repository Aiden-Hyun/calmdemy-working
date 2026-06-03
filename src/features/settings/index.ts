/**
 * ============================================================
 * features/settings/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the settings feature. Code outside
 * features/settings/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - SettingsScreen — rendered by app/settings.tsx (route file)
 * - manifest       — consumed by src/registry.ts (Phase 7)
 * ============================================================
 */

export { SettingsScreen } from './screens/SettingsScreen';
export { manifest } from './manifest';
