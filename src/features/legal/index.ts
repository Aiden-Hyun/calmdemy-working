/**
 * ============================================================
 * features/legal/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the legal feature. Code outside
 * features/legal/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - PrivacyScreen — rendered by app/privacy.tsx (route file)
 * - TermsScreen   — rendered by app/terms.tsx (route file)
 * - manifest      — consumed by src/registry.ts (Phase 7) for Discover/search
 * ============================================================
 */

export { PrivacyScreen } from './screens/PrivacyScreen';
export { TermsScreen } from './screens/TermsScreen';
export { manifest } from './manifest';
