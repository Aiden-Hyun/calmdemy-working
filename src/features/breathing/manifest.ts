/**
 * ============================================================
 * features/breathing/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the breathing feature IS — surfaced to
 * Discover, search, deep links, and personalization through the
 * registry (see src/registry.ts).
 *
 * Conventions:
 *   - id matches the folder name (features/breathing/ ↔ id: 'breathing')
 *   - color matches the icon color used in the UI catalogue
 *   - searchKeywords are lowercase, include technique names and the
 *     feelings the user might search by (calm, focus, anxiety, sleep)
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'breathing',
  label: 'Breathing Exercises',
  description: 'Guided breathing techniques to reset your nervous system in minutes.',
  icon: 'fitness-outline',
  color: '#7DAFB4',
  route: '/breathing',
  category: 'practice',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    'breathing',
    'breath',
    'box breathing',
    '4-7-8',
    'belly breathing',
    'coherent breathing',
    'calm',
    'focus',
    'sleep',
    'anxiety',
    'stress',
  ],
  enabled: true,
};
