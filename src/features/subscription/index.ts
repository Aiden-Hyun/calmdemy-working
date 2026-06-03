/**
 * ============================================================
 * features/subscription/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the subscription feature. Code
 * outside features/subscription/ may import ONLY the symbols re-exported here
 * (Phase 8 makes this machine-checked).
 *
 * - PaywallModal — the upgrade modal; consumed by many screens (home, library,
 *   profile, music/sleep/meditation lists) and by shared/lists/AudioListScreen
 *   (a documented shared→feature edge, slated for inversion in Phase 6d)
 * - RecoveryWizard — purchase recovery flow
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * The PaywallModal → AccountPromptModal (auth) and RecoveryWizard → auth
 * sign-in couplings are direct imports for now; the callback-style inversion
 * is Phase 6d.
 * ============================================================
 */

export { PaywallModal } from './components/PaywallModal';
export { RecoveryWizard } from './components/RecoveryWizard';
export { manifest } from './manifest';
