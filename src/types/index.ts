/**
 * ============================================================
 * types/index.ts — Shared Type Definitions
 * ============================================================
 *
 * Architectural Role:
 *   This file is the centralized type registry for the entire app.
 *   It defines Firestore document shapes (User, MeditationSession, etc.),
 *   discriminated unions (SessionType, content types), and domain models
 *   that bridge the backend (Firestore) and frontend (React components).
 *
 * Design Patterns:
 *   - Single Source of Truth: All type definitions live here, so if
 *     Firestore schema changes, only this file needs updating.
 *   - Discriminated Unions: SessionType and ReportCategory are string
 *     literals (discriminated unions) that let TypeScript narrow types
 *     based on the discriminator field.
 *   - Denormalization: ListeningHistoryItem and UserFavorite include
 *     denormalized fields (content_title, content_thumbnail) for quick
 *     display without additional queries.
 *
 * Key Concepts:
 *   - User: Authentication identity and profile data
 *   - SessionType: Discriminated union of all playable content types
 *   - MeditationSession: Record of a completed meditation/listening session
 *   - ResolvedContent: Polymorphic content (any SessionType can be favorited)
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
 * Guided meditation content item.
 *
 * Represents a standalone meditation exercise in the /meditations collection.
 * Includes metadata (title, description, duration), media references (audioPath, thumbnailUrl),
 * and tagging for discovery (themes, techniques).
 *
 * Note: themes and techniques are arrays to support multi-tag filtering.
 * For example, a meditation might target both "stress" and "sleep" themes.
 */
export interface GuidedMeditation {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  thumbnailUrl?: string;
  themes: MeditationTheme[];      // Multiple themes allowed for multi-tag discovery
  techniques: MeditationTechnique[]; // Multiple techniques allowed
  difficulty_level: "beginner" | "intermediate" | "advanced";
  instructor?: string;
  isFree?: boolean;
}

/**
 * Meditation theme tags (e.g., "stress", "sleep", "focus").
 *
 * Used to categorize meditations by their primary benefit or use case.
 * Frontend screens filter and display meditations by theme.
 */
export type MeditationTheme = 
  | "focus"
  | "stress"
  | "anxiety"
  | "sleep"
  | "relationships"
  | "self-esteem"
  | "gratitude"
  | "loving-kindness";

export type MeditationTechnique =
  | "breathing"
  | "body-scan"
  | "visualization"
  | "loving-kindness"
  | "mindfulness"
  | "grounding"
  | "progressive-relaxation";

/**
 * Legacy alias for MeditationTheme (backwards compatibility).
 * New code should use MeditationTheme directly.
 */
export type MeditationCategory = MeditationTheme;

/**
 * Meditation program (course/series).
 *
 * A multi-part program with sequential sessions, e.g., "10-Day Stress Relief".
 * Users track their progress via UserProgramProgress.
 * Stored in /programs collection.
 */
export interface MeditationProgram {
  id: string;
  title: string;
  description: string;
  duration_days: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  created_at: string;
  is_active: boolean;
  sessions?: GuidedMeditation[];
}

/**
 * User's progress in a program.
 *
 * Tracks which program the user is enrolled in, which day they're on,
 * and completion status. Stored in /users/{uid}/programProgress/{id}.
 */
export interface UserProgramProgress {
  id: string;
  user_id: string;
  program_id: string;
  current_day: number;
  completed_at?: string;
  started_at: string;
  program?: MeditationProgram; // Denormalized for quick display
}

/**
 * Breathing exercise content.
 *
 * A standalone breathing technique with pattern instructions
 * (inhale duration, hold, exhale, pause). Stored in /breathingExercises.
 */
export interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  pattern: BreathingPattern;
  duration_minutes: number;
  difficulty_level: "beginner" | "intermediate" | "advanced";
  benefits: string[];
}

/**
 * Breathing pattern: the structure of a single breathing cycle.
 *
 * All durations in seconds. For example, Box Breathing (4-4-4-4):
 * { inhale: 4, hold: 4, exhale: 4, pause: 4, cycles: 5 }
 */
export interface BreathingPattern {
  inhale_duration: number;
  hold_duration?: number;
  exhale_duration: number;
  pause_duration?: number;
  cycles: number; // Number of times to repeat the pattern
}

/**
 * Nature sound content: ambient audio for relaxation/sleep.
 *
 * Examples: "Rain on Window", "Ocean Waves", "Forest Ambience".
 * Stored in /natureSounds collection. User can favorite these
 * and trigger listening session tracking.
 */
export interface NatureSound {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  audio_url?: string;
  audio_file?: string; // Key for local audio asset (see audioFiles.ts)
  thumbnail_url?: string;
  category: "rain" | "ocean" | "forest" | "fire" | "wind" | "ambient";
  isFree: boolean;
  created_at: string;
}

/**
 * Bedtime story: narrated content for sleep and wind-down.
 *
 * Examples: "The Shoemaker and the Elves", "Midnight Crossing".
 * Stored in /bedtimeStories. Includes narrator credit and category tags.
 */
export interface BedtimeStory {
  id: string;
  title: string;
  description: string;
  narrator: string;
  duration_minutes: number;
  audio_url?: string;
  audio_file?: string; // Key for local audio asset (see audioFiles.ts)
  thumbnail_url?: string;
  category: "nature" | "fantasy" | "travel" | "fiction" | "thriller" | "fairytale";
  isFree: boolean;
  created_at: string;
}

/**
 * Legacy type alias for backwards compatibility.
 * SleepStory and NatureSound are not equivalent; this is a data migration artifact.
 */
export type SleepStory = NatureSound;

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
  most_used_category?: MeditationCategory;
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
