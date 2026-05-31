/**
 * ============================================================
 * firestoreService.ts — Firestore Data Repository (Repository Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Repository pattern as the primary data access
 *   layer (Facade) for Calmdemy's Firestore backend. It encapsulates all
 *   Firestore queries, mutations, and transformations, providing a clean
 *   abstraction boundary between domain models and Firebase infrastructure.
 *   ViewModels and screens depend exclusively on these exported functions;
 *   if we ever migrate to Supabase or another backend, only this file changes.
 *
 * Design Patterns & Concepts:
 *   - Repository Pattern: All Firestore queries are centralized here,
 *     isolating domain logic from database specifics.
 *   - Facade: Provides simplified, cohesive interfaces to complex multi-step
 *     operations (e.g., toggleFavorite abstracts the deduplication logic).
 *   - Polymorphic Dispatch: getContentById uses a discriminated union (contentType)
 *     to route to the correct resolver function — avoids cascading type guards.
 *   - Graceful Degradation: All functions include try-catch blocks and return
 *     sensible defaults (empty arrays, null) so the app remains functional
 *     even when Firestore queries fail (network errors, missing data, etc.).
 *   - Read-Before-Write: updateUserStats reads existing user stats first to
 *     compute streaks and longest streaks before persisting, avoiding data loss.
 *   - Denormalization: toggleFavorite stores redundant metadata (title, thumbnail)
 *     in the favorites document to avoid N+1 queries when displaying favorites.
 *   - Cache-Aside: _seriesCache and _albumsCache store full collections in memory
 *     to speed up lookups in getContentById (tradeoff: eventual consistency).
 *
 * Key Sections:
 *   1. MEDITATIONS — Guided meditation retrieval by ID, theme, technique
 *   2. SESSIONS — User meditation completion tracking (recording, querying)
 *   3. USER STATS — Streak calculation and stats aggregation (complex temporal logic)
 *   4. PROGRAMS — Meditation program/courses
 *   5. BREATHING EXERCISES, BEDTIME STORIES, DAILY QUOTES — Simple CRUD
 *   6. FAVORITES — Toggle, query, with denormalized metadata for efficiency
 *   7. CONTENT RESOLVER — Polymorphic factory to resolve any content by type
 *   8. SPECIALIZED CONTENT (Sleep meditations, Emergency meditations, Courses, etc.)
 *   9. PARENT LOOKUP HELPERS — Reverse-lookup for hierarchical content (series→chapters)
 *   10. LISTENING HISTORY — Audit trail of user consumption
 *   11. PLAYBACK PROGRESS — Resume points for long-form content
 *   12. COMPLETION TRACKING — User progress toward courses/programs
 *   13. ACCOUNT DELETION — GDPR-style data cleanup (cross-collection deletes)
 *   14. RATINGS & REPORTS — User-generated quality signals
 *
 * Timestamp Handling:
 *   Firestore Timestamp objects must be explicitly converted to ISO strings.
 *   Every function that reads timestamps includes the pattern:
 *     data.field instanceof Timestamp ? data.field.toDate().toISOString() : fallback
 *   This ensures TypeScript callers always work with standardized strings.
 *
 * Consumed By:
 *   - All feature ViewModels (hooks in src/features/*\/hooks/)
 *   - Global state (UserStats context, etc.)
 *   - React Query hooks that wrap these functions
 * ============================================================
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../core/firebase";
import {
  DailyQuote,
  UserFavorite,
  RatingType,
  ReportCategory,
} from "../types";
// Phase 3 (Group B): emergency data lives in its feature now. Imported here so the
// barrel can both re-export it and call getEmergencyMeditationById from getContentById.
import {
  getEmergencyMeditations,
  getEmergencyMeditationById,
} from "../features/emergency/api/emergencyMeditations";
// Phase 3 (Group E): getCourses imported so getContentById can resolve course_session content.
import { getCourses } from "../features/meditation/api/courses";
// Phase 3 (Group F): sleep data lives in its feature now. getSeries / getSleepMeditationById are
// imported so getContentById and findSeriesIdByChapterId (still in the barrel) can call them; the
// series interfaces are imported for type-only use by getSeriesById (a library lookup staying here).
import { getSeries } from "../features/sleep/api/series";
import type { FirestoreSeries, FirestoreSeriesChapter } from "../features/sleep/api/series";
import {
  getSleepMeditations,
  getSleepMeditationById,
} from "../features/sleep/api/sleepMeditations";
// Phase 3 (Group G): getAlbums imported so getContentById / findAlbumIdByTrackId can call it;
// album interfaces imported for type-only use by getAlbumById (a library lookup staying here).
import { getAlbums } from "../features/music/api/albums";
import type { FirestoreAlbum, FirestoreAlbumTrack } from "../features/music/api/albums";

/**
 * In-memory Cache-Aside pattern: we populate these caches when calling getSeries()
 * and getAlbums(), then reuse them in getContentById() to avoid re-querying Firestore
 * for every content resolution. Trade-off: eventual consistency (if data changes in
 * Firestore, we may serve stale versions until the app is restarted).
 * In production, consider wrapping these with React Query for TTL-based invalidation.
 */
