/**
 * ============================================================
 * useAudioUrlQueries.ts — Audio URL Resolution (Read-Through Cache)
 * ============================================================
 *
 * Architectural Role:
 *   This module encapsulates a single query hook that resolves audio file paths
 *   to signed URLs. It acts as a Read-Through Cache layer between the View/ViewModel
 *   and the audio file constants, abstracting the complexity of URL generation
 *   and caching the results via React Query to avoid redundant lookups.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): The query caches resolved URLs for 30 minutes
 *     (matching Firebase signed URL TTL), then serves stale data while revalidating
 *     in the background. This ensures constant playback even if URLs expire momentarily.
 *   - Read-Through Cache: The cache key is derived from sorted sound IDs, so the same
 *     set of sounds (regardless of order) hits the same cache entry.
 *   - Facade: hideAudioFiles.ts (not shown) exposes a simple function interface,
 *     while this hook wraps that interface in React Query's lifecycle management.
 *
 * Cache Strategy:
 *   - queryKey: ['audioUrls', sortedSoundIds] — ensures cache hits even if the
 *     sounds array is reconstructed with the same content in different order.
 *   - staleTime: 30 minutes — aligns with Firebase signed URL expiry.
 *   - enabled: only fetches when sounds.length > 0 (Guard Pattern).
 *
 * Consumed By:
 *   ViewModels and screens that need to map sound objects to playable URLs.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { getAudioUrlFromPath } from '../../constants/audioFiles';

interface SoundWithAudio {
  id: string;
  audioPath?: string;
}

/**
 * Resolves an array of sounds with audio paths to a Map of sound IDs to signed URLs.
 *
 * This function is the queryFn for useAudioUrls. It iterates over the sounds,
 * fetches a signed URL for each audioPath, and returns a Map for efficient lookup.
 * If a sound lacks an audioPath or the URL fetch fails, that sound is silently omitted
 * from the result — a Graceful Degradation pattern.
 *
 * @param sounds - Array of sound objects with optional audioPath fields
 * @returns A Promise that resolves to a Map<soundId, signedUrl>
 */
async function resolveAudioUrls(sounds: SoundWithAudio[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const sound of sounds) {
    if (sound.audioPath) {
      const url = await getAudioUrlFromPath(sound.audioPath);
      if (url) urls.set(sound.id, url);
    }
  }
  return urls;
}

/**
 * Hook for resolving audio file paths to signed URLs with caching.
 *
 * This hook implements the Stale-While-Revalidate pattern: it caches resolved URLs
 * for 30 minutes (matching Firebase signed URL TTL), avoiding redundant requests when
 * the same sounds are queried. The cache key is stable across array reorderings because
 * we sort the sound IDs before joining them.
 *
 * @param sounds - Array of sound objects with optional audioPath fields to resolve
 * @returns A React Query useQuery result containing a Map<soundId, signedUrl>
 */
export function useAudioUrls(sounds: SoundWithAudio[]) {
  // --- Build stable cache key from sorted sound IDs ---
  // Sorting ensures cache hits even if the sounds array is reordered, since
  // the same logical set of sounds will always produce the same key.
  const soundIds = sounds.map((s) => s.id).sort().join(',');

  return useQuery({
    queryKey: ['audioUrls', soundIds],
    queryFn: () => resolveAudioUrls(sounds),
    // Guard clause: don't fetch if there are no sounds to resolve
    enabled: sounds.length > 0,
    // Stale-While-Revalidate: serve cached URLs for 30 minutes (Firebase signed URL TTL),
    // then revalidate in background. This keeps audio playback uninterrupted even as URLs
    // approach expiry, because React Query refetches without blocking the consumer.
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}
