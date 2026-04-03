/**
 * ============================================================
 * useMusicQueries.ts — Ambient Audio Content Queries (Read-Through Cache)
 * ============================================================
 *
 * Architectural Role:
 *   This module exports React Query hooks that fetch ambient audio content
 *   (sleep sounds, white noise, music, ASMR, and albums) from Firestore.
 *   These hooks abstract the repository layer and implement the Stale-While-Revalidate
 *   pattern for offline-resilient content delivery to the Music/Sleep screens.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): All queries cache for 1 hour, balancing content
 *     freshness with performance and offline availability. Background refetches
 *     keep the cache current without blocking the UI.
 *   - Read-Through Cache: The Repository layer (firestoreService) is abstracted,
 *     so switching backends only requires changing the queryFn — consumers don't care.
 *   - Facade: Each hook presents a simple API over Firestore's complexity.
 *
 * Cache Strategy:
 *   - All queries share a 1-hour staleTime — ambient audio catalogs are stable
 *     (curated content that changes infrequently).
 *   - Cache keys are content-specific and globally scoped (no user partition),
 *     so all users see the same catalogs.
 *   - Each content type has a separate cache entry, allowing independent refresh.
 *
 * Consumed By:
 *   MusicScreen, SleepScreen, BackgroundAudioSelectors, and related ViewModels.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import {
  getSleepSounds,
  getWhiteNoise,
  getMusic,
  getAsmr,
  getAlbums,
} from '../../services/firestoreService';

/**
 * Hook for fetching sleep-specific ambient sounds.
 *
 * Sleep sounds are curated audio clips designed to induce restful sleep
 * (e.g., rain, ocean waves, forest ambience). This query caches them for
 * 1 hour to balance freshness with offline availability.
 *
 * @returns A React Query result containing the list of sleep sound options
 */
export function useSleepSounds() {
  return useQuery({
    queryKey: ['sleepSounds'],
    queryFn: getSleepSounds,
    // Stale-While-Revalidate: serve cached sleep sounds for 1 hour,
    // then refetch in background. This ensures reliable offline playback.
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching white noise and ambient noise options.
 *
 * White noise is a static, neutral ambient sound useful for focus, sleep,
 * and masking distracting sounds. This query caches these options for 1 hour.
 *
 * @returns A React Query result containing white noise variants
 */
export function useWhiteNoise() {
  return useQuery({
    queryKey: ['whiteNoise'],
    queryFn: getWhiteNoise,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching music content (relaxing, ambient, instrumental).
 *
 * This query returns curated music tracks suitable for meditation and relaxation,
 * such as ambient, lo-fi, and instrumental compositions. Cached for 1 hour.
 *
 * @returns A React Query result containing music content options
 */
export function useMusic() {
  return useQuery({
    queryKey: ['music'],
    queryFn: getMusic,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching ASMR (Autonomous Sensory Meridian Response) content.
 *
 * ASMR content includes whispering, tapping, and other sensory-triggering sounds
 * that many find relaxing. This query caches these specialized audio clips.
 *
 * @returns A React Query result containing ASMR content options
 */
export function useAsmr() {
  return useQuery({
    queryKey: ['asmr'],
    queryFn: getAsmr,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

/**
 * Hook for fetching curated audio albums (collections of related sounds/tracks).
 *
 * Albums group related ambient audio (e.g., "Rainforest Collection" or "Jazz Lounge")
 * into cohesive listening experiences. This query provides album metadata and track lists.
 *
 * @returns A React Query result containing album information
 */
export function useAlbums() {
  return useQuery({
    queryKey: ['albums'],
    queryFn: getAlbums,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
