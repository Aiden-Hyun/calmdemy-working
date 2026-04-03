/**
 * ============================================================
 * useMeditateQueries.ts — Meditation Content Queries (Read-Through Cache)
 * ============================================================
 *
 * Architectural Role:
 *   This module exports React Query hooks that fetch meditation content from
 *   Firestore and cache it for the meditate/explore screens. Each hook represents
 *   a different slice of content (emergency meditations, courses, guided meditations,
 *   and filtered views by theme/technique), all implementing the Stale-While-Revalidate
 *   pattern for reliable offline-first content delivery.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): All queries cache for 1 hour, serving stale data
 *     while refetching in the background. This ensures the app remains responsive
 *     even on slow networks and provides a seamless offline experience.
 *   - Read-Through Cache: The Repository layer (firestoreService.ts) is abstracted
 *     behind these hooks, so if we ever migrate to a different backend, only the
 *     queryFn changes — the rest of the app is unaffected.
 *   - Facade: Each hook is a simplified API over the complex Firestore query logic.
 *   - Conditional Execution: The theme/technique filters use a ternary to decide
 *     whether to fetch all meditations or a filtered subset based on the parameter.
 *
 * Cache Strategy:
 *   - All queries share a base staleTime of 1 hour — meditation content is relatively
 *     stable (curated by admins), so this interval balances freshness with performance.
 *   - Cache keys include the filter parameter (theme/technique) so different filters
 *     maintain separate cache entries.
 *   - No user partition: all users see the same meditation catalog.
 *
 * Consumed By:
 *   MeditateScreen, ExploreScreen, and related ViewModels that populate browse lists.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import {
  getEmergencyMeditations,
  getCourses,
  getMeditations,
  getMeditationsByTheme,
  getMeditationsByTechnique,
} from '../../services/firestoreService';

/**
 * Hook for fetching high-priority emergency/quick meditations.
 *
 * Emergency meditations are short, soothing sessions designed for moments of
 * acute stress or anxiety. This query caches them for 1 hour, prioritizing
 * quick availability over absolute freshness.
 *
 * @returns A React Query result containing the list of emergency meditations
 */
export function useEmergencyMeditations() {
  return useQuery({
    queryKey: ['emergencyMeditations'],
    queryFn: getEmergencyMeditations,
    // Stale-While-Revalidate: cache for 1 hour, then refetch in background.
    // This ensures the emergency meditation list is always available, even offline.
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching meditation courses (multi-session learning paths).
 *
 * Courses are structured learning sequences (e.g., "30-Day Mindfulness Challenge")
 * that span multiple sessions. This query caches them for 1 hour.
 *
 * @returns A React Query result containing the list of available courses
 */
export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching all guided meditations (unfiltered catalog).
 *
 * This is the master list of all user-facing guided meditations, used as the
 * fallback when no filters are applied and as the base for filtered queries.
 *
 * @returns A React Query result containing all guided meditations
 */
export function useGuidedMeditations() {
  return useQuery({
    queryKey: ['guidedMeditations'],
    queryFn: getMeditations,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching meditations filtered by theme or all if theme is 'all'.
 *
 * This implements a conditional fetch pattern: when theme === 'all', it fetches
 * the full catalog; otherwise, it queries only meditations tagged with that theme.
 * The cache key includes the theme parameter, so each theme has its own cache entry.
 *
 * @param theme - Theme to filter by (e.g., 'stress', 'sleep') or 'all' for unfiltered
 * @returns A React Query result containing meditations matching the theme
 */
export function useMeditationsByTheme(theme: string) {
  return useQuery({
    // Cache key includes theme, so 'stress' and 'sleep' are cached separately.
    // This prevents cache collisions when the user switches themes.
    queryKey: ['meditations', 'theme', theme],
    // Conditional execution: if theme is 'all', fetch everything; otherwise,
    // fetch only meditations tagged with that specific theme.
    queryFn: () => theme === 'all' ? getMeditations() : getMeditationsByTheme(theme),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching meditations filtered by technique or all if technique is 'all'.
 *
 * Similar to useMeditationsByTheme, this hook supports filtering by meditation
 * technique (e.g., 'breathwork', 'body-scan', 'visualization'). The cache key
 * includes the technique parameter for cache isolation.
 *
 * @param technique - Technique to filter by (e.g., 'breathwork') or 'all' for unfiltered
 * @returns A React Query result containing meditations matching the technique
 */
export function useMeditationsByTechnique(technique: string) {
  return useQuery({
    queryKey: ['meditations', 'technique', technique],
    queryFn: () => technique === 'all' ? getMeditations() : getMeditationsByTechnique(technique),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
