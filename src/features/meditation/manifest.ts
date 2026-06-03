/**
 * ============================================================
 * features/meditation/manifest.ts — Feature declaration
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'meditation',
  label: 'Meditate',
  description: 'Guided meditations, techniques, and psychology-based courses.',
  icon: 'leaf-outline',
  color: '#8B9F82',
  route: '/(tabs)/meditate',
  category: 'library',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    'meditation',
    'mindfulness',
    'cbt',
    'act',
    'dbt',
    'mbct',
    'breathing',
    'body scan',
    'visualization',
    'loving kindness',
    'grounding',
  ],
  enabled: true,
};
