/**
 * ============================================================
 * features/settings/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the settings feature — theme, notifications, and
 * account management — surfaced to Discover, search, and deep links through
 * the registry (see src/registry.ts).
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'settings',
  label: 'Settings',
  description: 'Theme, notifications, and account management.',
  icon: 'settings-outline',
  color: '#8B8685',
  route: '/settings',
  category: 'account',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['settings', 'theme', 'dark mode', 'notifications', 'delete account', 'sign out'],
  enabled: true,
};
