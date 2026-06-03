/**
 * ============================================================
 * features/auth/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the auth feature — sign in / sign up, account linking,
 * and account security — surfaced to Discover, search, and deep links through
 * the registry (see src/registry.ts).
 *
 * `requiresAuth: false` — this feature IS the authentication flow.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'auth',
  label: 'Account',
  description: 'Sign in, link a Google or Apple account, and manage account security.',
  icon: 'person-circle-outline',
  color: '#7DAFB4',
  route: '/login',
  category: 'account',
  requiresAuth: false,
  requiresSubscription: false,
  searchKeywords: ['sign in', 'login', 'account', 'apple', 'google', 'email', 'password'],
  enabled: true,
};
