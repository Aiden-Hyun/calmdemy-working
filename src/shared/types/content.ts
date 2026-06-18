/**
 * ============================================================
 * shared/types/content.ts — Shared Firestore content shapes
 * ============================================================
 *
 * The Firestore document shapes for playable content (albums, series, courses,
 * sleep meditations, sounds, narrators) plus the unified `ResolvedContent`
 * projection. Extracted here in Phase 6e-B from the individual feature `api/`
 * modules.
 *
 * Why these live in shared/ rather than a feature:
 *   The `library` feature aggregates every content kind (its content resolver,
 *   collection screens, and `data/contentTypes` reference album/series/course
 *   shapes), while the content features themselves depend on `library`
 *   (getCategoryIcon, navigateToContent, the decomposed player hooks). Owning
 *   these shapes inside the content features therefore created `library ↔
 *   {music,sleep,meditation}` import cycles, laundered only by the old
 *   firestoreService barrel. A neutral shared home both features depend on
 *   breaks the cycle: features → shared is the allowed direction.
 *
 * Only the data *shapes* moved. The data-access *functions* that read/return
 * them stay feature-owned (features/<x>/api/*); each imports its shapes from
 * here. This is the first occupant of the planned `shared/types/` bucket (the
 * cross-feature discriminators in src/types/index.ts move here in a later pass).
 * ============================================================
 */

// ---- Music: albums ----

/** A single track within a FirestoreAlbum. */
export interface FirestoreAlbumTrack {
  id: string;
  trackNumber: number;
  title: string;
  duration_minutes: number;
  audioPath: string;
  isFree?: boolean;
}

/** An album: a playable collection of tracks. */
export interface FirestoreAlbum {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  color: string;
  artist: string;
  trackCount: number;
  totalDuration: number;
  category: string;
  tracks: FirestoreAlbumTrack[];
}

// ---- Sleep: series ----

/** A single chapter within a FirestoreSeries. */
export interface FirestoreSeriesChapter {
  id: string;
  chapterNumber: number;
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  isFree?: boolean;
}

/** A series: a playable collection of chapters. */
export interface FirestoreSeries {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  color: string;
  narrator: string;
  chapterCount: number;
  totalDuration: number;
  category: string;
  chapters: FirestoreSeriesChapter[];
}

// ---- Meditation: courses ----

/** A single session within a FirestoreCourse. */
export interface FirestoreCourseSession {
  id: string;
  courseId: string;
  code?: string; // e.g., "CBT101M1P" -> parsed to "Module 1 Practice"
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  order: number;
  dayNumber?: number; // Display ordinal shown in the course detail UI (e.g., "Day 1").
  isFree?: boolean;
}

/** A course: a structured, ordered collection of sessions. */
export interface FirestoreCourse {
  id: string;
  code?: string; // e.g., "CBT101"
  title: string;
  subtitle?: string;
  description: string;
  thumbnailUrl?: string;
  color: string;
  icon?: string;
  duration_minutes?: number;
  totalDuration?: number; // Aggregated session minutes, surfaced in the detail header.
  difficulty?: string;    // Free-form difficulty label (e.g., "Beginner").
  session_count?: number;
  sessionCount: number; // Computed from sessions.length
  instructor: string;
  sessions: FirestoreCourseSession[];
}

// ---- Sleep: sleep meditations ----

/** A standalone sleep meditation track. */
export interface FirestoreSleepMeditation {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  instructor: string;
  icon: string;
  audioPath: string;
  thumbnailUrl?: string;
  color: string;
  isFree?: boolean;
}

// ---- Music: sounds ----

/** A sleep/ambient sound (also used as a background sound in the player). */
export interface FirestoreSleepSound {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
  thumbnailUrl?: string;
  isFree?: boolean;
}

/** A background sound (a leaner shape than FirestoreSleepSound). */
export interface FirestoreBackgroundSound {
  id: string;
  title: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
}

/** A white-noise / music / ASMR item. */
export interface FirestoreMusicItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
  duration_minutes?: number;
  thumbnailUrl?: string;
  isFree?: boolean;
}

// ---- Emergency ----

/** An emergency / SOS meditation. */
export interface FirestoreEmergencyMeditation {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  icon: string;
  color: string;
  audioPath: string;
  narrator?: string;
  thumbnailUrl?: string;
  isFree?: boolean;
}

// ---- Library: narrators ----

/** A narrator/instructor profile. */
export interface FirestoreNarrator {
  id: string;
  name: string;
  bio?: string;
  photoUrl: string;
}

// ---- Library: resolved content projection ----

/**
 * A content item resolved to a uniform shape for cross-type display
 * (favorites, listening history, etc.), regardless of source collection.
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
