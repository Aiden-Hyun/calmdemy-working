/**
 * ============================================================
 * features/progress/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the progress feature. Code outside
 * features/progress/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - StatsScreen — rendered by app/stats.tsx (route file)
 * - StatsCard — single-metric card; used by the stats screen, consumed by
 *   profile (and Home later)
 * - useStats — stats ViewModel; consumed by profile and Home
 * - useListeningHistory — consumed by Home until it migrates (step 10)
 * - milestones / getNextMilestone / Milestone — consumed by profile
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * useUserStats stays internal (only useStats wraps it).
 * ============================================================
 */

export { StatsScreen } from './screens/StatsScreen';
export { StatsCard } from './components/StatsCard';
export { useStats } from './hooks/useStats';
export { useListeningHistory } from './hooks/queries';
export { milestones, getNextMilestone } from './data/milestones';
export type { Milestone } from './data/milestones';
export { manifest } from './manifest';
