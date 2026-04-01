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

const ContentPreloadContext = createContext<ContentPreloadContextType | undefined>(undefined);

interface ContentPreloadProviderProps {
  children: ReactNode;
}

export function ContentPreloadProvider({ children }: ContentPreloadProviderProps) {
  const [isPreloading, setIsPreloading] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);
  
  // Content state
  const [homeContent, setHomeContent] = useState<HomeContent>(defaultHomeContent);
  const [meditateContent, setMeditateContent] = useState<MeditateContent>(defaultMeditateContent);
  const [sleepContent, setSleepContent] = useState<SleepContent>(defaultSleepContent);
  const [musicContent, setMusicContent] = useState<MusicContent>(defaultMusicContent);

  const preloadAll = useCallback(async (userId: string | null, isAnonymous: boolean) => {
    if (isPreloading || isPreloaded) return;
    
    setIsPreloading(true);
    
    try {
      // Fetch ALL content in parallel
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

      // Deduplicate favorites
      const seenIds = new Set<string>();
      const uniqueFavorites = favoritesData.filter(fav => {
        if (seenIds.has(fav.id)) return false;
        seenIds.add(fav.id);
        return true;
      });

      // Update all content states
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
      // Still mark as preloaded so the app doesn't get stuck
      setIsPreloaded(true);
    } finally {
      setIsPreloading(false);
    }
  }, [isPreloading, isPreloaded]);

  const refreshHome = useCallback(async (userId: string | null, isAnonymous: boolean) => {
    try {
      const [quoteData, historyData, favoritesData, downloadsData] = await Promise.all([
        getTodayQuote(),
        userId && !isAnonymous ? getListeningHistory(userId, 10) : Promise.resolve([]),
        userId && !isAnonymous ? getFavoritesWithDetails(userId) : Promise.resolve([]),
        getDownloadedContent(),
      ]);

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

export function useContentPreload() {
  const context = useContext(ContentPreloadContext);
  if (!context) {
    throw new Error('useContentPreload must be used within a ContentPreloadProvider');
  }
  return context;
}
