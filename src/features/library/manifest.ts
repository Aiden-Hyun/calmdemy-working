/**
 * ============================================================
 * features/library/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the library feature IS — surfaced to
 * Discover, search, deep links, and personalization through the
 * registry (see src/registry.ts).
 *
 * Scope note (Phase 5): this phase delivers the library feature
 * *module* (the unified album/series/course detail + player screens,
 * navigation, and icon helpers). The Library *tab home screen* and the
 * `/library` tab route land in Phase 7 alongside the Discover build —
 * `route` points at that future entry. The collection detail/player
 * screens themselves remain reachable at their existing stable URLs
 * (`/album/[id]`, `/series/[id]`, `/course/[id]` and player sub-routes).
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'library',
  label: 'Library',
  description: 'Albums, series, and courses — your collected audio in one place.',
  icon: 'library-outline',
  color: '#5C6BC0',
  // The /library tab route is created in Phase 7 (tab restructure + Library home).
  // Until then the feature's content is reached via /album, /series, /course.
  route: '/library',
  category: 'library',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    'library',
    'albums',
    'series',
    'courses',
    'collections',
    'tracks',
    'chapters',
    'sessions',
    'playlist',
    'audio',
  ],
  enabled: true,
};
