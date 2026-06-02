/**
 * ============================================================
 * features/progress/data/milestones.ts — Streak milestone catalogue
 * ============================================================
 *
 * The streak-based milestone definitions and the helper that finds the next
 * one to reach. Extracted from app/(tabs)/profile.tsx in Phase 6c — these
 * belong to progress (audit §3); profile consumes them via the feature index.
 *
 * getNextMilestone is pure: it takes the user's longest streak rather than
 * closing over component state, so any screen can call it.
 * ============================================================
 */

import type { Ionicons } from '@expo/vector-icons';

export interface Milestone {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  days: number;
  description: string;
  color: string;
}

export const milestones: Milestone[] = [
  { id: 'week', icon: 'leaf-outline', label: 'First Week', days: 7, description: 'Planted the seed', color: '#8B9F82' },
  { id: 'month', icon: 'flower-outline', label: 'One Month', days: 30, description: 'Growing strong', color: '#A8B89F' },
  { id: 'quarter', icon: 'rose-outline', label: '3 Months', days: 90, description: 'Deep roots', color: '#C4A77D' },
  { id: 'year', icon: 'trophy-outline', label: 'One Year', days: 365, description: 'Mountain climber', color: '#D4A5A5' },
];

/**
 * The next milestone the user hasn't yet reached, or undefined if all are met.
 *
 * @param longestStreak - the user's longest streak in days
 */
export function getNextMilestone(longestStreak: number): Milestone | undefined {
  return milestones.find((m) => longestStreak < m.days);
}
