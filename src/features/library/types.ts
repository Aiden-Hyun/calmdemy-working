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
 * ============================================================
 */

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

  // ---- Display labels ----
  /** Singular noun for the parent, e.g. 'Album', 'Series', 'Course'. */
  parentLabel: string;
  /** Plural noun for the children, e.g. 'Tracks', 'Chapters', 'Sessions'. */
  childLabelPlural: string;

  // ---- Routing (URLs are stable; see Phase 5 hard constraints) ----
  /** Detail route for a parent id, e.g. `/album/${id}`. */
  detailRoute: (parentId: string) => string;
  /** Player route for a child id, e.g. `/album/track/${id}`. */
  playerRoute: (childId: string) => string;
}
