/**
 * ============================================================
 * audioFiles.ts — Audio Asset Registry & Download URL Manager
 * ============================================================
 *
 * Architectural Role:
 *   This module is the single source of truth for all audio content.
 *   It maps logical audio file keys (e.g., "meditation_relaxation") to:
 *   1. Firebase Storage paths (for hosted audio)
 *   2. External URLs (for third-party audio from Fragrant Heart, Pixabay)
 *
 *   The module also manages URL caching (tokens expire after 30 minutes)
 *   and provides async/sync helpers for audio playback screens.
 *
 * Design Patterns:
 *   - Registry/Lookup Table: storagePaths and externalUrls are maps
 *     for O(1) key-based audio asset lookups.
 *   - Cache Strategy (Token Expiry): Firebase download URLs include
 *     access tokens valid for ~30 minutes. We cache them to avoid
 *     re-fetching. After 30 minutes, the cache is invalidated.
 *   - Prefetch/Preload: preloadAudioUrls() eagerly fetches tokens
 *     for a list of audio keys, so screens don't show spinners.
 *   - Graceful Fallback: If a key isn't found, returns null with
 *     a warning. Screens should have placeholder UI for missing audio.
 *
 * Sources:
 *   - Firebase Cloud Storage: privately hosted meditations, sound effects
 *   - Fragrant Heart: external public meditation library
 *   - Pixabay: external free stock audio
 *
 * Key Concepts:
 *   - Audio keys: logical identifiers (e.g., "meditation_body_scan")
 *   - Storage paths: Firebase paths (e.g., "audio/meditate/meditations/body-scan.mp3")
 *   - Download URLs: temporary signed URLs with access tokens
 *   - Cache: 30-minute lifetime to balance freshness vs. request volume
 * ============================================================
 */

import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Fragrant Heart base URL factory.
 *
 * Fragrant Heart is an external public meditation library.
 * URLs don't require authentication (public).
 *
 * @param path - Audio path within Fragrant Heart (e.g., "relaxation/deep-relaxation")
 * @returns Full URL to the .mp3 file
 */
const fragrantheart = (path: string) =>
  `https://www.fragrantheart.com/audio/${path}.mp3`;

/**
 * Firebase Storage paths for privately hosted audio.
 *
 * Each path maps a logical audio key to its location in Cloud Storage.
 * These are private resources and require download URLs (with temporary
 * access tokens) for playback. Use getAudioUrl(key) to fetch the URL.
 */
