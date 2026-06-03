/**
 * features/sleep/manifest.ts — Feature declaration
 */
import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'sleep',
  label: 'Sleep',
  description: 'Bedtime stories, sleep meditations, and calming series for rest.',
  icon: 'moon-outline',
  color: '#7B8FA1',
  route: '/(tabs)/sleep',
  category: 'library',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['sleep', 'bedtime', 'stories', 'rest', 'night', 'meditation', 'series'],
  enabled: true,
};
