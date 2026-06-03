/**
 * features/home/index.ts — Public API
 *
 * - HomeScreen — rendered by app/(tabs)/home.tsx (route file)
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * Home is a leaf: it composes from many features but is imported by none.
 */
export { HomeScreen } from './screens/HomeScreen';
export { manifest } from './manifest';
