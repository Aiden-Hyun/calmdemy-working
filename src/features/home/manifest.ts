/**
 * features/home/manifest.ts — Feature declaration
 *
 * Home composes content from many features; no other feature should import
 * from features/home (it's a leaf consumer).
 */
import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'home',
  label: 'Home',
  description: 'Your personalized today — quote, recently played, and favorites.',
  icon: 'home-outline',
  color: '#7DAFB4',
  route: '/(tabs)/home',
  category: 'library',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['home', 'today', 'recently played', 'favorites', 'quote'],
  // Hidden from Discover (7a): Home is a permanent tab, not a browsable destination.
  enabled: false,
};