let _seriesCache: any[] | null = null;
let _albumsCache: any[] | null = null;

/**
 * Collection reference initialization (Firestore schema contracts).
 * Each constant defines a read/write path in the database. Firestore queries
 * narrow these collections using where(), orderBy(), and limit() clauses.
 * (Querying broad collections is fine; Firestore's index optimizer handles it.)
 */
const quotesCollection = collection(db, "daily_quotes");
const favoritesCollection = collection(db, "user_favorites");
const contentRatingsCollection = collection(db, "content_ratings");
const contentReportsCollection = collection(db, "content_reports");

// ============================================================
// MEDITATIONS SECTION (Phase 3, Group E) — moved to features/meditation/api/*
// ============================================================
export {
  getMeditations,
  getMeditationsByTheme,
  getMeditationsByTechnique,
  getMeditationById,
} from "../features/meditation/api/meditations";
// getCourses is imported (not bare re-exported) because getContentById below
// calls it to resolve course_session content.
export type {
  FirestoreCourse,
  FirestoreCourseSession,
} from "../features/meditation/api/courses";
export { getCourseById } from "../features/meditation/api/courses";
export { getCourses };

// Note: getPrograms / meditation_programs were dead (no consumers) and removed in Group E.

// ============================================================
// PROGRESS (Phase 3, Group C) — moved to features/progress/api/*
// Sessions/stats, listening history, playback progress, completion tracking.
// ============================================================
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

// ============================================================
// BREATHING EXERCISES SECTION
// ============================================================

// Breathing exercises moved to features/breathing/api/exercises.ts (Phase 3, Group A)
export { getBreathingExercises } from "../features/breathing/api/exercises";

// ============================================================
// BEDTIME STORIES SECTION (Phase 3, Group F) — moved to features/sleep/api/bedtimeStories.ts
// ============================================================
export {
  getBedtimeStories,
  getBedtimeStoryById,
  getSleepStories,
  getSleepStoryById,
} from "../features/sleep/api/bedtimeStories";

// ============================================================
// DAILY QUOTES SECTION
// ============================================================

/**
 * Retrieve today's featured quote (Graceful Degradation variant).
 *
 * This demonstrates Graceful Degradation: if no quote matches today's date,
 * we fall back to picking a random quote from the collection. This ensures
 * the UI always has something to display, even if the curated "quote of the day"
 * is missing from Firestore.
 *
 * @returns Today's quote object, or a random quote if today's is not found
 *         Null only if the entire collection is empty or unreachable
 */
export async function getTodayQuote(): Promise<DailyQuote | null> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const q = query(quotesCollection, where("date", "==", today), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: pick a single random quote instead of loading the entire collection.
      // Use a random date-based seed to get variety across days.
      const fallbackQuery = query(quotesCollection, limit(1));
      const fallbackSnapshot = await getDocs(fallbackQuery);
      if (fallbackSnapshot.empty) return null;

      const doc = fallbackSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DailyQuote;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as DailyQuote;
  } catch (error) {
    console.error("Error fetching daily quote:", error);
    return null;
  }
}

// ============================================================
// FAVORITES SECTION
// User-maintained lists of favorited content (music, stories, meditations, etc.)
// Implements Denormalization: metadata is stored redundantly in the favorite
// document to avoid N+1 queries when displaying favorites.
// ============================================================

/**
 * Retrieve all favorites for a user.
 *
 * This reads from a dedicated "user_favorites" collection, which is a Denormalized
 * view: each favorite document contains not only IDs but also metadata (title,
 * thumbnail URL, duration) for fast rendering. Without denormalization, rendering
 * a favorites list would require a separate fetch for each item (N+1 problem).
 *
 * Firestore limitation note: we cannot use orderBy + where together without a
 * composite index. To avoid index overhead, we fetch unordered and sort client-side
 * by favorited_at (most recent first). This trades off a bit of client computation
 * for simpler Firestore setup.
 *
 * @param userId - The authenticated user's UID
 * @returns Array of favorites sorted by favorited_at descending
 *         Empty array on error (Graceful Degradation)
 */
