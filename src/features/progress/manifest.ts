/**
 * ============================================================
 * features/progress/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for the progress feature — the user's stats, streaks, and
 * milestones — surfaced to Discover, search, and deep links through the
 * registry (see src/registry.ts).
 * ============================================================
 */

import type { FeatureManifest } from '../../registry';

export const manifest: FeatureManifest = {
  id: 'progress',
  label: 'Your Sanctuary',
  description: 'Track your sessions, streak, and milestones.',
  icon: 'stats-chart-outline',
  color: '#C4A77D',
  route: '/stats',
  category: 'progress',
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ['stats', 'progress', 'streak', 'milestones', 'history', 'sessions'],
  enabled: true,
};
