/**
 * ============================================================
 * useSleepQueries.ts — Sleep-Focused Content Queries (Stale-While-Revalidate)
 * ============================================================
 *
 * Architectural Role:
 *   This module exports React Query hooks that fetch sleep-specific content from
 *   Firestore: bedtime stories, sleep meditations, and series (multi-part audio
 *   journeys). These hooks implement the Stale-While-Revalidate pattern to provide
 *   reliable, offline-first content delivery to sleep and night-time screens.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): All queries cache for 1 hour, serving stale
 *     content while refetching in the background. This is critical for sleep use
 *     cases, where users expect the app to work even with poor connectivity.
 *   - Read-Through Cache: The Repository layer (firestoreService) abstracts
 *     Firestore details, so backend migrations only change the queryFn.
 *   - Facade: Each hook simplifies Firestore query complexity into a single API.
 *
 * Cache Strategy:
 *   - All queries share a 1-hour staleTime — sleep content is stable and changes
 *     infrequently, so this interval balances freshness with performance.
 *   - No user partition: all users see the same sleep content catalogs.
 *   - Each content type (stories, meditations, series) has a separate cache entry,
 *     allowing independent refresh and reducing invalidation scope.
 *
 * Consumed By:
 *   SleepScreen, BedtimeStoryPlayer, SeriesViewer, and related ViewModels.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import {
  getBedtimeStories,
  getSleepMeditations,
  getSeries,
} from '../../services/firestoreService';

/**
 * Hook for fetching bedtime stories (narrated sleep content).
 *
 * Bedtime stories are longer-form narrated content designed to help users fall
 * asleep through calming narration and storytelling. This query caches them for
 * 1 hour to ensure offline availability during bedtime.
 *
 * @returns A React Query result containing available bedtime stories
 */
export function useBedtimeStories() {
  return useQuery({
    queryKey: ['bedtimeStories'],
    queryFn: getBedtimeStories,
    // Stale-While-Revalidate: serve cached bedtime stories for 1 hour,
    // then refetch in background. Critical for sleep use case — users expect
    // reliable offline access when settling down for bed.
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching sleep-specific guided meditations.
 *
 * Sleep meditations are shorter, focused practices designed to ease the transition
 * to sleep through breathing, body scan, and visualization techniques. This query
 * provides the catalog of sleep meditations with associated metadata.
 *
 * @returns A React Query result containing sleep meditation options
 */
export function useSleepMeditations() {
  return useQuery({
    queryKey: ['sleepMeditations'],
    queryFn: getSleepMeditations,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching multi-part audio series (episodic content).
 *
 * Series are structured, episodic audio journeys (e.g., "10-Day Sleep Challenge"
 * or "Progressive Relaxation Series") that users follow over multiple nights.
 * This query returns series metadata and episode information.
 *
 * @returns A React Query result containing available series and their episodes
 */
export function useSeries() {
  return useQuery({
    queryKey: ['series'],
    queryFn: getSeries,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