export async function getUserFavorites(
  userId: string
): Promise<UserFavorite[]> {
  try {
    // Query phase: fetch all favorites for this user (no orderBy, to avoid index)
    const q = query(favoritesCollection, where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    // Transform phase: convert Firestore Timestamp objects to ISO strings
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestamp Conversion: Same pattern as getUserSessions
        favorited_at:
          data.favorited_at instanceof Timestamp
            ? data.favorited_at.toDate().toISOString()
            : new Date().toISOString(),
      } as UserFavorite;
    });

    // Client-side Sort (in-app sorting avoids the need for a composite index)
    return items.sort(
      (a, b) =>
        new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime()
    );
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

/**
 * Toggle favorite status for a piece of content.
 *
 * This is an Idempotent Toggle: it checks for an existing favorite document
 * and either deletes it (unfavorite) or creates it (favorite). The operation
 * is idempotent: calling it twice in a row with the same contentId has the
 * same effect as calling it once.
 *
 * Deduplication note: we query by (user_id, content_id) but DON'T filter by
 * content_type. This handles legacy data where an item might be favorited with
 * the wrong type. If we find ANY favorite record for this (user, content), we
 * delete all of them (handles duplicates/corruption).
 *
 * Denormalization: we store metadata (title, thumbnail, duration) redundantly
 * in the favorite document. This supports fast favorites lists without N+1 lookups.
 * If metadata changes in the source (meditation document), favorites will serve
 * stale metadata until the next favorite/unfavorite cycle. This is an acceptable
 * tradeoff (Eventual Consistency).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the content being favorited
 * @param contentType - Discriminated union tag: "meditation", "nature_sound", etc.
 *                     Used for context; all types stored in the same collection
 * @param metadata - Denormalized content metadata (title, thumbnail, duration)
 *                  Stored alongside the favorite for instant display
 * @returns true if the item is now favorited, false if it was removed
 */
