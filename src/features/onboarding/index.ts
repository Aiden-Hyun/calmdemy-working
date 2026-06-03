/**
 * ============================================================
 * features/onboarding/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the onboarding feature.
 *
 * - OnboardingScreen — rendered by app/onboarding.tsx (route file)
 * - manifest — consumed by src/registry.ts (Phase 7)
 * ============================================================
 */

export { OnboardingScreen } from './screens/OnboardingScreen';
export { manifest } from './manifest';
