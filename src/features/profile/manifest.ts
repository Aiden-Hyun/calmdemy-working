/**
 * ============================================================
 * features/profile/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the profile feature — the user's identity, subscription
 * status, and account actions — surfaced to Discover, search, and deep links
 * through the registry (see src/registry.ts).
 *
 * `route` is the Profile tab path. Nothing navigates to it programmatically
 * (the tab bar owns it), so the value is registry metadata for now.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'profile',
  label: 'Profile',
  description: 'Your account, subscription, and meditation history.',
  icon: 'person-circle-outline',
  color: '#7DAFB4',
  route: '/(tabs)/profile',
  category: 'account',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['profile', 'account', 'settings', 'subscription'],
  // Hidden from Discover (7a): Profile is a permanent tab, not a browsable destination.
  enabled: false,
};
