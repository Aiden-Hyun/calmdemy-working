/**
 * ============================================================
 * features/library/index.ts — Public API
 * ============================================================
 *
 * The only surface other code may import from. Internal files
 * (components/, hooks/, data/, api/, types.ts) are private to the
 * feature. Phase 8 (ESLint boundary enforcement) makes this contract
 * machine-checked.
 *
 * Populated incrementally across Phase 5:
 *   - manifest                      — Step 1 (this file), registry-ready
 *   - CollectionDetailScreen        — Step 4
 *   - CollectionItemPlayerScreen    — Step 6
 *   - navigateToContent             — Step 7
 *   - getCategoryIcon (contentIcons)— Step 8
 * ============================================================
 */

export { manifest } from './manifest';
export { CollectionDetailScreen } from './screens/CollectionDetailScreen';
export { CollectionItemPlayerScreen } from './screens/CollectionItemPlayerScreen';
export { navigateToContent } from './navigation';
export type { NavigateToContentContext } from './navigation';
export { getCategoryIcon } from './contentIcons';
export { useTodayQuote, useFavorites } from './hooks/queries';