export async function toggleFavorite(
  userId: string,
  contentId: string,
  contentType:
    | "meditation"
    | "nature_sound"
    | "bedtime_story"
    | "breathing_exercise"
    | "series_chapter"
    | "album_track"
    | "emergency"
    | "course_session"
    | "sleep_meditation",
  metadata?: {
    title: string;
    thumbnail_url?: string;
    duration_minutes: number;
    course_code?: string;
    session_code?: string;
  }
): Promise<boolean> {
  try {
    // Phase 1: Check for existing favorite (Deduplication pattern)
    // Query ignores content_type; if ANY favorite exists for this (user, content),
    // we delete it (handles legacy entries with wrong type or duplicates)
    const q = query(
      favoritesCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const existing = await getDocs(q);

    if (!existing.empty) {
      // Phase 2a: Unfavorite — batch-delete all matching docs (handles duplicates)
      const deletePromises = existing.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return false; // New state: unfavorited
    } else {
      // Phase 2b: Favorite — create new favorite document with denormalized metadata
      await addDoc(favoritesCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType, // Stored for analytics/debugging, not used in queries
        favorited_at: serverTimestamp(),
        // Denormalization: embed metadata to avoid N+1 lookups when displaying favorites.
        // Optional fields are conditionally included to keep document size minimal.
        ...(metadata && {
          title: metadata.title,
          thumbnail_url: metadata.thumbnail_url || null,
          duration_minutes: metadata.duration_minutes,
          ...(metadata.course_code && { course_code: metadata.course_code }),
          ...(metadata.session_code && { session_code: metadata.session_code }),
        }),
      });
      return true; // New state: favorited
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }
}

/**
 * Check if a piece of content is in the user's favorites (boolean query).
 *
 * This is a quick existence check without fetching the full document.
 * Used by UI to show/hide favorite buttons without loading metadata.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the content
 * @returns true if the content is favorited, false otherwise
 */
export async function isFavorite(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    const q = query(
      favoritesCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking favorite:", error);
    return false;
  }
}

// ============================================================
// CONTENT RESOLVER SECTION
// Polymorphic factory function that resolves any content type by ID.
// Demonstrates the Polymorphic Dispatch pattern: discriminated union (contentType)
// routes to the correct resolver function, avoiding cascading type guards.
// ============================================================

/**
 * Unified interface for resolved content, regardless of type.
 * Allows functions to display metadata for heterogeneous content in a single UI (e.g., favorites list).
 */
export interface ResolvedContent {
  id: string;
  title: string;
  thumbnail_url?: string;
  duration_minutes: number;
  content_type:
    | "meditation"
    | "nature_sound"
    | "bedtime_story"
    | "breathing_exercise"
    | "series_chapter"
    | "album_track"
    | "emergency"
    | "course_session"
    | "sleep_meditation";
  // For course sessions — display course code (e.g., "CBT101") and session code (e.g., "CBT101M1L")
  course_code?: string;
  session_code?: string;
}

/**
 * Polymorphic content resolver: fetch any content by type and ID.
 *
 * This is a complex Polymorphic Dispatch function that implements multi-layer
 * resolution strategies to balance Firestore cost vs. latency:
 *
 * Resolution Strategy (in order):
 *   1. Emergency meditations: Direct lookup via getEmergencyMeditationById()
 *   2. Hierarchical content (series_chapter, album_track, course_session):
 *      a. Try content_index (denormalized single-doc lookup — fast, cheap)
 *      b. Fall back to in-memory cache (_seriesCache, _albumsCache)
 *      c. Fall back to full collection fetch (if cache miss)
 *   3. Sleep meditations: Direct lookup via getSleepMeditationById()
 *   4. Other types (meditation, bedtime_story, breathing_exercise, nature_sound):
 *      Direct doc access from their respective collections
 *
 * Design Patterns:
 *   - Polymorphic Dispatch: contentType discriminates which resolver to use
 *   - Cache-Aside: Hierarchical content is cached in memory for fast replay
 *   - Read-Before-Write-adjacent: We try cheap paths before expensive ones
 *   - Graceful Degradation: Returns null if content not found, never crashes
 *
 * The content_index collection is a denormalized view maintained by Cloud Functions:
 * when you write/update hierarchical content, a function writes a flat document to
 * content_index with all metadata needed for fast resolution. This avoids fetching
 * entire series/album collections just to look up one chapter/track.
 *
 * Performance note: For high-frequency lookups (e.g., in a favorites list being
 * rendered 50 times/sec), pair this with React Query caching and memoization.
 *
 * @param contentId - Firestore document ID of the content
 * @param contentType - Discriminated union tag routing to the correct resolver
 * @returns ResolvedContent with unified metadata, or null if not found
 *         Always returns the same shape (title, thumbnail_url, duration_minutes, etc.)
 */
export async function getContentById(
  contentId: string,
  contentType:
    | "meditation"
    | "nature_sound"
    | "bedtime_story"
    | "breathing_exercise"
    | "series_chapter"
    | "album_track"
    | "emergency"
    | "course_session"
    | "sleep_meditation"
): Promise<ResolvedContent | null> {
  try {
    // Phase 1: Emergency meditations (simple direct lookup)
    if (contentType === "emergency") {
      const emergency = await getEmergencyMeditationById(contentId);
      if (emergency) {
        return {
          id: contentId,
          title: emergency.title,
          thumbnail_url: emergency.thumbnailUrl,
          duration_minutes: emergency.duration_minutes,
          content_type: contentType,
        };
      }
      return null;
    }

    // Phase 2: Hierarchical content (series_chapter, album_track, course_session)
    // Multi-layer strategy: fast path (content_index) → cache → full fetch
    if (contentType === "series_chapter" || contentType === "album_track" || contentType === "course_session") {
      // Sub-phase 2a: Try content_index (denormalized flat document, fast single read)
      // This is maintained by Cloud Functions and contains all data needed for resolution
      const indexRef = doc(db, "content_index", contentId);
      const indexSnap = await getDoc(indexRef);

      if (indexSnap.exists()) {
        // Cache hit in content_index: return immediately (cheapest path)
        const idx = indexSnap.data();
        return {
          id: contentId,
          title: contentType === "course_session"
            ? idx.contentTitle
            : `${idx.parentTitle}: ${idx.contentTitle}`,
          thumbnail_url: idx.parentThumbnailUrl,
          duration_minutes: idx.duration_minutes || 0,
          content_type: contentType,
          course_code: idx.courseCode,
          session_code: idx.sessionCode,
        };
      }

      // Sub-phase 2b: Fallback to in-memory cache or fetch (for content not yet indexed)
      // If cache is already warm from a previous getSeries()/getAlbums() call, this is fast
      if (contentType === "series_chapter") {
        const allSeries = _seriesCache ?? await getSeries();
        for (const series of allSeries) {
          const chapter = series.chapters?.find((c: any) => c.id === contentId);
          if (chapter) {
            return {
              id: contentId,
              title: `${series.title}: ${chapter.title}`,
              thumbnail_url: series.thumbnailUrl,
              duration_minutes: chapter.duration_minutes,
              content_type: contentType,
            };
          }
        }
      } else if (contentType === "album_track") {
        const allAlbums = _albumsCache ?? await getAlbums();
        for (const album of allAlbums) {
          const track = album.tracks?.find((t: any) => t.id === contentId);
          if (track) {
            return {
              id: contentId,
              title: `${album.title}: ${track.title}`,
              thumbnail_url: album.thumbnailUrl,
              duration_minutes: track.duration_minutes,
              content_type: contentType,
            };
          }
        }
      } else if (contentType === "course_session") {
        // For course_session, fetch courses (sessions are eager-loaded in getCourseById)
        const allCourses = await getCourses();
        for (const course of allCourses) {
          const session = course.sessions?.find((s: any) => s.id === contentId);
          if (session) {
            return {
              id: contentId,
              title: session.title,
              thumbnail_url: course.thumbnailUrl,
              duration_minutes: session.duration_minutes,
              content_type: contentType,
              course_code: course.code,
              session_code: session.code,
            };
          }
        }
      }

      // Not found in any layer
      return null;
    }

    // Phase 3: Sleep meditations (direct lookup)
    if (contentType === "sleep_meditation") {
      const meditation = await getSleepMeditationById(contentId);
      if (meditation) {
        return {
          id: contentId,
          title: meditation.title,
          thumbnail_url: meditation.thumbnailUrl,
          duration_minutes: meditation.duration_minutes,
          content_type: contentType,
        };
      }
      return null;
    }

    // Phase 4: Simple content types (meditation, bedtime_story, breathing_exercise, nature_sound)
    // Direct doc access: route to the appropriate collection based on contentType
    let collectionName: string;
    switch (contentType) {
      case "meditation":
        collectionName = "guided_meditations";
        break;
      case "bedtime_story":
        collectionName = "bedtime_stories";
        break;
      case "breathing_exercise":
        collectionName = "breathing_exercises";
        break;
      case "nature_sound":
        collectionName = "sleep_sounds";
        break;
      default:
        return null;
    }

    // Direct document access: this is the cheapest Firestore operation
    const docRef = doc(db, collectionName, contentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

    // Normalize fields (handle both camelCase and snake_case naming conventions)
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || data.name || "Untitled",
      thumbnail_url: data.thumbnail_url || data.thumbnailUrl,
      duration_minutes: data.duration_minutes || 0,
      content_type: contentType,
    };
  } catch (error) {
    console.error("Error fetching content by id:", error);
    return null; // Graceful Degradation
  }
}

/**
 * Retrieve user favorites with full content metadata (convenience wrapper).
 *
 * This function demonstrates Denormalization + graceful fallback:
 *   - Newer favorites have denormalized metadata (title, thumbnail, duration) stored
 *     in the favorite document itself, allowing instant rendering without N+1 lookups
 *   - Legacy favorites (created before denormalization was added) lack metadata,
 *     so we fall back to getContentById() to resolve the full content
 *
 * Returns a unified ResolvedContent array ready for rendering in any UI (favorites
 * list, cards, etc.). Handles mixed old/new favorite data gracefully.
 *
 * @param userId - The authenticated user's UID
 * @returns Array of ResolvedContent objects with all metadata populated
 *         Empty array on error (Graceful Degradation)
 */
export async function getFavoritesWithDetails(
  userId: string
): Promise<ResolvedContent[]> {
  try {
    const favorites = await getUserFavorites(userId);
    const resolvedContent: ResolvedContent[] = [];

    const resolved = await Promise.all(
      favorites.map(async (fav) => {
        const favData = fav as any;

        // Fast path: denormalized metadata present (new favorites)
        if (favData.title) {
          return {
            id: fav.content_id,
            title: favData.title,
            thumbnail_url: favData.thumbnail_url,
            duration_minutes: favData.duration_minutes || 0,
            content_type: fav.content_type,
            course_code: favData.course_code,
            session_code: favData.session_code,
          } as ResolvedContent;
        }

        // Slow path: legacy favorite without metadata, resolve via getContentById()
        return getContentById(fav.content_id, fav.content_type);
      })
    );

    return resolved.filter((item): item is ResolvedContent => item !== null);
  } catch (error) {
    console.error("Error fetching favorites with details:", error);
    return [];
  }
}

// ============================================================
// SLEEP MEDITATIONS SECTION (Phase 3, Group F) — moved to features/sleep/api/sleepMeditations.ts
// getSleepMeditationById is imported below so getContentById can resolve sleep_meditation content.
// ============================================================
export type { FirestoreSleepMeditation } from "../features/sleep/api/sleepMeditations";
export { getSleepMeditations, getSleepMeditationById };

// ============================================================
// EMERGENCY MEDITATIONS SECTION
// Crisis-focused content for immediate anxiety/stress relief (e.g., panic attacks).
// ============================================================

// Emergency meditations moved to features/emergency/api/emergencyMeditations.ts (Phase 3, Group B).
// Imported (not just re-exported) because getContentById below calls getEmergencyMeditationById.
export type { FirestoreEmergencyMeditation } from "../features/emergency/api/emergencyMeditations";
export {
  getEmergencyMeditations,
  getEmergencyMeditationById,
};

// ============================================================
// PARENT LOOKUP HELPERS SECTION
// Reverse-lookups to find parent containers (series, album, course) given a child ID.
// Used for breadcrumb navigation ("Back to Series", "Back to Album").
// Implements a Read-Before-Write-adjacent pattern: tries content_index first (fast),
// falls back to cache or full fetch if index is stale.
// ============================================================

/**
 * Find the parent series ID for a given chapter.
 *
 * Two-phase lookup (with fallback):
 *   1. Try the fast path: query a denormalized "content_index" collection
 *   2. Fallback: scan the in-memory cache or fetch all series and search
 *
 * Returns null if the chapter doesn't exist or the parent can't be found.
 *
 * @param chapterId - Firestore document ID of the chapter
 * @returns The parent series ID, or null if not found
 */
export async function findSeriesIdByChapterId(chapterId: string): Promise<string | null> {
  try {
    // Try content_index first (1 read)
    const indexSnap = await getDoc(doc(db, "content_index", chapterId));
    if (indexSnap.exists()) return indexSnap.data().parentId;

    // Fallback: scan cache or fetch
    const allSeries = _seriesCache ?? await getSeries();
    for (const s of allSeries) {
      if (s.chapters?.some(ch => ch.id === chapterId)) return s.id;
    }
    return null;
  } catch { return null; }
}

/**
 * Find the parent album ID for a given track.
 *
 * Mirrors findSeriesIdByChapterId: tries content_index first, falls back to cache/fetch.
 *
 * @param trackId - Firestore document ID of the track
 * @returns The parent album ID, or null if not found
 */
export async function findAlbumIdByTrackId(trackId: string): Promise<string | null> {
  try {
    // Try content_index first (1 read)
    const indexSnap = await getDoc(doc(db, "content_index", trackId));
    if (indexSnap.exists()) return indexSnap.data().parentId;

    // Fallback: scan cache or fetch
    const allAlbums = _albumsCache ?? await getAlbums();
    for (const a of allAlbums) {
      if (a.tracks?.some(t => t.id === trackId)) return a.id;
    }
    return null;
  } catch { return null; }
}

/**
 * Find the parent course ID for a given course session.
 *
 * Mirrors the series/album lookups: tries content_index first, then falls back
 * to querying the course_sessions collection directly.
 *
 * @param sessionId - Firestore document ID of the course session
 * @returns The parent course ID, or null if not found
 */
export async function findCourseIdBySessionId(sessionId: string): Promise<string | null> {
  try {
    // Try content_index first (1 read)
    const indexSnap = await getDoc(doc(db, "content_index", sessionId));
    if (indexSnap.exists()) return indexSnap.data().parentId;

    // Fallback: query course_sessions collection
    const q = query(
      collection(db, "course_sessions"),
      where("__name__", "==", sessionId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data().courseId || null;
  } catch { return null; }
}

// ============================================================
// SERIES SECTION (Phase 3, Group F) — list query + interfaces moved to features/sleep/api/series.ts
// getSeries is imported below (getContentById / findSeriesIdByChapterId call it). Series *detail*
// lookups (getSeriesById) stay here until Group H (library).
// ============================================================
export type { FirestoreSeries, FirestoreSeriesChapter };
export { getSeries };

/**
 * Retrieve a single series by ID (with all embedded chapters).
 *
 * Direct document access. Transforms denormalized chapter data and returns
 * the complete series object with chapters ready for rendering.
 *
 * @param id - Firestore document ID of the series
 * @returns The series object with chapters, or null if not found
 */
export async function getSeriesById(
  id: string
): Promise<FirestoreSeries | null> {
  try {
    const docRef = doc(db, "series", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    const chapters = (data.chapters || []).map((ch: FirestoreSeriesChapter) => ({ ...ch, isFree: true }));
    return { id: docSnap.id, ...data, chapters } as FirestoreSeries;
  } catch (error) {
    console.error("Error fetching series:", error);
    return null;
  }
}

// ============================================================
// ALBUMS SECTION (Phase 3, Group G) — list + interfaces moved to features/music/api/albums.ts
// getAlbums is imported below (getContentById / findAlbumIdByTrackId call it). Album *detail*
// lookups (getAlbumById) stay here until Group H (library).
// ============================================================
export type { FirestoreAlbum, FirestoreAlbumTrack };
export { getAlbums };

/**
 * Retrieve a single album by ID (with all embedded tracks).
 *
 * Direct document access. Transforms denormalized track data and returns
 * the complete album object with tracks ready for rendering.
 *
 * @param id - Firestore document ID of the album
 * @returns The album object with tracks, or null if not found
 */
export async function getAlbumById(id: string): Promise<FirestoreAlbum | null> {
  try {
    const docRef = doc(db, "albums", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    const tracks = (data.tracks || []).map((t: FirestoreAlbumTrack) => ({ ...t, isFree: true }));
    return { id: docSnap.id, ...data, tracks } as FirestoreAlbum;
  } catch (error) {
    console.error("Error fetching album:", error);
    return null;
  }
}

// ============================================================
// SOUNDS / MUSIC SECTION (Phase 3, Group G) — moved to features/music/api/*
// sleepSounds.ts, backgroundSounds.ts, music.ts (white noise / music / asmr).
// ============================================================
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

// ============================================================
// NARRATORS SECTION
// Metadata about content narrators/instructors (biographies, photos).
// Implements a simple in-memory Cache-Aside pattern for frequently accessed names.
// ============================================================

/**
 * Narrator data model.
 */
export interface FirestoreNarrator {
  id: string;
  name: string;
  bio?: string;
  photoUrl: string;
}

/**
 * In-memory cache for narrator lookups (Cache-Aside pattern).
 * Populated by getNarrators() and getNarratorByName(), keyed by lowercase name.
 * Trades off eventual consistency for reduced Firestore queries.
 */
const narratorCache: Map<string, FirestoreNarrator> = new Map();

/**
 * Retrieve all narrators.
 *
 * Populates the narratorCache for subsequent name-based lookups.
 *
 * @returns Array of all narrators
 *         Empty array on error (Graceful Degradation)
 */
export async function getNarrators(): Promise<FirestoreNarrator[]> {
  try {
    const snapshot = await getDocs(collection(db, "narrators"));
    const narrators = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreNarrator)
    );
    // Update cache
    narrators.forEach((n) => narratorCache.set(n.name.toLowerCase(), n));
    return narrators;
  } catch (error) {
    console.error("Error fetching narrators:", error);
    return [];
  }
}

/**
 * Retrieve a narrator by name (Cache-Aside pattern).
 *
 * Checks the in-memory cache first; if not found, queries Firestore and caches the result.
 * This avoids repeated queries for the same narrator across multiple features/screens.
 *
 * @param name - The narrator's name (case-insensitive)
 * @returns The narrator object, or null if not found
 */
export async function getNarratorByName(
  name: string
): Promise<FirestoreNarrator | null> {
  // Cache lookup (case-insensitive)
  const cached = narratorCache.get(name.toLowerCase());
  if (cached) return cached;

  try {
    const q = query(collection(db, "narrators"), where("name", "==", name));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const narrator = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data(),
    } as FirestoreNarrator;

    // Update cache for future lookups
    narratorCache.set(name.toLowerCase(), narrator);
    return narrator;
  } catch (error) {
    console.error("Error fetching narrator by name:", error);
    return null;
  }
}

/**
 * Get a narrator's profile photo URL by name (cache-based lookup).
 *
 * Synchronous function that checks only the in-memory cache (doesn't hit Firestore).
 * Use after calling getNarrators() or getNarratorByName() to ensure the cache is warm.
 *
 * @param name - The narrator's name (case-insensitive)
 * @returns The photo URL, or null if not found in cache
 */
export function getNarratorProfileUrl(name: string): string | null {
  const cached = narratorCache.get(name.toLowerCase());
  return cached?.photoUrl || null;
}

// ============================================================
// ACCOUNT DELETION SECTION
// GDPR-compliant data cleanup (cross-collection user data purge).
// ============================================================

/**
 * Permanently delete all user data from Firestore (GDPR compliance).
 *
 * This performs a cross-collection purge: after the user initiates account deletion,
 * this function removes all Firestore documents associated with the user's UID.
 * Call this BEFORE deleting the Firebase Auth account (if Auth account is deleted first,
 * you lose the UID and cannot query by user_id).
 *
 * Affected collections:
 *   - user_favorites: All favorited content
 *   - listening_history: Full playback audit trail
 *   - meditation_sessions: All completed sessions
 *   - playback_progress: Resume points
 *   - completed_content: Course/program progress
 *   - users: The user's stats document
 *
 * Implementation note: We use a batch query+delete pattern (fetch all docs matching
 * user_id, then batch-delete them). For large user datasets, consider using a
 * Cloud Function to handle this asynchronously, or Firestore's bulk delete API.
 *
 * @param userId - The authenticated user's UID
 * @throws Error if any delete operation fails (transaction incomplete)
 */
// Account-deletion purge moved to core/auth/cleanup.ts (Phase 3, Group D).
export { deleteUserAccount } from "../core/auth/cleanup";

// ============================================================
// CONTENT RATINGS SECTION
// User-generated quality signals (thumbs up/down, star ratings).
// Provides feedback for content curation and recommendations.
// ============================================================

/**
 * Retrieve the user's rating for a piece of content.
 *
 * Ratings are quality signals: typically "liked" / "disliked" or star counts.
 * Used to filter trending/popular content and personalize recommendations.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns The user's RatingType (e.g., "liked", "disliked"), or null if not rated
 */
export async function getUserRating(
  userId: string,
  contentId: string
): Promise<RatingType | null> {
  try {
    const q = query(
      contentRatingsCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data().rating as RatingType;
  } catch (error) {
    console.error("Error getting user rating:", error);
    return null;
  }
}

/**
 * Set or toggle the user's rating for content (Idempotent Toggle pattern).
 *
 * Supports three cases:
 *   1. No existing rating → create a new rating document
 *   2. Different existing rating → update it (e.g., change "disliked" to "liked")
 *   3. Same existing rating → toggle off (delete the document)
 *
 * This gives users the ability to like/unlike or rate/unrate content, treating
 * the action as a toggle. Returns the new rating state (or null if toggled off).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for analytics/filtering)
 * @param rating - The rating to set (e.g., "liked", "disliked")
 * @returns The new rating state, or null if the rating was toggled off
 */
export async function setContentRating(
  userId: string,
  contentId: string,
  contentType: string,
  rating: RatingType
): Promise<RatingType | null> {
  try {
    // Phase 1: Check for existing rating
    const q = query(
      contentRatingsCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingDoc = snapshot.docs[0];
      const existingRating = existingDoc.data().rating as RatingType;

      if (existingRating === rating) {
        // Phase 2a: Same rating — toggle off (idempotent unfavorite pattern)
        await deleteDoc(existingDoc.ref);
        return null; // New state: unrated
      } else {
        // Phase 2b: Different rating — update (user changed mind)
        await setDoc(existingDoc.ref, {
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          rating: rating,
          rated_at: serverTimestamp(),
        });
        return rating; // New state: updated rating
      }
    } else {
      // Phase 2c: No existing rating — create new
      await addDoc(contentRatingsCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        rating: rating,
        rated_at: serverTimestamp(),
      });
      return rating; // New state: newly rated
    }
  } catch (error) {
    console.error("Error setting content rating:", error);
    return null;
  }
}

// ============================================================
// CONTENT REPORTS SECTION
// User-submitted content moderation signals (spam, inappropriate, etc.).
// ============================================================

/**
 * Submit a content report for moderation review.
 *
 * Users can report content for violations: spam, inappropriate material, copyright,
 * etc. These reports are reviewed by moderators and may result in content removal.
 * The description field allows users to provide context.
 *
 * @param userId - The authenticated user's UID (who is making the report)
 * @param contentId - Firestore document ID of the reported content
 * @param contentType - Content type (for filtering reports by content kind)
 * @param category - ReportCategory enum value (e.g., "inappropriate", "spam", "copyright")
 * @param description - Optional free-text context (e.g., "This guided meditation contains explicit language")
 * @returns true if the report was successfully submitted, false on error (Graceful Degradation)
 */
export async function reportContent(
  userId: string,
  contentId: string,
  contentType: string,
  category: ReportCategory,
  description?: string
): Promise<boolean> {
  try {
    await addDoc(contentReportsCollection, {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      category: category,
      description: description || null,
      reported_at: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error("Error reporting content:", error);
    return false;
  }
}
