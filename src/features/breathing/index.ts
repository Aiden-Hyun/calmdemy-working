/**
 * ============================================================
 * features/breathing/index.ts — Public API
 * ============================================================
 *
 * The contract this file enforces: any code outside features/breathing/
 * may ONLY import the symbols re-exported here. Internal files
 * (components/, hooks/, data/, types.ts) are private to the feature.
 *
 * Phase 8 (ESLint boundary enforcement) will make this contract
 * machine-checked. Until then, treat this file as the canonical
 * public surface — adding to it is a deliberate choice, not a default.
 *
 * Why each re-export exists:
 * - BreathingScreen — needed by app/breathing.tsx (the route file)
 *   so it can render the feature.
 * - manifest — needed by src/registry.ts (Phase 7) to advertise the
 *   feature in Discover, search, and deep-link routing.
 * ============================================================
 */

export { BreathingScreen } from './screens/BreathingScreen';
export { manifest } from './manifest';
