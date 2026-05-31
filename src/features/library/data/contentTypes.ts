/**
 * ============================================================
 * features/library/data/contentTypes.ts — Collection config registry
 * ============================================================
 *
 * The single source of truth mapping each CollectionContentType to its
 * data-access + display + routing config. The unified library screens
 * look up `COLLECTION_CONFIGS[contentType]` and stay agnostic to which
 * concrete content type they're rendering.
 *
 * Data callbacks point at the existing Firestore accessors. We import
 * them (and their types) through the `firestoreService` barrel rather
 * than reaching into other features' `api/` folders directly: the
 * barrel is the sanctioned indirection during Phase 5 (consumers don't
 * migrate off it until Phase 6), and it keeps this file free of
 * cross-feature imports. getAlbumById / getSeriesById are library's own
 * (features/library/api/content.ts); getCourseById belongs to the
 * meditation feature — the barrel forwards all three uniformly.
 * ============================================================
 */

import {
  getAlbumById,
  getSeriesById,
  getCourseById,
  type FirestoreAlbum,
  type FirestoreAlbumTrack,
  type FirestoreSeries,
  type FirestoreSeriesChapter,
  type FirestoreCourse,
  type FirestoreCourseSession,
} from '../../../services/firestoreService';
import type {
  CollectionConfig,
  CollectionContentType,
} from '../types';

const albumConfig: CollectionConfig<FirestoreAlbum, FirestoreAlbumTrack> = {
  parentContentType: 'album',
  childContentType: 'album_track',
  fetchParentById: getAlbumById,
  getChildren: (album) => album.tracks ?? [],
  getParentTitle: (album) => album.title,
  getParentThumbnailUrl: (album) => album.thumbnailUrl,
  getChildId: (track) => track.id,
  getChildTitle: (track) => track.title,
  getChildAudioPath: (track) => track.audioPath,
  getChildDurationMinutes: (track) => track.duration_minutes,
  parentLabel: 'Album',
  childLabelPlural: 'Tracks',
  detailRoute: (id) => `/album/${id}`,
  playerRoute: (id) => `/album/track/${id}`,
};

const seriesConfig: CollectionConfig<FirestoreSeries, FirestoreSeriesChapter> = {
  parentContentType: 'series',
  childContentType: 'series_chapter',
  fetchParentById: getSeriesById,
  getChildren: (series) => series.chapters ?? [],
  getParentTitle: (series) => series.title,
  getParentThumbnailUrl: (series) => series.thumbnailUrl,
  getChildId: (chapter) => chapter.id,
  getChildTitle: (chapter) => chapter.title,
  getChildAudioPath: (chapter) => chapter.audioPath,
  getChildDurationMinutes: (chapter) => chapter.duration_minutes,
  parentLabel: 'Series',
  childLabelPlural: 'Chapters',
  detailRoute: (id) => `/series/${id}`,
  playerRoute: (id) => `/series/chapter/${id}`,
};

const courseConfig: CollectionConfig<FirestoreCourse, FirestoreCourseSession> = {
  parentContentType: 'course',
  childContentType: 'course_session',
  fetchParentById: getCourseById,
  getChildren: (course) => course.sessions ?? [],
  getParentTitle: (course) => course.title,
  getParentThumbnailUrl: (course) => course.thumbnailUrl,
  getChildId: (session) => session.id,
  getChildTitle: (session) => session.title,
  getChildAudioPath: (session) => session.audioPath,
  getChildDurationMinutes: (session) => session.duration_minutes,
  parentLabel: 'Course',
  childLabelPlural: 'Sessions',
  detailRoute: (id) => `/course/${id}`,
  playerRoute: (id) => `/course/session/${id}`,
};

/**
 * Registry keyed by parent content type. Stored as `CollectionConfig<any, any>`
 * because the unified screens select a config by a runtime discriminator; the
 * concrete generics above guarantee each config is internally type-safe.
 */
export const COLLECTION_CONFIGS: Record<
  CollectionContentType,
  CollectionConfig<any, any>
> = {
  album: albumConfig,
  series: seriesConfig,
  course: courseConfig,
};
