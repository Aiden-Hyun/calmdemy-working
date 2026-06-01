/**
 * ============================================================
 * features/legal/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the legal feature (privacy policy + terms of
 * service), surfaced to Discover, search, and deep links through the
 * registry (see src/registry.ts).
 *
 * One manifest covers both static screens. `route` carries the canonical
 * entry (`/privacy`); `/terms` is reached from the same feature module.
 * `searchKeywords` cover both documents so either is findable.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'legal',
  label: 'Privacy & Terms',
  description: 'How Calmdemy handles your data, plus the terms you agree to by using the app.',
  icon: 'document-text-outline',
  color: '#90A4AE',
  route: '/privacy',
  category: 'legal',
  requiresAuth: false,
  requiresSubscription: false,
  searchKeywords: [
    'privacy',
    'privacy policy',
    'terms',
    'terms of service',
    'legal',
    'policy',
    'data',
    'gdpr',
    'ccpa',
    'conditions',
  ],
  enabled: true,
};
