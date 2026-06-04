/**
 * ============================================================
 * features/library/types.ts — Library feature domain types
 * ============================================================
 *
 * The library feature unifies the three content-collection types
 * (album, series, course) behind one parameterized detail screen and
 * one parameterized player screen. The `CollectionConfig` registry
 * captures the per-type differences (which Firestore parent/child
 * shapes to fetch, how to read child fields, display labels, routes)
 * so the screens stay type-agnostic.
 *
 * Design note (Phase 5 decision): course-specific *rendering* quirks
 * (CBT101M1L code badge, day-number lock) are handled inside
 * CollectionDetailScreen behind a `contentType === 'course'` block,
 * NOT abstracted into this config. The config stays lean — it only
 * captures data access, labels, and routing. See the audit doc's
 * "Open decisions" for the rationale.
 *
 * Content-layer records (DailyQuote / UserFavorite / UserStats /
 * ContentRating / ContentReport) were relocated here from the shared
 * src/types/index.ts in 6d-4 — they are the user-content records the
 * library api reads and writes. ContentRating / ContentReport reference
 * the RatingType / ReportCategory discriminators, which stay in src/types
 * (they are also consumed by the shared media-player layer, so they cannot
 * move into a feature); imported here as type-only shared dependencies.
 * ============================================================
 */

import type { RatingType, ReportCategory } from '../../types';

/** Parent collection kinds (the thing a detail screen shows). */
export type CollectionContentType = 'album' | 'series' | 'course';

/** Child item kinds (the thing a player screen plays). */
export type CollectionItemContentType =
  | 'album_track'
  | 'series_chapter'
  | 'course_session';

/**
 * Per-content-type configuration consumed by the unified library
 * screens. `TParent` is the Firestore collection document
 * (FirestoreAlbum / FirestoreSeries / FirestoreCourse); `TChild` is its
 * embedded item (FirestoreAlbumTrack / FirestoreSeriesChapter /
 * FirestoreCourseSession).
 */
export interface CollectionConfig<TParent, TChild> {
  /** Discriminator for the parent collection. */
  parentContentType: CollectionContentType;
  /** Discriminator for the child item (matches ResolvedContent types). */
  childContentType: CollectionItemContentType;

  // ---- Fetching ----
  /** Fetch the parent document (with embedded children) by id. */
  fetchParentById: (id: string) => Promise<TParent | null>;
  /** Read the ordered child list out of a fetched parent. */
  getChildren: (parent: TParent) => TChild[];

  // ---- Parent field accessors (header rendering) ----
  getParentTitle: (parent: TParent) => string;
  getParentThumbnailUrl: (parent: TParent) => string | undefined;

  // ---- Child field accessors ----
  getChildId: (child: TChild) => string;
  getChildTitle: (child: TChild) => string;
  getChildAudioPath: (child: TChild) => string;
  getChildDurationMinutes: (child: TChild) => number;
  /** Whether the child is free (no subscription required). `isFree` on all three. */
  getChildIsFree: (child: TChild) => boolean | undefined;

  // ---- Display labels ----
  /** Singular noun for the parent, e.g. 'Album', 'Series', 'Course'. */
  parentLabel: string;
  /** Plural noun for the children, e.g. 'Tracks', 'Chapters', 'Sessions'. */
  childLabelPlural: string;

  // ---- Routing (URLs are stable; see Phase 5 hard constraints) ----
  /** Detail route for a parent id, e.g. `/album/${id}`. */
  detailRoute: (parentId: string) => string;
  /** Expo Router pathname template for the child player, e.g. '/album/track/[id]'. */
  playerPathname: string;
  /**
   * Build the param object the player route expects when navigating from the
   * detail list. Type-specific: album/series/course carry different metadata
   * keys (artist vs narrator vs instructor, tracksJson vs chaptersJson vs
   * sessionsJson, course codes/color). Phase 6 may simplify these once the
   * player screens are unified.
   */
  buildPlayerParams: (
    parent: TParent,
    child: TChild,
    index: number
  ) => Record<string, string>;
}

// ============================================================
// Content-layer records (relocated from src/types/index.ts in 6d-4)
// ============================================================

/**
 * Daily inspirational quote.
 *
 * Shown on the home screen. Stored in /dailyQuotes.
 * The "date" field determines which quote displays on which day.
 */
export interface DailyQuote {
  id: string;
  text: string;
  author: string;
  date: string;
}

/**
 * User favorite: marks a content item as favorited.
 *
 * Polymorphic: a single favorite can reference any SessionType.
 * Stored in /users/{uid}/favorites/{id}.
 * The UI queries this to show heart/bookmark status on content items.
 */
export interface UserFavorite {
  id: string;
  user_id: string;
  content_id: string;
  content_type:
    | "meditation"
    | "nature_sound"
    | "bedtime_story"
    | "breathing_exercise"
    | "series_chapter"
    | "album_track"
    | "emergency"
    | "course_session";
  favorited_at: string;
}

/**
 * User statistics: aggregated meditation metrics.
 *
 * Stored in /users/{uid}/stats. Computed from listening history
 * or updated by backend Cloud Functions. Includes streaks,
 * weekly/monthly/yearly breakdowns, and mood trending.
 */
export interface UserStats {
  total_sessions: number;
  total_minutes: number;
  current_streak: number;
  longest_streak: number;
  favorite_time_of_day?: string;
  most_used_category?: string; // was MeditationCategory; widened in 6d-4 when that type moved to features/meditation (avoids a shared->feature import)
  weekly_minutes: number[];
  monthly_minutes: number[];
  yearly_minutes: number[];
  mood_improvement: number;
}

/**
 * Detailed content rating entry.
 *
 * Polymorphic: can rate any content type.
 * Enables feedback loops for content quality and personalization.
 */
export interface ContentRating {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  rating: RatingType;
  rated_at: string;
}

/**
 * Content report entry.
 *
 * Polymorphic: user can report any content type with a reason category.
 * Admins/mods query this collection to triage and action complaints.
 */
export interface ContentReport {
  id: string;
  user_id: string;
  content_id: string;
  content_type: string;
  category: ReportCategory;
  reported_at: string;
}
