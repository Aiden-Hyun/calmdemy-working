/**
 * ============================================================
 * features/subscription/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the subscription feature's UI surface — the paywall and
 * the purchase-recovery wizard — surfaced to Discover, search, and deep links
 * through the registry (see src/registry.ts).
 *
 * The feature has no dedicated route (it's modal-based); `route` points at
 * /settings, where users manage their subscription. Subscription *state* lives
 * in core/subscription/ (moved in Phase 1) — only the UI lives here.
 * `requiresSubscription: false` — the feature IS the subscription gating; it
 * doesn't gate itself.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'subscription',
  label: 'Premium',
  description: 'Upgrade to premium for unlimited access; restore or recover purchases.',
  icon: 'sparkles-outline',
  color: '#C4A77D',
  route: '/settings',
  category: 'account',
  requiresAuth: false,
  requiresSubscription: false,
  searchKeywords: ['premium', 'subscription', 'upgrade', 'paywall', 'restore', 'refund'],
  // Hidden from Discover (7a): gating/paywall UI (modal-based), not a destination; route was a /settings dup.
  enabled: false,
};
