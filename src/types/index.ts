/**
 * ============================================================
 * types/index.ts — Shared Type Definitions
 * ============================================================
 *
 * Architectural Role:
 *   This file holds the cross-cutting type definitions that do not belong to
 *   any single feature: the User/auth shapes, the SessionType discriminator,
 *   and the favorite/stats/rating/report records. Feature-owned content shapes
 *   live in their own features/<x>/types.ts (relocated in 6d-4).
 *
 * Design Patterns:
 *   - Single Source of Truth: All type definitions live here, so if
 *     Firestore schema changes, only this file needs updating.
 *   - Discriminated Unions: SessionType and ReportCategory are string
 *     literals (discriminated unions) that let TypeScript narrow types
 *     based on the discriminator field.
 *   - Denormalization: UserFavorite includes denormalized fields
 *     (content_title, content_thumbnail) for quick display without
 *     additional queries.
 *
 * Key Concepts:
 *   - User: Authentication identity and profile data
 *   - SessionType: Discriminated union of all playable content types
 *   - UserFavorite / UserStats: cross-cutting user records
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
 * Content rating: user like/dislike feedback.
 *
 * Stored in /users/{uid}/ratings/{id}. Used to improve
 * recommendations and content ranking over time.
 * Discriminated union: ratingType determines semantic meaning.
 */
export type RatingType = "like" | "dislike";

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
 * Content issue report: user-reported problems.
 *
 * Stored in /reports/{id}. Examples: audio glitches, misclassified content,
 * inappropriate material. Supports backend moderation and QA workflows.
 */
export type ReportCategory = "audio_issue" | "wrong_content" | "inappropriate" | "other";

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
