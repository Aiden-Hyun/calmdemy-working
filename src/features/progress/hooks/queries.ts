/**
 * ============================================================
 * features/progress/hooks/queries.ts — Progress data queries (SWR)
 * ============================================================
 *
 * React Query hooks for the progress feature's server state. Split out of
 * the legacy src/hooks/queries/useHomeQueries.ts in Phase 6c — the two
 * progress-owned queries (user stats, listening history) live here and read
 * directly from the feature's own api/ layer (no firestoreService barrel).
 *
 * - useUserStats: internal — wrapped by useStats (the ViewModel). Not part of
 *   the feature's public surface.
 * - useListeningHistory: public — consumed by the Home screen via the feature
 *   index until Home migrates (Phase 6c step 10).
 *
 * Both are user-partitioned and guard on auth (enabled: !!user?.uid).
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import { getUserStats } from '../api/sessions';
import { getListeningHistory } from '../api/listeningHistory';

/**
 * Hook for fetching the user's meditation and listening statistics.
 *
 * User-partitioned by uid; aggregates total minutes, streaks, and other
 * behavioral metrics. The `enabled` guard defers fetching until authenticated.
 */
export function useUserStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userStats', user?.uid],
    queryFn: () => getUserStats(user!.uid),
    enabled: !!user?.uid,
  });
}

/**
 * Hook for fetching the user's listening history.
 *
 * User-partitioned by uid + limit. The `enabled` guard defers the fetch until
 * the user is authenticated, preventing 403s and unnecessary requests.
 *
 * @param limit - Maximum number of history entries to fetch (default: 10)
 */
export function useListeningHistory(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listeningHistory', user?.uid, limit],
    queryFn: () => getListeningHistory(user!.uid, limit),
    enabled: !!user?.uid,
  });
}
