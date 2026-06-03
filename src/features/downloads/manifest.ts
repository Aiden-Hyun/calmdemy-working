/**
 * ============================================================
 * features/downloads/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the downloads feature — the user's offline library —
 * surfaced to Discover, search, and deep links through the registry (see
 * src/registry.ts).
 *
 * `requiresAuth: false` — the downloads list is intentionally reachable
 * without authentication (offline use case); the route file for the list has
 * no ProtectedRoute. The offline player route keeps its own ProtectedRoute.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'downloads',
  label: 'Downloads',
  description: 'Your offline library — meditations, music, and stories saved to your device.',
  icon: 'download-outline',
  color: '#8B9F82',
  route: '/downloads',
  category: 'library',
  requiresAuth: false,
  requiresSubscription: false,
  searchKeywords: ['downloads', 'offline', 'saved', 'library'],
  enabled: true,
};
