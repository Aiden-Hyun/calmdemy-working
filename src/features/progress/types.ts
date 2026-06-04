/**
 * ============================================================
 * features/progress/types.ts — Progress Domain Types
 * ============================================================
 *
 * Type definitions owned by the progress feature: the per-session record
 * (MeditationSession) and the listening-history entry (ListeningHistoryItem).
 * Relocated from the shared src/types/index.ts in 6d-4 so they live next to
 * the api/hooks that read and write them (api/sessions.ts, api/listeningHistory.ts).
 *
 * MeditationSession references SessionType, which remains a shared/core type in
 * src/types (it is the cross-cutting content-kind discriminator), imported here
 * as a type-only dependency (features -> shared is allowed).
 *
 * ListeningHistoryItem is relocated here (not to library, as the early 6c sketch
 * suggested): progress owns the listening-history api + hook, and Home — the only
 * cross-feature consumer — already depends on progress. Putting it in library would
 * force a new progress -> library edge for zero library consumers. Cross-feature
 * consumers must import these through the feature's public index.ts.
 * ============================================================
 */

import type { SessionType } from '../../types';

/**
 * Meditation session record: metadata about a completed meditation.
 *
 * Stored in /users/{uid}/sessions/{sessionId}.
 * This is the core record for tracking user progress, streaks, and mood improvements.
 */
export interface MeditationSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  session_type: SessionType;
  completed_at: string;
  notes?: string;
  mood_before?: number;
  mood_after?: number;
}

/**
 * Listening history entry: record of a play session.
 *
 * Every time a user plays/listens to content, a ListeningHistoryItem is created.
 * Stored in /users/{uid}/listeningHistory/{id}.
 * Includes denormalized fields (title, thumbnail) for fast list rendering
 * without a second query.
 *
 * For course sessions, includes course_code (e.g., "CBT101") and session_code
 * (e.g., "CBT101M1L") for structured course navigation.
 */
export interface ListeningHistoryItem {
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
  content_title: string; // Denormalized for quick display
  content_thumbnail?: string; // Denormalized
  duration_minutes: number;
  played_at: string;
  // For course sessions - to display code badge and module info
  course_code?: string; // e.g., "CBT101"
  session_code?: string; // e.g., "CBT101M1L"
}
