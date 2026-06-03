/**
 * features/music/manifest.ts — Feature declaration
 */
import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'music',
  label: 'Music',
  description: 'Ambient music, ASMR, white noise, and nature soundscapes.',
  icon: 'musical-notes-outline',
  color: '#A8B4C4',
  route: '/(tabs)/music',
  category: 'library',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['music', 'sounds', 'ambient', 'asmr', 'white noise', 'nature', 'rain', 'ocean', 'forest'],
  enabled: true,
};
