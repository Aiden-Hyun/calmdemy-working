/**
 * ============================================================
 * ContentPreloadContext.tsx — Cache Warming & Content Prefetch
 * ============================================================
 *
 * Architectural Role:
 *   This module implements a Cache Warming pattern combined with
 *   the Provider pattern to eagerly load all content across the
 *   app's major sections (Home, Meditate, Sleep, Music) on app
 *   startup. By prefetching everything in parallel via Promise.all,
 *   we ensure screens render with populated data instead of spinners,
 *   dramatically improving perceived performance.
 *
 * Design Patterns:
 *   - Provider Pattern: Exposes preload state and refresh functions
 *     via React Context (useContentPreload hook).
 *   - Cache Warming: preloadAll() eagerly fetches and caches all
 *     content collections on app launch.
 *   - Prefetch Strategy: Pull-to-refresh methods (refreshHome,
 *     refreshMleep, etc.) allow selective stale cache invalidation
 *     without reloading the entire app.
 *   - Deduplication: Favorites are deduplicated by ID to prevent
 *     duplicate rendering in lists (Set-based O(1) lookup).
 *
 * Key Dependencies:
 *   - firestoreService: All data fetches (quotes, meditation, courses, etc.)
 *   - downloadService: Local content that user has cached
 *   - AsyncStorage: Session persistence (future)
 *
 * Consumed By:
 *   Root app shell. Every screen consumes via useContentPreload() to
 *   access cached collections without individual queries.
 * ============================================================
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getTodayQuote,
  getListeningHistory,
  getFavoritesWithDetails,
  getEmergencyMeditations,
  getCourses,
  getBedtimeStories,
  getSleepMeditations,
  getSeries,
  getSleepSounds,
  getWhiteNoise,
  getMusic,
  getAsmr,
  getAlbums,
  ResolvedContent,
  FirestoreEmergencyMeditation,
  FirestoreCourse,
  FirestoreSleepMeditation,
  FirestoreSeries,
  FirestoreSleepSound,
  FirestoreMusicItem,
  FirestoreAlbum,
} from '../services/firestoreService';
import { getDownloadedContent, DownloadedContent } from '../services/downloadService';
import { DailyQuote, ListeningHistoryItem, BedtimeStory } from '../types';

// --- Type Definitions: Content Collections by Feature ---
// Content data types for each page
interface HomeContent {
  quote: DailyQuote | null;
  recentlyPlayed: ListeningHistoryItem[];
  favorites: ResolvedContent[];
  downloads: DownloadedContent[];
}

interface MeditateContent {
  emergencyMeditations: FirestoreEmergencyMeditation[];
  courses: FirestoreCourse[];
}

interface SleepContent {
  bedtimeStories: BedtimeStory[];
  sleepMeditations: FirestoreSleepMeditation[];
  series: FirestoreSeries[];
}

interface MusicContent {
  sleepSounds: FirestoreSleepSound[];
  whiteNoise: FirestoreMusicItem[];
  music: FirestoreMusicItem[];
  asmr: FirestoreMusicItem[];
  albums: FirestoreAlbum[];
}

/**
 * Context type for content preload state and actions.
 *
 * This is the contract for all cached content throughout the app.
 * Once preloadAll() completes, all fields are populated; screens can
 * render immediately without additional data fetching.
 */
interface ContentPreloadContextType {
  // Loading states
  isPreloading: boolean;
  isPreloaded: boolean;
  
  // Preload function
  preloadAll: (userId: string | null, isAnonymous: boolean) => Promise<void>;
  
  // Content data
  homeContent: HomeContent;
  meditateContent: MeditateContent;
  sleepContent: SleepContent;
  musicContent: MusicContent;
  
  // Refresh functions for pull-to-refresh
  refreshHome: (userId: string | null, isAnonymous: boolean) => Promise<void>;
  refreshMeditate: () => Promise<void>;
  refreshSleep: () => Promise<void>;
  refreshMusic: () => Promise<void>;
  
  // Reset (for logout)
  reset: () => void;
}

const defaultHomeContent: HomeContent = {
  quote: null,
  recentlyPlayed: [],
  favorites: [],
  downloads: [],
};

const defaultMeditateContent: MeditateContent = {
  emergencyMeditations: [],
  courses: [],
};

const defaultSleepContent: SleepContent = {
  bedtimeStories: [],
  sleepMeditations: [],
  series: [],
};

