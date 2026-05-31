/**
 * ============================================================
 * firestoreService.ts — Firestore data-access BARREL (Phase 3 complete)
 * ============================================================
 *
 * Historical note:
 *   This file used to be the ~2,600-line Firestore mega-repository for the whole
 *   app. Phase 3 of the modular refactor carved it into per-feature `api/`
 *   modules (each feature now owns its own data access). What remains here is a
 *   thin barrel that re-exports those modules so existing consumers (screens and
 *   hooks that still `import { x } from ".../services/firestoreService"`) keep
 *   working unchanged.
 *
 * Where everything lives now:
 *   - Meditation / courses → features/meditation/api/{meditations,courses}
 *   - Progress (sessions, stats, history, playback, completion)
 *                          → features/progress/api/*
 *   - Breathing            → features/breathing/api/exercises
 *   - Sleep (bedtime stories, sleep meditations, series)
 *                          → features/sleep/api/*
 *   - Emergency            → features/emergency/api/emergencyMeditations
 *   - Music (albums, sleep/background sounds, white noise/music/asmr)
 *                          → features/music/api/*
 *   - Library (quotes, favorites, content resolver, lookups, narrators, ratings)
 *                          → features/library/api/*
 *   - Account deletion     → core/auth/cleanup
 *
 * Next step (Phase 5/6): migrate consumers off this barrel onto the feature
 * `index.ts` public surfaces, then delete this file.
 * ============================================================
 */

// ---- Meditation (Phase 3, Group E) ----
export {
  getMeditations,
  getMeditationsByTheme,
  getMeditationsByTechnique,
  getMeditationById,
} from "../features/meditation/api/meditations";
export type {
  FirestoreCourse,
  FirestoreCourseSession,
} from "../features/meditation/api/courses";
export { getCourses, getCourseById } from "../features/meditation/api/courses";
// Note: getPrograms / meditation_programs were dead (no consumers) and removed in Group E.

// ---- Progress (Phase 3, Group C) ----
export { createSession, getUserSessions, getUserStats } from "../features/progress/api/sessions";
export { addToListeningHistory, getListeningHistory } from "../features/progress/api/listeningHistory";
export type { PlaybackProgress } from "../features/progress/api/playbackProgress";
export {
  savePlaybackProgress,
  getPlaybackProgress,
  clearPlaybackProgress,
} from "../features/progress/api/playbackProgress";
export {
  markContentCompleted,
  getCompletedContentIds,
  isContentCompleted,
} from "../features/progress/api/completion";

// ---- Breathing (Phase 3, Group A) ----
export { getBreathingExercises } from "../features/breathing/api/exercises";

// ---- Sleep (Phase 3, Group F) ----
export {
  getBedtimeStories,
  getBedtimeStoryById,
  getSleepStories,
  getSleepStoryById,
} from "../features/sleep/api/bedtimeStories";
export type { FirestoreSleepMeditation } from "../features/sleep/api/sleepMeditations";
export {
  getSleepMeditations,
  getSleepMeditationById,
} from "../features/sleep/api/sleepMeditations";
export type { FirestoreSeries, FirestoreSeriesChapter } from "../features/sleep/api/series";
export { getSeries } from "../features/sleep/api/series";

// ---- Emergency (Phase 3, Group B) ----
export type { FirestoreEmergencyMeditation } from "../features/emergency/api/emergencyMeditations";
export {
  getEmergencyMeditations,
  getEmergencyMeditationById,
} from "../features/emergency/api/emergencyMeditations";

// ---- Music (Phase 3, Group G) ----
export type { FirestoreAlbum, FirestoreAlbumTrack } from "../features/music/api/albums";
export { getAlbums } from "../features/music/api/albums";
export type { FirestoreSleepSound } from "../features/music/api/sleepSounds";
export {
  getSleepSounds,
  getSleepSoundsByCategory,
  getSleepSoundById,
} from "../features/music/api/sleepSounds";
export type { FirestoreBackgroundSound } from "../features/music/api/backgroundSounds";
export {
  getBackgroundSounds,
  getBackgroundSoundsByCategory,
  getBackgroundSoundById,
} from "../features/music/api/backgroundSounds";
export type { FirestoreMusicItem } from "../features/music/api/music";
export { getWhiteNoise, getMusic, getAsmr } from "../features/music/api/music";

// ---- Account deletion (Phase 3, Group D) ----
export { deleteUserAccount } from "../core/auth/cleanup";

// ---- Library (Phase 3, Group H) ----
export { getTodayQuote } from "../features/library/api/quotes";
export {
  getUserFavorites,
  toggleFavorite,
  isFavorite,
} from "../features/library/api/favorites";
export type { ResolvedContent } from "../features/library/api/content";
export {
  getContentById,
  getFavoritesWithDetails,
  findSeriesIdByChapterId,
  findAlbumIdByTrackId,
  findCourseIdBySessionId,
  getSeriesById,
  getAlbumById,
} from "../features/library/api/content";
export type { FirestoreNarrator } from "../features/library/api/narrators";
export {
  getNarrators,
  getNarratorByName,
  getNarratorProfileUrl,
} from "../features/library/api/narrators";
export {
  getUserRating,
  setContentRating,
  reportContent,
} from "../features/library/api/ratings";
