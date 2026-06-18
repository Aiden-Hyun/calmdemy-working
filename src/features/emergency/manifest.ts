/**
 * ============================================================
 * features/emergency/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the emergency feature — a fast-access relief
 * player for moments of acute stress — surfaced to Discover, search,
 * and deep links through the registry (see src/registry.ts).
 *
 * The feature is reached contextually (from Home / library navigation,
 * which supply the meditation params), so `route` carries the param-based
 * player path. Per-item access is gated by each meditation's `isFree`
 * flag, not by a feature-wide subscription requirement.
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'emergency',
  label: 'Emergency Calm',
  description: 'Fast, guided relief for moments of acute stress or panic.',
  icon: 'heart-outline',
  color: '#E57373',
  route: '/emergency/[id]',
  category: 'practice',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    'emergency',
    'panic',
    'anxiety',
    'stress',
    'crisis',
    'calm',
    'relief',
    'grounding',
    'sos',
  ],
  // Hidden from Discover (7a): contextual param route (/emergency/[id]) — not directly navigable.
  enabled: false,
};
