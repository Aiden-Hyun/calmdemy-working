/**
 * ============================================================
 * features/library/api/content.ts — Polymorphic content resolver
 * ============================================================
 *
 * The library feature's polymorphic content resolution: getContentById routes a
 * (contentId, contentType) pair to the right per-feature lookup and returns a
 * unified ResolvedContent. Also houses the parent-lookup helpers and the
 * series/album detail fetchers. Split out of the legacy firestoreService.ts in
 * Phase 3 (Group H).
 *
 * Cross-feature note: this resolver inherently spans every content type, so it
 * imports per-feature api functions/interfaces directly (emergency, sleep,
 * meditation, music). This is the one accepted cross-feature dependency during
 * Phase 3 — Phase 5 (library extraction) cleans it up properly.
 * ============================================================
 */

import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../core/firebase";
import { getEmergencyMeditationById } from "../../emergency/api/emergencyMeditations";
import { getSleepMeditationById } from "../../sleep/api/sleepMeditations";
import { getCourses } from "../../meditation/api/courses";
import { getSeries } from "../../sleep/api/series";
import type { FirestoreSeries, FirestoreSeriesChapter } from "../../sleep/api/series";
import { getAlbums } from "../../music/api/albums";
import type { FirestoreAlbum, FirestoreAlbumTrack } from "../../music/api/albums";
import { getUserFavorites } from "./favorites";

/**
 * In-memory Cache-Aside stores reused across getContentById and the parent
 * lookups. (After the Phase 3 split, getSeries/getAlbums own their own caches in
 * the sleep/music features, so these stay cold and the `?? await get…()` paths
 * always fetch live — Phase 5 reconciles this when library is fully extracted.)
 */
let _seriesCache: any[] | null = null;
let _albumsCache: any[] | null = null;

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
      if (s.chapters?.some((ch: any) => ch.id === chapterId)) return s.id;
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
      if (a.tracks?.some((t: any) => t.id === trackId)) return a.id;
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