const storagePaths: Record<string, string> = {
  // ========== BEDTIME STORIES (Firebase Storage) ==========
  story_midnight_crossing: 'audio/sleep/stories/midnight-crossing-chapter-1.mp3',
  story_shoemaker_elves: 'audio/sleep/stories/the-shoemaker-and-the-elves.mp3',
  
  // ========== WHITE NOISE (Firebase Storage) ==========
  wn_electric_fan: 'audio/music/white-noise/electric-fan.mp3',
  wn_airplane_cabin: 'audio/music/white-noise/airplane-cabin.mp3',
  wn_pink_noise: 'audio/music/white-noise/pink-noise.mp3',
  wn_grey_noise: 'audio/music/white-noise/grey-noise.mp3',
  wn_brown_noise: 'audio/music/white-noise/brown-noise.mp3',
  wn_white_noise: 'audio/music/white-noise/white-noise.mp3',
  wn_air_conditioner: 'audio/music/white-noise/air-conditioner.mp3',
  
  // ========== NATURE SOUNDS (Firebase Storage) ==========
  // Rain sounds
  ns_rain_on_window: 'audio/music/nature-sounds/rain-on-window.mp3',
  ns_rain_in_forest: 'audio/music/nature-sounds/rain-in-forest.mp3',
  ns_rain_with_fireplace: 'audio/music/nature-sounds/rain-with-fireplace.mp3',
  ns_city_rain: 'audio/music/nature-sounds/city-rain.mp3',
  
  // Ocean & water sounds
  ns_ocean_waves: 'audio/music/nature-sounds/ocean-waves.mp3',
  ns_ocean_seagulls: 'audio/music/nature-sounds/ocean-seagulls.mp3',
  ns_flowing_stream: 'audio/music/nature-sounds/flowing-stream.mp3',
  ns_water_drops: 'audio/music/nature-sounds/water-drops.mp3',
  ns_gentle_water: 'audio/music/nature-sounds/gentle-water.mp3',
  
  // Fire sounds
  ns_crackling_fireplace: 'audio/music/nature-sounds/crackling-fireplace.mp3',
  ns_cozy_fireplace: 'audio/music/nature-sounds/cozy-fireplace.mp3',
  ns_forest_campfire: 'audio/music/nature-sounds/forest-campfire.mp3',
  ns_riverside_campfire: 'audio/music/nature-sounds/riverside-campfire.mp3',
  ns_autumn_ambience: 'audio/music/nature-sounds/autumn-ambience.mp3',
  
  // Wind sounds
  ns_mountain_wind: 'audio/music/nature-sounds/mountain-wind.mp3',
  ns_desert_wind: 'audio/music/nature-sounds/desert-wind.mp3',
  
  // Nature & wildlife
  ns_night_wildlife: 'audio/music/nature-sounds/night-wildlife.mp3',
  
  // Thunder & storm
  ns_thunderstorm: 'audio/music/nature-sounds/thunderstorm.mp3',
  
  // Other ambient sounds
  ns_ambient_dreams: 'audio/music/nature-sounds/ambient-dreams.mp3',
  ns_cave_echoes: 'audio/music/nature-sounds/cave-echoes.mp3',
  ns_cat_purring: 'audio/music/nature-sounds/cat-purring.mp3',
  ns_cat_purring_soft: 'audio/music/nature-sounds/cat-purring-soft.mp3',
  ns_train_journey: 'audio/music/nature-sounds/train-journey.mp3',
  ns_snow_footsteps: 'audio/music/nature-sounds/snow-footsteps.mp3',
  
  // ========== EMERGENCY MEDITATIONS (Firebase Storage) ==========
  emergency_panic_relief: 'audio/meditate/emergency/panic-relief.mp3',
  emergency_478_breathing: 'audio/meditate/emergency/478-breathing.mp3',
  
  // ========== MEDITATIONS (Firebase Storage) ==========
  meditation_body_scan: 'audio/meditate/meditations/body-scan-delilah.mp3',
  
  // ========== SLEEP MEDITATIONS (Firebase Storage) ==========
  sleep_med_even_if_you_dont_fall_asleep: 'audio/sleep/meditations/even-if-you-dont-fall-asleep.mp3',
  sleep_med_let_the_day_fall_away: 'audio/sleep/meditations/let-the-day-fall-away.mp3',
  
  // ========== ALBUMS (Firebase Storage) ==========
  // Meditation Music album
  album_meditation_t1: 'audio/music/albums/meditation-music/calm-reflection.mp3',
  album_meditation_t2: 'audio/music/albums/meditation-music/inner-peace.mp3',
  album_meditation_t3: 'audio/music/albums/meditation-music/gentle-awakening.mp3',

  // ========== ASMR (Firebase Storage) ==========
  asmr_page_turning: 'audio/music/asmr/page-turning.mp3',
  asmr_keyboard: 'audio/music/asmr/keyboard-typing.mp3',

  // ========== COURSES (Firebase Storage) ==========
  course_10min_reset_session1: 'audio/meditate/courses/10-minute-reset-session1.mp3',
  course_10min_reset_session2: 'audio/meditate/courses/10-minute-reset-session2.mp3',
  course_foundational_session1: 'audio/meditate/courses/foundational-series/youre-safe-right-now.mp3',
  course_foundational_session2: 'audio/meditate/courses/foundational-series/when-your-mind-wont-stop.mp3',
  course_foundational_session3: 'audio/meditate/courses/foundational-series/a-place-to-rest.mp3',
};

/**
 * External URLs for publicly accessible audio.
 *
 * These are public, third-party sources (Fragrant Heart, Pixabay, etc.).
 * They don't require Firebase download tokens or authentication.
 * These URLs are stable and can be shared directly.
 */
const externalUrls: Record<string, string> = {
  // Fragrant Heart meditations (public, external source)
  meditation_relaxation: fragrantheart('relaxation/deep-relaxation'),
  meditation_peace: fragrantheart('relaxation/2mins-inner-peace'),
  meditation_calming: fragrantheart('relaxation/1min-calming'),
  meditation_healing: fragrantheart('healing/deep-healing-and-relaxation'),
  meditation_chronic: fragrantheart('healing/chronic-illness'),
  meditation_pain: fragrantheart('healing/guided-meditation-for-acute-or-chronic-pain'),
  meditation_anger: fragrantheart('relaxation/guided-meditation-for-anger'),
  meditation_obsessive: fragrantheart('relaxation/guided-awareness-for-obsessive-thoughts'),
  meditation_overwhelmed: fragrantheart('relaxation/when-you-are-feeling-overwhelmed'),
  meditation_social: fragrantheart('self-esteem/social-anxiety'),
  meditation_compassion: fragrantheart('compassion/loving-self-compassion'),
  meditation_peace_love: fragrantheart('love/peace-love-and-compassion'),
  meditation_calm: fragrantheart('relaxation/stress-relief'),
  meditation_sleep: fragrantheart('relaxation/peaceful-sleep'),
};

/**
 * In-memory cache for Firebase download URLs.
 *
 * Firebase download URLs include temporary access tokens that expire
 * after ~30 minutes. We cache them to avoid re-fetching and to minimize
 * API calls. The cache is checked before making a new request.
 *
 * Structure: key -> { url, timestamp }
 * The timestamp lets us invalidate entries after CACHE_DURATION.
 */
const urlCache: Map<string, { url: string; timestamp: number }> = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes: Firebase token expiry

