/**
 * ============================================================
 * types/index.ts — Shared Type Definitions
 * ============================================================
 *
 * Architectural Role:
 *   This file holds only the cross-cutting types that do not belong to any
 *   single feature: the User/auth shapes (User, UserPreferences) and the
 *   content-kind discriminators consumed across the feature AND shared layers
 *   (SessionType, RatingType, ReportCategory). Feature-owned content and record
 *   shapes were relocated to their own features/<x>/types.ts in 6d-4. This is
 *   the staging ground for an eventual shared/types/ module.
 *
 * Design Patterns:
 *   - Discriminated Unions: SessionType, RatingType, and ReportCategory are
 *     string-literal unions that let TypeScript narrow on the discriminator
 *     field. They stay here because shared/ (e.g. the media-player layer)
 *     consumes them, so they cannot move into a feature.
 *
 * Key Concepts:
 *   - User: Authentication identity and profile data
 *   - SessionType: Discriminated union of all playable content types
 *   - RatingType / ReportCategory: rating + report discriminators
 *   - Firestore collections are typically pluralized (users, meditations, etc.)
 * ============================================================
 */

// --- User & Authentication ---

/**
 * User profile data.
 *
 * Represents a Calmdemy user account with authentication identity (id/email)
 * and personalized data (meditation streak, preferences).
 * Stored in Firestore as /users/{uid}.
 */
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  meditation_streak: number;
  total_meditation_minutes: number;
  preferences: UserPreferences;
  created_at: string;
}

/**
 * User preferences: settings and personalization.
 *
 * Nested object within User, this allows granular control of app behavior
 * without adding columns to the User document.
 */
export interface UserPreferences {
  daily_reminder_time?: string;
  preferred_duration?: number;
  theme?: "light" | "dark";
  notification_enabled?: boolean;
  background_sounds?: boolean;
}

// --- Session & Content ---

/**
 * Discriminated union of all playable/trackable content types.
 *
 * This union is used throughout the app to:
 *   - Track listening history per session type
 *   - Categorize favorites by content type
 *   - Route to appropriate player/screen
 *
 * When a ListeningHistoryItem or UserFavorite references a SessionType,
 * the handler can pattern-match to load the correct content document.
 */
export type SessionType =
  | "meditation"
  | "breathing"
  | "nature_sound"
  | "bedtime_story"
  | "course_session"
  | "series_chapter"
  | "album_track"
  | "sleep_meditation"
  | "emergency"
  | "music"
  | "technique";

/**
 * Content rating: user like/dislike feedback.
 *
 * Stored in /users/{uid}/ratings/{id}. Used to improve
 * recommendations and content ranking over time.
 * Discriminated union: ratingType determines semantic meaning.
 */
export type RatingType = "like" | "dislike";

/**
 * Content issue report: user-reported problems.
 *
 * Stored in /reports/{id}. Examples: audio glitches, misclassified content,
 * inappropriate material. Supports backend moderation and QA workflows.
 */
export type ReportCategory = "audio_issue" | "wrong_content" | "inappropriate" | "other";
