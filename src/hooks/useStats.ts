/**
 * ============================================================
 * useStats.ts — User Statistics ViewModel (Hooks Composition)
 * ============================================================
 *
 * Architectural Role:
 *   This module exports a ViewModel hook that adapts the low-level React Query
 *   hook (useUserStats) into a higher-level ViewModel interface. It transforms
 *   the raw query result into a shape optimized for screens: normalizing error
 *   messages, coalescing null/undefined stats, and exposing a refreshStats action.
 *
 * Design Patterns:
 *   - Hooks Composition: This hook composes useUserStats (a query hook) and adds
 *     ViewModel-level business logic, creating a layered abstraction:
 *     Repository (firestoreService) → Query Hook (useUserStats) → ViewModel (useStats) → View.
 *   - Adapter: Adapts the React Query result shape into a ViewModel shape that
 *     screens expect, normalizing error messages and handling null/undefined cases.
 *   - Facade: Provides a simplified interface to screens, hiding the complexity of
 *     React Query's internal state (isLoading, error types, refetch function).
 *
 * Consumed By:
 *   Screens (HomeScreen, StatsScreen) that display user statistics and need to
 *   refresh stats on demand (e.g., after a meditation session completes).
 * ============================================================
 */

import { useCallback } from 'react';
import { useUserStats } from './queries/useHomeQueries';

/**
 * ViewModel hook for user meditation and activity statistics.
 *
 * This hook wraps the low-level useUserStats query hook and exposes a ViewModel
 * interface optimized for View consumption. It handles error normalization,
 * null coalescing, and provides a refreshStats action for manual refetch.
 *
 * @returns Object with: stats (normalized), loading (boolean), error (string | null),
 *          and refreshStats (callback for manual refetch)
 */
export function useStats() {
  // --- Fetch user stats via React Query ---
  // This query is user-partitioned and caches based on user UID (from AuthContext).
  // The Stale-While-Revalidate pattern ensures stale stats are served while
  // refetching in the background.
  const { data: stats, isLoading: loading, error, refetch } = useUserStats();

  // --- Action: Manually trigger a refetch of stats ---
  /**
   * Refresh the user's statistics by invalidating the cache and fetching fresh data.
   *
   * This is useful after a meditation session completes, when the user's stats
   * (total minutes, streak, etc.) may have changed. The async function allows
   * callers to await the refresh completion.
   */
  const refreshStats = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // --- Normalize and adapt the query result for View consumption ---
  return {
    // Coalesce undefined/null stats to null (explicit sentinel for "no data yet")
    stats: stats ?? null,

    // Expose loading flag with a View-friendly name
    loading,

    // Normalize error: convert Error objects to strings, provide fallback message
    error: error
      ? error instanceof Error
        ? error.message
        : 'Failed to fetch stats'
      : null,

    // Expose the refresh action for manual refetch
    refreshStats,
  };
}
