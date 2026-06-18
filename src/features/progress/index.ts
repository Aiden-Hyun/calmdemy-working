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
 * - MeditationSession — session record type; consumed by meditation (useMeditation)
 * - ListeningHistoryItem — listening-history entry type; consumed by Home
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * useUserStats stays internal (only useStats wraps it).
 * ============================================================
 */

export { StatsScreen } from './screens/StatsScreen';
export { StatsCard } from './components/StatsCard';
export { useStats } from './hooks/useStats';
export { useListeningHistory } from './hooks/queries';
export { usePlaybackTracking } from './hooks/usePlaybackTracking';
export type { UsePlaybackTrackingProps, UsePlaybackTrackingReturn } from './hooks/usePlaybackTracking';
export { milestones, getNextMilestone } from './data/milestones';
export type { Milestone } from './data/milestones';
export type { MeditationSession, ListeningHistoryItem } from './types';
// Data-access fns surfaced for cross-feature + shared/media-player consumers
// when the firestoreService barrel was deleted (Phase 6e-B).
export { createSession } from './api/sessions';
export { addToListeningHistory } from './api/listeningHistory';
export { markContentCompleted, getCompletedContentIds } from './api/completion';
export { savePlaybackProgress, getPlaybackProgress, clearPlaybackProgress } from './api/playbackProgress';
export { manifest } from './manifest';