const defaultMusicContent: MusicContent = {
  sleepSounds: [],
  whiteNoise: [],
  music: [],
  asmr: [],
  albums: [],
};

// --- Context Definition ---
const ContentPreloadContext = createContext<ContentPreloadContextType | undefined>(undefined);

interface ContentPreloadProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages the preload lifecycle.
 * Exposes cached content and refresh functions to all descendant screens.
 */
export function ContentPreloadProvider({ children }: ContentPreloadProviderProps) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);

  // Content state — populated once preloadAll() completes
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [meditateContent, setMeditateContent] = useState<MeditateContent>(defaultMeditateContent);
  const [sleepContent, setSleepContent] = useState<SleepContent>(defaultSleepContent);
  const [musicContent, setMusicContent] = useState<MusicContent>(defaultMusicContent);

  /**
   * Eagerly load all app content on startup.
   *
   * This implements the Cache Warming pattern: instead of lazy-loading data
   * per-screen, we load everything in one shot at app init. This eliminates
   * spinners and improves perceived performance. The isPreloading/isPreloaded
   * flags prevent duplicate requests if called multiple times (idempotent).
   *
   * User-specific content (history, favorites) only fetches if the user is
   * authenticated and not anonymous — anonymous users get only public content.
   *
   * @param userId - Authenticated user ID (null for anonymous users)
   * @param isAnonymous - Flag indicating anonymous session
   */
  const preloadAll = useCallback(async (userId: string | null, isAnonymous: boolean) => {
    // Prevent duplicate concurrent requests: only run once, ignore subsequent calls
    if (isPreloading || isPreloaded) return;

    setIsPreloading(true);

    try {
      // --- Parallel Data Fetch Strategy ---
      // Fetch ALL content collections in parallel via Promise.all().
      // This is far faster than sequential requests (1 slow request vs. 15).
      // Conditional fetches: skip user-specific data for anonymous users.
      const [
        // Home content
        quoteData,
        historyData,
        favoritesData,
        downloadsData,
        // Meditate content
        emergencyData,
        coursesData,
        // Sleep content
        storiesData,
        sleepMeditationsData,
        seriesData,
        // Music content
        sleepSoundsData,
        whiteNoiseData,
        musicData,
        asmrData,
        albumsData,
      ] = await Promise.all([
        // Home
        getTodayQuote(),
        userId && !isAnonymous ? getListeningHistory(userId, 10) : Promise.resolve([]),
        userId && !isAnonymous ? getFavoritesWithDetails(userId) : Promise.resolve([]),
        getDownloadedContent(),
        // Meditate
        getEmergencyMeditations(),
        getCourses(),
        // Sleep
        getBedtimeStories(),
        getSleepMeditations(),
        getSeries(),
        // Music
        getSleepSounds(),
        getWhiteNoise(),
        getMusic(),
        getAsmr(),
        getAlbums(),
      ]);

      // --- Deduplication: Favorites ---
      // Firestore queries can sometimes return duplicates due to replication.
      // Use a Set-based filter to ensure each favorite ID appears only once.
      // This prevents rendering duplicate items in favorite lists.
      const seenIds = new Set<string>();
      const uniqueFavorites = favoritesData.filter(fav => {
        if (seenIds.has(fav.id)) return false;
        seenIds.add(fav.id);
        return true;
      });

      // --- State Updates ---
      // Atomically update all content at once. This is a single render batch,
      // so no intermediate "loading" states are visible to consumers.
      setHomeContent({
        quote: quoteData,
        recentlyPlayed: historyData,
        favorites: uniqueFavorites,
        downloads: downloadsData,
      });

      setMeditateContent({
        emergencyMeditations: emergencyData,
        courses: coursesData,
      });

      setSleepContent({
        bedtimeStories: storiesData,
        sleepMeditations: sleepMeditationsData,
        series: seriesData,
      });

      setMusicContent({
        sleepSounds: sleepSoundsData,
        whiteNoise: whiteNoiseData,
        music: musicData,
        asmr: asmrData,
        albums: albumsData,
      });

      setIsPreloaded(true);
    } catch (error) {
      console.error('Error preloading content:', error);
      // Graceful Degradation: even if fetch fails, mark as preloaded so the app
      // doesn't get stuck in a loading state. Screens will render with empty
      // collections, and pull-to-refresh can be used to retry.
      setIsPreloaded(true);
    } finally {
      setIsPreloading(false);
    }
  }, [isPreloading, isPreloaded]);

  /**
   * Refresh home content (pull-to-refresh strategy).
   *
   * Individually refreshes only the Home tab data without touching other sections.
   * Useful for manual refresh UI without disturbing cached Meditate/Sleep/Music data.
   */
  const refreshHome = useCallback(async (userId: string | null, isAnonymous: boolean) => {
    try {
      const [quoteData, historyData, favoritesData, downloadsData] = await Promise.all([
        getTodayQuote(),
        userId && !isAnonymous ? getListeningHistory(userId, 10) : Promise.resolve([]),
        userId && !isAnonymous ? getFavoritesWithDetails(userId) : Promise.resolve([]),
        getDownloadedContent(),
      ]);

      // Deduplication applied here too (see preloadAll for rationale)
      const seenIds = new Set<string>();
      const uniqueFavorites = favoritesData.filter(fav => {
        if (seenIds.has(fav.id)) return false;
        seenIds.add(fav.id);
        return true;
      });

      setHomeContent({
        quote: quoteData,
        recentlyPlayed: historyData,
        favorites: uniqueFavorites,
        downloads: downloadsData,
      });
    } catch (error) {
      console.error('Error refreshing home content:', error);
    }
  }, []);

  /**
   * Refresh meditate tab content (pull-to-refresh strategy).
   * Invalidates emergency meditations and courses cache.
   */
  const refreshMeditate = useCallback(async () => {
    try {
      const [emergencyData, coursesData] = await Promise.all([
        getEmergencyMeditations(),
        getCourses(),
      ]);
      setMeditateContent({
        emergencyMeditations: emergencyData,
        courses: coursesData,
      });
    } catch (error) {
      console.error('Error refreshing meditate content:', error);
    }
  }, []);

  /**
   * Refresh sleep tab content (pull-to-refresh strategy).
   * Invalidates bedtime stories, sleep meditations, and series cache.
   */
  const refreshSleep = useCallback(async () => {
    try {
      const [storiesData, sleepMeditationsData, seriesData] = await Promise.all([
        getBedtimeStories(),
        getSleepMeditations(),
        getSeries(),
      ]);
      setSleepContent({
        bedtimeStories: storiesData,
        sleepMeditations: sleepMeditationsData,
        series: seriesData,
      });
    } catch (error) {
      console.error('Error refreshing sleep content:', error);
    }
  }, []);

  /**
   * Refresh music tab content (pull-to-refresh strategy).
   * Invalidates sleep sounds, white noise, music, ASMR, and albums cache.
   */
  const refreshMusic = useCallback(async () => {
    try {
      const [sleepSoundsData, whiteNoiseData, musicData, asmrData, albumsData] = await Promise.all([
        getSleepSounds(),
        getWhiteNoise(),
        getMusic(),
        getAsmr(),
        getAlbums(),
      ]);
      setMusicContent({
        sleepSounds: sleepSoundsData,
        whiteNoise: whiteNoiseData,
        music: musicData,
        asmr: asmrData,
        albums: albumsData,
      });
    } catch (error) {
      console.error('Error refreshing music content:', error);
    }
  }, []);

  /**
   * Clear all cached content and reset preload state.
   *
   * Called on logout to purge user-specific data (history, favorites)
   * and prevent data leakage to the next user.
   */
  const reset = useCallback(() => {
    setIsPreloaded(false);
    setIsPreloading(false);
    setHomeContent(defaultHomeContent);
    setMeditateContent(defaultMeditateContent);
    setSleepContent(defaultSleepContent);
    setMusicContent(defaultMusicContent);
  }, []);

  return (
    <ContentPreloadContext.Provider
      value={{
        isPreloading,
        isPreloaded,
        preloadAll,
        homeContent,
        meditateContent,
        sleepContent,
        musicContent,
        refreshHome,
        refreshMeditate,
        refreshSleep,
        refreshMusic,
        reset,
      }}
    >
      {children}
    </ContentPreloadContext.Provider>
  );
}

/**
 * Hook to access the content preload context.
 *
 * Throws if used outside ContentPreloadProvider (guard clause).
 * Screens use this to read cached content collections without individual queries.
 */
export function useContentPreload() {
  const context = useContext(ContentPreloadContext);
  if (!context) {
    throw new Error('useContentPreload must be used within a ContentPreloadProvider');
  }
  return context;
}