/**
 * Get audio URL by logical key (async).
 *
 * Three-tier lookup strategy:
 *   1. Check externalUrls first (no token needed, instant)
 *   2. Check cache for Firebase URLs (still valid, instant)
 *   3. Fetch fresh download URL from Firebase (requires API call)
 *
 * Caches Firebase URLs for 30 minutes to avoid token re-fetching.
 * Returns null if the key is unknown; screens should handle with fallback UI.
 *
 * Use this for playback screens that display UI while loading.
 * For pre-loading, use preloadAudioUrls() instead.
 *
 * @param key - Audio file key (e.g., 'meditation_body_scan', 'story_midnight_crossing')
 * @returns Promise resolving to the audio URL, or null if not found
 */
export async function getAudioUrl(key: string): Promise<string | null> {
  // --- Tier 1: External URLs (instant, no token) ---
  if (externalUrls[key]) {
    return externalUrls[key];
  }

  // --- Tier 2: Firebase Storage path lookup ---
  const storagePath = storagePaths[key];
  if (!storagePath) {
    console.warn(`Audio key not found: ${key}`);
    return null;
  }

  // --- Tier 3: Cache check ---
  const cached = urlCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  // --- Tier 4: Fetch fresh download URL from Firebase ---
  try {
    const storageRef = ref(storage, storagePath);
    const url = await getDownloadURL(storageRef);

    // Cache for future requests
    urlCache.set(key, { url, timestamp: Date.now() });

    return url;
  } catch (error) {
    console.error(`Failed to get download URL for ${key}:`, error);
    return null;
  }
}

/**
 * Synchronous version: returns cached URL or null (no network request).
 *
 * Returns immediately without fetching from Firebase. Useful in render
 * paths where you can't await. For Firebase Storage files not in cache,
 * triggers a background fetch and returns null (caller must have fallback UI).
 *
 * DEPRECATED: Use getAudioUrl() instead. This function is only for
 * backwards compatibility with legacy code that can't await.
 *
 * @param key - Audio file key
 * @returns Cached URL, external URL, or null if Firebase URL not cached
 */
export function getAudioFile(key: string): string | null {
  // --- Check external URLs first (instant) ---
  if (externalUrls[key]) {
    return externalUrls[key];
  }

  // --- Check cache for Firebase Storage URLs ---
  const cached = urlCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  // --- For uncached Firebase files, trigger background fetch ---
  // Don't block: fire and forget. Caller must have fallback UI for null.
  if (storagePaths[key]) {
    getAudioUrl(key).catch(() => {});
    return null;
  }

  return null;
}

/**
 * Prefetch audio URLs into cache (Cache Warming).
 *
 * Eagerly fetches and caches a list of audio URLs. Use before navigating
 * to audio-heavy screens (e.g., listening history, meditation library) to
 * ensure download URLs are cached and ready.
 *
 * This is the Cache Warming pattern: preload frequently-used data on
 * app startup or screen navigation to minimize spinners and improve UX.
 *
 * Errors are silently caught; cache is populated for successful keys only.
 *
 * @param keys - Array of audio file keys to preload
 * @returns Promise that resolves after all preload attempts complete
 */
export async function preloadAudioUrls(keys: string[]): Promise<void> {
  const promises = keys.map(key => getAudioUrl(key).catch(() => null));
  await Promise.all(promises);
}

/**
 * Separate cache for path-based lookups.
 *
 * Some Firestore documents store the full Firebase Storage path
 * (e.g., "audio/sleep/meditations/my-file.mp3") instead of a key.
 * This cache handles that scenario separately.
 */
const pathUrlCache: Map<string, { url: string; timestamp: number }> = new Map();

/**
 * Get audio URL directly from a Firebase Storage path (async).
 *
 * Use this when Firestore documents contain the full audioPath
 * rather than a key. Example:
 *   - Firestore doc: { audioPath: "audio/meditate/meditations/body-scan.mp3" }
 *   - Call: getAudioUrlFromPath("audio/meditate/meditations/body-scan.mp3")
 *   - Result: signed download URL with access token
 *
 * Caches results for 30 minutes (same strategy as getAudioUrl).
 *
 * @param audioPath - Full Firebase Storage path (e.g., "audio/sleep/meditations/my-file.mp3")
 * @returns Promise resolving to signed URL, or null if fetch fails
 */
export async function getAudioUrlFromPath(audioPath: string): Promise<string | null> {
  if (!audioPath) {
    console.warn('No audio path provided');
    return null;
  }

  // --- Cache check ---
  const cached = pathUrlCache.get(audioPath);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  // --- Fetch fresh download URL from Firebase ---
  try {
    const storageRef = ref(storage, audioPath);
    const url = await getDownloadURL(storageRef);

    // Cache for future requests
    pathUrlCache.set(audioPath, { url, timestamp: Date.now() });

    return url;
  } catch (error) {
    console.error(`Failed to get download URL for path ${audioPath}:`, error);
    return null;
  }
}

/**
 * Export: Storage path and external URL registries.
 *
 * Allows consuming code to iterate over all known audio keys or paths.
 * Example: preloadAudioUrls(Object.keys(storagePaths)) to cache all Firebase audio.
 */
export { storagePaths, externalUrls };
