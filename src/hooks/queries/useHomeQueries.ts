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
import { useAuth } from '../../core/auth/AuthContext';
import {
  getTodayQuote,
  getFavoritesWithDetails,
} from '../../services/firestoreService';

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
