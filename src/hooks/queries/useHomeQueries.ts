/**
 * ============================================================
 * useHomeQueries.ts — Home Screen Data Queries (Stale-While-Revalidate)
 * ============================================================
 *
 * Architectural Role:
 *   This module exports a collection of React Query hooks that encapsulate
 *   all server-state fetching for the home screen. Each hook bridges the
 *   Repository layer (firestoreService.ts) to the View/ViewModel, implementing
 *   the Stale-While-Revalidate pattern for server-state management.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): Each query caches its result and serves
 *     stale data immediately while refetching in the background. This pattern
 *     is essential for mobile apps where network latency and connectivity vary.
 *   - Facade: firestoreService.ts abstracts Firestore API details; these hooks
 *     abstract the query lifecycle (loading, error, refetch) from screens.
 *   - Guard Clause / Conditional Fetching: Queries with `enabled: !!user?.uid`
 *     skip fetching until the user is authenticated — a data-dependent execution
 *     pattern that prevents 403 errors and unnecessary requests.
 *   - Observer Pattern: React Query internally subscribes to cache state and
 *     notifies consumers (via hook return) when data changes or cache becomes stale.
 *
 * Cache Keys & Partitioning:
 *   - ['todayQuote']: Global content, no user partition — one quote set per app instance.
 *   - ['listeningHistory', userId, limit]: User-partitioned — each user has isolated history.
 *   - ['favorites', userId]: User-partitioned — each user's favorites cached separately.
 *   - ['downloadedContent']: Device-local state, no server sync — single app-wide entry.
 *   - ['userStats', userId]: User-partitioned — each user has isolated statistics.
 *
 * Consumed By:
 *   HomeScreen.tsx and nested ViewModel hooks that render home page content.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  getTodayQuote,
  getListeningHistory,
  getFavoritesWithDetails,
  getUserStats,
} from '../../services/firestoreService';
import { getDownloadedContent } from '../../services/downloadService';

/**
 * Hook for fetching the daily featured quote.
 *
 * This query caches a single quote object globally with a 24-hour stale time,
 * meaning the same quote is served to all users for an entire day, then refreshed.
 * It's a simple read-only query with no user dependency (enabled by default).
 *
 * @returns A React Query result containing today's featured quote
 */
export function useTodayQuote() {
  return useQuery({
    queryKey: ['todayQuote'],
    queryFn: getTodayQuote,
    // Stale-While-Revalidate: serve the cached quote for 24 hours, then refetch
    // in the background. This minimizes server load since the same quote is shown
    // to all users for the entire day.
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * Hook for fetching the user's listening history.
 *
 * This query is user-partitioned by including user?.uid in the cache key,
 * so each user has a separate cache entry for their history. The `enabled`
 * guard clause ensures we skip the fetch until the user is authenticated,
 * preventing 403 errors and unnecessary network requests.
 *
 * @param limit - Maximum number of history entries to fetch (default: 10)
 * @returns A React Query result containing recent listened-to meditations
 */
export function useListeningHistory(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    // Cache key partitioned by user ID and limit — changing either will invalidate
    // the cached data, triggering a fresh fetch.
    queryKey: ['listeningHistory', user?.uid, limit],
    queryFn: () => getListeningHistory(user!.uid, limit),
    // Guard clause: only fetch when user is authenticated. Before login, this query
    // remains inactive (enabled: false), so the component doesn't try to fetch
    // protected user data without credentials.
    enabled: !!user?.uid,
  });
}

/**
 * Hook for fetching the user's favorite meditations with full metadata.
 *
 * This query is user-partitioned by uid, so each user's favorites are cached
 * separately. The `enabled` guard ensures we only fetch after authentication.
 *
 * @returns A React Query result containing the user's favorite meditation entries
 */
export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', user?.uid],
    queryFn: () => getFavoritesWithDetails(user!.uid),
    // Guard clause: defer fetching until authenticated
    enabled: !!user?.uid,
  });
}

/**
 * Hook for fetching the user's locally downloaded content (device-local state).
 *
 * Unlike the other hooks, this query has no user partition because downloaded
 * content is stored locally on the device — not synced to Firestore. The cache
 * key is global, so all code paths read the same downloaded content state.
 *
 * @returns A React Query result containing the list of downloaded meditations
 */
export function useDownloadedContent() {
  return useQuery({
    queryKey: ['downloadedContent'],
    // No authentication guard: downloaded content is device-local and doesn't
    // require user login to access. This allows offline users to still play
    // previously downloaded meditations.
    queryFn: getDownloadedContent,
  });
}

/**
 * Hook for fetching the user's meditation and listening statistics.
 *
 * This query is user-partitioned by uid. It aggregates stats like total minutes
 * meditated, current streak, and other behavioral metrics. The `enabled` guard
 * ensures we only fetch after authentication.
 *
 * @returns A React Query result containing user statistics (minutes, streak, etc.)
 */
export function useUserStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userStats', user?.uid],
    queryFn: () => getUserStats(user!.uid),
    // Guard clause: defer fetching until authenticated
    enabled: !!user?.uid,
  });
}
