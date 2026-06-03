/**
 * ============================================================
 * features/onboarding/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the onboarding feature — the first-launch welcome +
 * paywall flow. `enabled: false` because it's a one-time first-run flow, not
 * something users browse to from Discover.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'onboarding',
  label: 'Welcome',
  description: 'First-launch tour of what Calmdemy offers, free and premium.',
  icon: 'sparkles-outline',
  color: '#B4A7C7',
  route: '/onboarding',
  category: 'account',
  requiresAuth: false,
  requiresSubscription: false,
  searchKeywords: ['welcome', 'onboarding', 'tour', 'getting started'],
  enabled: false,
};
