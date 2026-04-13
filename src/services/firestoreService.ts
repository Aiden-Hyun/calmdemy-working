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
import { db } from "../firebase";
import {
  GuidedMeditation,
  MeditationSession,
  MeditationProgram,
  BreathingExercise,
  NatureSound,
  BedtimeStory,
  DailyQuote,
  UserFavorite,
  ListeningHistoryItem,
  RatingType,
  ReportCategory,
} from "../types";

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
const meditationsCollection = collection(db, "guided_meditations");
const sessionsCollection = collection(db, "meditation_sessions");
const programsCollection = collection(db, "meditation_programs");
const breathingCollection = collection(db, "breathing_exercises");
const bedtimeStoriesCollection = collection(db, "bedtime_stories");
const quotesCollection = collection(db, "daily_quotes");
const favoritesCollection = collection(db, "user_favorites");
const listeningHistoryCollection = collection(db, "listening_history");
const usersCollection = collection(db, "users");
const contentRatingsCollection = collection(db, "content_ratings");
const contentReportsCollection = collection(db, "content_reports");

// ============================================================
// MEDITATIONS SECTION
// Retrieval of guided meditation metadata (full collection scans and filtered queries).
// ============================================================

/**
 * Retrieve all guided meditations from the collection.
 *
 * This performs an unconditional full-collection scan. Suitable for client-side
 * filtering, caching, or building indices. The Graceful Degradation pattern
 * applies: if the query fails, we return an empty array so the UI doesn't crash.
 *
 * @returns Array of meditations with all fields and isFree flag set to true
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditations(): Promise<GuidedMeditation[]> {
  try {
    const snapshot = await getDocs(meditationsCollection);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations:", error);
    return [];
  }
}

/**
 * Retrieve meditations by theme using Firestore's array-contains operator.
 *
 * Firestore schema: each meditation has a "themes" array field (e.g., ["stress", "sleep"]).
 * This uses array-contains to match meditations where themes includes the given theme.
 * Note: requires a composite index if combined with other filters, but a single
 * array-contains clause uses the built-in array index (automatic, no configuration needed).
 *
 * @param theme - A single theme string to match (e.g., "stress", "sleep", "morning")
 * @returns Array of meditations tagged with the given theme
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditationsByTheme(
  theme: string
): Promise<GuidedMeditation[]> {
  try {
    const q = query(
      meditationsCollection,
      where("themes", "array-contains", theme)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations by theme:", error);
    return [];
  }
}

/**
 * Retrieve meditations by technique using Firestore's array-contains operator.
 *
 * Analogous to getMeditationsByTheme(), but filters on the "techniques" array field
 * (e.g., ["body-scan", "breathing"]) instead of themes. Allows users to find content
 * by practice method rather than by topic/mood.
 *
 * @param technique - A single technique string to match (e.g., "body-scan", "breathing")
 * @returns Array of meditations tagged with the given technique
 *         Empty array on error (Graceful Degradation)
 */
export async function getMeditationsByTechnique(
  technique: string
): Promise<GuidedMeditation[]> {
  try {
    const q = query(
      meditationsCollection,
      where("techniques", "array-contains", technique)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as GuidedMeditation)
    );
  } catch (error) {
    console.error("Error fetching meditations by technique:", error);
    return [];
  }
}

/**
 * Retrieve a single meditation by document ID.
 *
 * Direct document access is the fastest Firestore operation (no index required).
 * Returns null if the document doesn't exist (Graceful Degradation).
 *
 * @param id - The Firestore document ID of the meditation
 * @returns The meditation object, or null if not found or on error
 */
export async function getMeditationById(
  id: string
): Promise<GuidedMeditation | null> {
  try {
    const docRef = doc(meditationsCollection, id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as GuidedMeditation;
  } catch (error) {
    console.error("Error fetching meditation by id:", error);
    return null;
  }
}

// ============================================================
// MEDITATION SESSIONS SECTION
// Recording and retrieval of user meditation completion events.
// ============================================================

/**
 * Create a new meditation session (completion record).
 *
 * Records that the user finished a meditation at a given duration. The server
 * timestamp is applied here (serverTimestamp()) to avoid client-clock skew.
 * Also triggers updateUserStats() to recalculate the user's meditation streak
 * and total minutes — a side effect that keeps derived stats fresh.
 *
 * @param session - Meditation metadata (user_id, meditation_id, duration_minutes, etc.)
 *                 id and completed_at are auto-generated
 * @returns The Firestore document ID of the newly created session
 */
export async function createSession(
  session: Omit<MeditationSession, "id" | "completed_at">
): Promise<string> {
  const docRef = await addDoc(sessionsCollection, {
    ...session,
    completed_at: serverTimestamp(), // Server-side timestamp to avoid clock skew
  });

  // Update user stats: recalculate streak, total minutes, longest streak.
  // This is a side effect — in larger systems, we might queue this as a Cloud Function
  // to decouple session recording from stats computation.
  await updateUserStats(session.user_id);

  return docRef.id;
}

/**
 * Retrieve meditation sessions for a user, ordered by most recent first.
 *
 * This implements a Read-Before-Write pattern indirectly: we fetch all sessions
 * to compute stats, and the Timestamp conversion is critical because Firestore
 * returns Timestamp objects, not strings. The fallback `new Date().toISOString()`
 * handles edge cases where the field is missing or corrupt.
 *
 * @param userId - The authenticated user's UID (partition key)
 * @param maxLimit - Maximum number of sessions to return (default: 30)
 * @returns Array of sessions sorted by completed_at descending
 *         Empty array on error (Graceful Degradation)
 */
export async function getUserSessions(
  userId: string,
  maxLimit = 30
): Promise<MeditationSession[]> {
  try {
    const q = query(
      sessionsCollection,
      where("user_id", "==", userId),
      orderBy("completed_at", "desc"),
      limit(maxLimit)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestamp Conversion: Firestore returns Timestamp objects, not strings.
        // instanceof check is critical because a field might be missing, corrupt, or
        // already a string (in edge cases). The fallback ensures the type contract
        // is always satisfied.
        completed_at:
          data.completed_at instanceof Timestamp
            ? data.completed_at.toDate().toISOString()
            : new Date().toISOString(),
      } as MeditationSession;
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return [];
  }
}

// ============================================================
// USER STATS SECTION
// Streak calculation, total minutes aggregation, and user-level metrics.
// Implements the Read-Before-Write pattern: we read all sessions first,
// compute stats client-side, then update the user document with results.
// ============================================================

/**
 * Update user statistics (internal helper, called after createSession).
 *
 * This function demonstrates the Read-Before-Write pattern:
 * 1. Read all sessions for the user (client-side aggregation)
 * 2. Calculate total meditation minutes and streak
 * 3. Compare against existing longest_streak (defensive: avoid losing data if
 *    a concurrent request computed a higher streak)
 * 4. Write back the new stats with merge: true (atomic upsert)
 *
 * Performance note: calling this for every session write is expensive (reads all
 * sessions). In production, defer this to a Cloud Function triggered on session
 * writes, or use a scheduled job to batch-update stats nightly.
 *
 * @param userId - The authenticated user's UID
 */
async function updateUserStats(userId: string) {
  try {
    // Phase 1: Aggregate sessions into metrics
    const sessions = await getUserSessions(userId, 1000);

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.duration_minutes,
      0
    );

    const streak = calculateStreak(sessions);

    // Phase 2: Read-Before-Write — check existing longest streak
    // (defensive: if another write computed a higher streak, don't overwrite it)
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    const currentLongest = userData.longest_streak || 0;

    // Phase 3: Take the maximum of current and previous longest streak
    const newLongestStreak = Math.max(streak, currentLongest);

    // Phase 4: Write back with merge: true (upsert, don't clobber other fields)
    await setDoc(
      userRef,
      {
        total_meditation_minutes: totalMinutes,
        meditation_streak: streak,
        longest_streak: newLongestStreak,
        updated_at: serverTimestamp(),
      },
      { merge: true } // Upsert: create doc if missing, merge fields if exists
    );
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
}

/**
 * Calculate meditation streak (number of consecutive days with at least one session).
 *
 * This is complex temporal logic worthy of a separate function:
 * - If no sessions, return 0
 * - If the last session was more than 1 day ago, return 0 (streak is broken)
 * - Otherwise, iterate backward through sessions, counting consecutive days
 *
 * Algorithm:
 *   1. Normalize all dates to midnight (zero out hours/minutes/seconds)
 *      to compare day-to-day boundaries accurately
 *   2. Check if the most recent session is within the last 1 day (streak is active)
 *   3. Walk backward through sessions, incrementing streak count as long as
 *      each pair is exactly 1 day apart
 *   4. Break on gaps > 1 day or end of list
 *
 * @param sessions - Sessions ordered by completed_at descending (most recent first)
 * @returns Number of consecutive days (0 if streak is broken)
 */
function calculateStreak(sessions: MeditationSession[]): number {
  if (sessions.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight

  const lastSession = new Date(sessions[0].completed_at);
  lastSession.setHours(0, 0, 0, 0); // Normalize to midnight

  // Check if the most recent session is within the last 1 day
  // (dayDiff=0 means today, dayDiff=1 means yesterday, etc.)
  const dayDiff = Math.floor(
    (today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Streak is broken if the last session is more than 1 day old
  if (dayDiff > 1) return 0;

  // Iterate backward through sessions, counting consecutive daily sessions
  for (let i = 1; i < sessions.length; i++) {
    const currentDate = new Date(sessions[i - 1].completed_at);
    const previousDate = new Date(sessions[i].completed_at);

    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);

    const diff = Math.floor(
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 1) {
      // Consecutive day: increment streak
      streak++;
    } else if (diff > 1) {
      // Gap detected: streak is broken
      break;
    }
    // If diff === 0, sessions are on the same day; don't increment (duplicate day)
  }

  return streak;
}

/**
 * Retrieve comprehensive statistics for a user (aggregated from all sessions).
 *
 * This function computes weekly, monthly, and yearly meditation minute breakdowns
 * from the user's full session history. The bucketing logic is subtle: we calculate
 * days-ago for each session and map into day-of-week, day-of-month, and month-of-year
 * indices. This allows a chart to display "hours on Monday last week", "hours on the 15th",
 * "hours in March", etc.
 *
 * @param userId - The authenticated user's UID
 * @returns User statistics object with aggregations (weeklyMinutes, monthlyMinutes, etc.)
 */
export async function getUserStats(userId: string) {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const sessions = await getUserSessions(userId, 1000);

    const userData = userDoc.exists() ? userDoc.data() : {};

    // Calculate weekly minutes - map to Mon(0) through Sun(6)
    const weeklyMinutes = Array(7).fill(0);
    // Calculate monthly minutes - last 30 days (index 0 = 29 days ago, index 29 = today)
    const monthlyMinutes = Array(30).fill(0);
    // Calculate yearly minutes - last 12 months (index 0 = 11 months ago, index 11 = current month)
    const yearlyMinutes = Array(12).fill(0);
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    sessions.forEach((session) => {
      const sessionDate = new Date(session.completed_at);
      const daysDiff = Math.floor(
        (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Weekly: last 7 days mapped to Mon-Sun
      if (daysDiff >= 0 && daysDiff < 7) {
        // Get day of week for session (0 = Sunday, 6 = Saturday)
        // Convert to Mon-Sun format: Mon=0, Tue=1, ..., Sun=6
        const dayOfWeek = sessionDate.getDay();
        const mondayBasedIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weeklyMinutes[mondayBasedIndex] += session.duration_minutes;
      }
      
      // Monthly: last 30 days (index 29 = today, index 0 = 29 days ago)
      if (daysDiff >= 0 && daysDiff < 30) {
        const monthlyIndex = 29 - daysDiff;
        monthlyMinutes[monthlyIndex] += session.duration_minutes;
      }
      
      // Yearly: last 12 months (index 11 = current month, index 0 = 11 months ago)
      const sessionMonth = sessionDate.getMonth();
      const sessionYear = sessionDate.getFullYear();
      const monthsDiff = (currentYear - sessionYear) * 12 + (currentMonth - sessionMonth);
      if (monthsDiff >= 0 && monthsDiff < 12) {
        const yearlyIndex = 11 - monthsDiff;
        yearlyMinutes[yearlyIndex] += session.duration_minutes;
      }
    });

    // Calculate favorite time of day
    const timeOfDayCounts: Record<string, number> = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0,
      Night: 0,
    };

    sessions.forEach((session) => {
      const hour = new Date(session.completed_at).getHours();
      if (hour >= 5 && hour < 12) {
        timeOfDayCounts.Morning++;
      } else if (hour >= 12 && hour < 17) {
        timeOfDayCounts.Afternoon++;
      } else if (hour >= 17 && hour < 21) {
        timeOfDayCounts.Evening++;
      } else {
        timeOfDayCounts.Night++;
      }
    });

    let favoriteTimeOfDay: string | undefined;
    let maxCount = 0;
    for (const [time, count] of Object.entries(timeOfDayCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favoriteTimeOfDay = time;
      }
    }

    return {
      total_sessions: sessions.length,
      total_minutes: userData.total_meditation_minutes || 0,
      current_streak: userData.meditation_streak || 0,
      longest_streak:
        userData.longest_streak || userData.meditation_streak || 0,
      weekly_minutes: weeklyMinutes,
      monthly_minutes: monthlyMinutes,
      yearly_minutes: yearlyMinutes,
      favorite_time_of_day: sessions.length > 0 ? favoriteTimeOfDay : undefined,
      mood_improvement: 0,
    };
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return {
      total_sessions: 0,
      total_minutes: 0,
      current_streak: 0,
      longest_streak: 0,
      weekly_minutes: Array(7).fill(0),
      monthly_minutes: Array(30).fill(0),
      yearly_minutes: Array(12).fill(0),
      mood_improvement: 0,
    };
  }
}

// ============================================================
// PROGRAMS SECTION
// Retrieval of meditation programs/courses (collections of related sessions).
// ============================================================

/**
 * Retrieve all meditation programs.
 *
 * Programs are structured learning paths (e.g., "8-Week Stress Relief", "CBT Fundamentals").
 * This is a full-collection read. Pair with React Query caching for performance.
 *
 * @returns Array of programs from Firestore
 *         Empty array on error (Graceful Degradation)
 */
export async function getPrograms(): Promise<MeditationProgram[]> {
  try {
    const q = query(
      programsCollection,
      where("is_active", "==", true),
      orderBy("created_at", "desc")
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as MeditationProgram)
    );
  } catch (error) {
    console.error("Error fetching programs:", error);
    return [];
  }
}

// ============================================================
// BREATHING EXERCISES SECTION
// ============================================================

/**
 * Retrieve all breathing exercises.
 *
 * Simple collection read — exercises are standalone, not part of programs.
 *
 * @returns Array of breathing exercises
 *         Empty array on error (Graceful Degradation)
 */
export async function getBreathingExercises(): Promise<BreathingExercise[]> {
  try {
    const snapshot = await getDocs(breathingCollection);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        pattern: {
          inhale_duration: data.inhale_duration,
          hold_duration: data.hold_duration,
          exhale_duration: data.exhale_duration,
          pause_duration: data.pause_duration,
          cycles: data.cycles,
        },
        duration_minutes: Math.ceil(
          ((data.inhale_duration +
            (data.hold_duration || 0) +
            data.exhale_duration +
            (data.pause_duration || 0)) *
            data.cycles) /
            60
        ),
        difficulty_level: data.difficulty_level,
        benefits: data.benefits || [],
      } as BreathingExercise;
    });
  } catch (error) {
    console.error("Error fetching breathing exercises:", error);
    return [];
  }
}

// ============================================================
// BEDTIME STORIES SECTION
// ============================================================

/**
 * Retrieve all bedtime stories.
 *
 * Stories are simple documents with title, narrator, duration, and audio URL.
 *
 * @returns Array of bedtime stories
 *         Empty array on error (Graceful Degradation)
 */
export async function getBedtimeStories(): Promise<BedtimeStory[]> {
  try {
    const q = query(bedtimeStoriesCollection, orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          isFree: true,
        } as BedtimeStory)
    );
  } catch (error) {
    console.error("Error fetching bedtime stories:", error);
    return [];
  }
}

/**
 * Retrieve a single bedtime story by ID.
 *
 * Direct document lookup, returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The story object, or null if not found
 */
export async function getBedtimeStoryById(
  id: string
): Promise<BedtimeStory | null> {
  try {
    const docRef = doc(db, "bedtime_stories", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as BedtimeStory;
  } catch (error) {
    console.error("Error fetching bedtime story:", error);
    return null;
  }
}

// Legacy aliases for backward compatibility
export const getSleepStories = getBedtimeStories;
export const getSleepStoryById = getBedtimeStoryById;

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
      // Get a random quote if no quote for today
      const allQuotesSnapshot = await getDocs(quotesCollection);
      if (allQuotesSnapshot.empty) return null;

      const randomIndex = Math.floor(
        Math.random() * allQuotesSnapshot.docs.length
      );
      const doc = allQuotesSnapshot.docs[randomIndex];
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
// SLEEP MEDITATIONS SECTION
// Specialized meditation content optimized for sleep induction.
// ============================================================

/**
 * Sleep meditation data model.
 */
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

/**
 * Retrieve all sleep meditations.
 *
 * Sleep meditations are specialized content designed to help users fall asleep.
 * This is a full-collection read; typically cached via React Query for performance.
 *
 * @returns Array of sleep meditations with all fields
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepMeditations(): Promise<
  FirestoreSleepMeditation[]
> {
  try {
    const snapshot = await getDocs(collection(db, "sleep_meditations"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepMeditation)
    );
  } catch (error) {
    console.error("Error fetching sleep meditations:", error);
    return [];
  }
}

/**
 * Retrieve a single sleep meditation by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns Sleep meditation object, or null if not found
 */
export async function getSleepMeditationById(
  id: string
): Promise<FirestoreSleepMeditation | null> {
  try {
    const docRef = doc(db, "sleep_meditations", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as FirestoreSleepMeditation;
  } catch (error) {
    console.error("Error fetching sleep meditation:", error);
    return null;
  }
}

// ============================================================
// EMERGENCY MEDITATIONS SECTION
// Crisis-focused content for immediate anxiety/stress relief (e.g., panic attacks).
// ============================================================

/**
 * Emergency meditation data model.
 * Optimized for quick access during high-stress moments.
 */
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

/**
 * Retrieve all emergency meditations.
 *
 * Emergency meditations are short, high-impact content for immediate anxiety relief.
 * Typically 1-5 minutes, these are designed for moments of acute stress or panic.
 *
 * @returns Array of emergency meditations
 *         Empty array on error (Graceful Degradation)
 */
export async function getEmergencyMeditations(): Promise<
  FirestoreEmergencyMeditation[]
> {
  try {
    const snapshot = await getDocs(collection(db, "emergency_meditations"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreEmergencyMeditation)
    );
  } catch (error) {
    console.error("Error fetching emergency meditations:", error);
    return [];
  }
}

/**
 * Retrieve a single emergency meditation by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns Emergency meditation object, or null if not found
 */
export async function getEmergencyMeditationById(
  id: string
): Promise<FirestoreEmergencyMeditation | null> {
  try {
    const docRef = doc(db, "emergency_meditations", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return {
      id: docSnap.id,
      ...docSnap.data(),
      isFree: true,
    } as FirestoreEmergencyMeditation;
  } catch (error) {
    console.error("Error fetching emergency meditation:", error);
    return null;
  }
}

// ============================================================
// COURSES SECTION
// Structured learning paths with hierarchical modules and lessons (e.g., "CBT Fundamentals").
// ============================================================

export interface FirestoreCourseSession {
  id: string;
  courseId: string;
  code?: string; // e.g., "CBT101M1P" -> parsed to "Module 1 Practice"
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  order: number;
  isFree?: boolean;
}

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
  session_count?: number;
  sessionCount: number; // Computed from sessions.length
  instructor: string;
  sessions: FirestoreCourseSession[];
}

// Helper to fetch sessions for a course
async function getCourseSessionsByCourseId(
  courseId: string
): Promise<FirestoreCourseSession[]> {
  try {
    const q = query(
      collection(db, "course_sessions"),
      where("courseId", "==", courseId)
    );
    const snapshot = await getDocs(q);
    const sessions = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: false } as FirestoreCourseSession)
    );
    // Sort by order
    return sessions.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error("Error fetching course sessions:", error);
    return [];
  }
}

/**
 * Retrieve all courses (structured learning programs).
 *
 * Returns course metadata without full session lists (for performance).
 * Sessions are loaded on-demand in getCourseById(). The sessionCount field
 * is denormalized in the course document to avoid a separate query.
 *
 * @returns Array of all courses with metadata, sessions empty
 *         Empty array on error (Graceful Degradation)
 */
export async function getCourses(): Promise<FirestoreCourse[]> {
  try {
    const snapshot = await getDocs(collection(db, "courses"));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        sessions: [], // Sessions loaded on-demand in getCourseById()
        sessionCount: data.session_count || data.sessionCount || 0,
      } as FirestoreCourse;
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return [];
  }
}

/**
 * Retrieve a single course with all its sessions (eager-loading).
 *
 * This is a two-step operation:
 *   1. Fetch the course document metadata
 *   2. Fetch all course_sessions matching the course ID (via getCourseSessionsByCourseId)
 *
 * Hierarchical structure: courses contain sessions, and sessions are ordered.
 *
 * @param id - Firestore document ID of the course
 * @returns The course object with fully populated sessions array, or null if not found
 */
export async function getCourseById(
  id: string
): Promise<FirestoreCourse | null> {
  try {
    const docRef = doc(db, "courses", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;

    const course = {
      id: docSnap.id,
      ...docSnap.data(),
      sessions: [],
      sessionCount: 0,
    } as FirestoreCourse;
    // Phase 2: Fetch and attach all sessions for this course
    course.sessions = await getCourseSessionsByCourseId(id);
    course.sessionCount = course.sessions.length;

    return course;
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
}

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
// SERIES SECTION
// Episodic content (multi-chapter guided meditations, courses, narrated stories).
// Hierarchical structure: series → chapters, with denormalized metadata.
// ============================================================

export interface FirestoreSeriesChapter {
  id: string;
  chapterNumber: number;
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  isFree?: boolean;
}

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

/**
 * Retrieve all series (episodic content collections).
 *
 * Also populates _seriesCache (Cache-Aside pattern) for fast subsequent lookups.
 * Series documents contain denormalized chapter metadata (id, title, duration) to
 * avoid N+1 lookups when rendering series lists.
 *
 * @returns Array of all series with embedded chapters
 *         Empty array on error (Graceful Degradation)
 */
export async function getSeries(): Promise<FirestoreSeries[]> {
  try {
    const snapshot = await getDocs(collection(db, "series"));
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Denormalization: chapters are stored inside the series document
      const chapters = (data.chapters || []).map((ch: FirestoreSeriesChapter) => ({ ...ch, isFree: true }));
      return { id: doc.id, ...data, chapters } as FirestoreSeries;
    });
    // Update cache for subsequent calls (Cache-Aside)
    _seriesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
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

// ============================================================
// ALBUMS SECTION
// Music/sound collections (multi-track albums of ambient sounds, music, or ASMR).
// Hierarchical structure: album → tracks, with denormalized metadata.
// ============================================================

export interface FirestoreAlbumTrack {
  id: string;
  trackNumber: number;
  title: string;
  duration_minutes: number;
  audioPath: string;
  isFree?: boolean;
}

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

/**
 * Retrieve all albums (music/sound collections).
 *
 * Also populates _albumsCache (Cache-Aside pattern) for fast subsequent lookups.
 * Albums contain denormalized track metadata to avoid N+1 lookups when rendering.
 *
 * @returns Array of all albums with embedded tracks
 *         Empty array on error (Graceful Degradation)
 */
export async function getAlbums(): Promise<FirestoreAlbum[]> {
  try {
    const snapshot = await getDocs(collection(db, "albums"));
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Denormalization: tracks are stored inside the album document
      const tracks = (data.tracks || []).map((t: FirestoreAlbumTrack) => ({ ...t, isFree: true }));
      return { id: doc.id, ...data, tracks } as FirestoreAlbum;
    });
    // Update cache for subsequent calls (Cache-Aside)
    _albumsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching albums:", error);
    return [];
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

// ============================================================
// SLEEP SOUNDS SECTION
// Ambient nature sounds and sleep soundscapes (water, rain, forest, etc.).
// ============================================================

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

/**
 * Retrieve all sleep sounds.
 *
 * Simple full-collection read. Typically paired with React Query for caching.
 *
 * @returns Array of all sleep sounds
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepSounds(): Promise<FirestoreSleepSound[]> {
  try {
    const snapshot = await getDocs(collection(db, "sleep_sounds"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepSound)
    );
  } catch (error) {
    console.error("Error fetching sleep sounds:", error);
    return [];
  }
}

/**
 * Retrieve sleep sounds filtered by category.
 *
 * Special case: category === "all" bypasses the filter and returns all sounds.
 *
 * @param category - Category to filter by (e.g., "nature", "urban"), or "all"
 * @returns Array of sleep sounds matching the category
 *         Empty array on error (Graceful Degradation)
 */
export async function getSleepSoundsByCategory(
  category: string
): Promise<FirestoreSleepSound[]> {
  try {
    if (category === "all") return getSleepSounds();
    const q = query(
      collection(db, "sleep_sounds"),
      where("category", "==", category)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreSleepSound)
    );
  } catch (error) {
    console.error("Error fetching sleep sounds by category:", error);
    return [];
  }
}

/**
 * Retrieve a single sleep sound by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The sleep sound object, or null if not found
 */
export async function getSleepSoundById(
  id: string
): Promise<FirestoreSleepSound | null> {
  try {
    const docRef = doc(db, "sleep_sounds", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data(), isFree: true } as FirestoreSleepSound;
  } catch (error) {
    console.error("Error fetching sleep sound by id:", error);
    return null;
  }
}

// ============================================================
// BACKGROUND SOUNDS SECTION
// Ambient sounds for work/focus (ambient noise, coffee shop, etc.).
// ============================================================

export interface FirestoreBackgroundSound {
  id: string;
  title: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
}

/**
 * Retrieve all background sounds.
 *
 * Simple full-collection read for ambient focus/work sounds.
 *
 * @returns Array of all background sounds
 *         Empty array on error (Graceful Degradation)
 */
export async function getBackgroundSounds(): Promise<
  FirestoreBackgroundSound[]
> {
  try {
    const snapshot = await getDocs(collection(db, "background_sounds"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreBackgroundSound)
    );
  } catch (error) {
    console.error("Error fetching background sounds:", error);
    return [];
  }
}

/**
 * Retrieve background sounds filtered by category.
 *
 * @param category - Category to filter by (e.g., "coffee-shop", "ambient")
 * @returns Array of background sounds matching the category
 *         Empty array on error (Graceful Degradation)
 */
export async function getBackgroundSoundsByCategory(
  category: string
): Promise<FirestoreBackgroundSound[]> {
  try {
    const q = query(
      collection(db, "background_sounds"),
      where("category", "==", category)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as FirestoreBackgroundSound)
    );
  } catch (error) {
    console.error("Error fetching background sounds by category:", error);
    return [];
  }
}

/**
 * Retrieve a single background sound by ID.
 *
 * Direct document access; returns null if not found.
 *
 * @param id - Firestore document ID
 * @returns The background sound object, or null if not found
 */
export async function getBackgroundSoundById(
  id: string
): Promise<FirestoreBackgroundSound | null> {
  try {
    const docRef = doc(db, "background_sounds", id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as FirestoreBackgroundSound;
  } catch (error) {
    console.error("Error fetching background sound:", error);
    return null;
  }
}

// ============================================================
// WHITE NOISE / MUSIC / ASMR SECTION
// Ambient audio collections (background sounds for relaxation, sleep, focus).
// ============================================================

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

/**
 * Retrieve all white noise tracks.
 *
 * White noise (e.g., static, fan hum) is used for masking environmental noise
 * and aiding sleep/focus.
 *
 * @returns Array of all white noise items
 *         Empty array on error (Graceful Degradation)
 */
export async function getWhiteNoise(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "white_noise"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching white noise:", error);
    return [];
  }
}

/**
 * Retrieve all music tracks.
 *
 * Music for relaxation, meditation, or background listening.
 *
 * @returns Array of all music items
 *         Empty array on error (Graceful Degradation)
 */
export async function getMusic(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "music"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching music:", error);
    return [];
  }
}

/**
 * Retrieve all ASMR tracks.
 *
 * ASMR (Autonomous Sensory Meridian Response) content: whispering, tapping, etc.
 * Popular for relaxation and sleep.
 *
 * @returns Array of all ASMR items
 *         Empty array on error (Graceful Degradation)
 */
export async function getAsmr(): Promise<FirestoreMusicItem[]> {
  try {
    const snapshot = await getDocs(collection(db, "asmr"));
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data(), isFree: true } as FirestoreMusicItem)
    );
  } catch (error) {
    console.error("Error fetching asmr:", error);
    return [];
  }
}

// ============================================================
// LISTENING HISTORY SECTION
// Audit trail of user content consumption (used for analytics and personalization).
// ============================================================

/**
 * Record a content playback event in the listening history.
 *
 * This function creates an audit trail of what the user has listened to.
 * The history is used for:
 *   - Personalization (recommending similar content)
 *   - Analytics (tracking popular content)
 *   - Progress tracking (showing recently-played items)
 *   - Learning analytics (documenting course engagement)
 *
 * Denormalization: we store content metadata (title, thumbnail, duration) in the
 * history record itself. This allows rendering the history without re-fetching
 * content details, and persists the title even if the original is updated/deleted.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - The Firestore document ID of the played content
 * @param contentType - Discriminated union tag for the content type
 * @param contentTitle - Denormalized title (stored in case source is deleted)
 * @param durationMinutes - Length of the content (for time-spent analytics)
 * @param contentThumbnail - Denormalized thumbnail URL
 * @param courseCode - If this is a course_session, the parent course code (e.g., "CBT101")
 * @param sessionCode - If this is a course_session, this session's code (e.g., "CBT101M1L1")
 * @returns The ID of the newly created history record
 */
export async function addToListeningHistory(
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
  contentTitle: string,
  durationMinutes: number,
  contentThumbnail?: string,
  courseCode?: string,
  sessionCode?: string
): Promise<string> {
  try {
    const docData: Record<string, any> = {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      content_title: contentTitle,
      content_thumbnail: contentThumbnail || null,
      duration_minutes: durationMinutes,
      played_at: serverTimestamp(),
    };
    
    // Add course codes for course_session content type
    if (courseCode) {
      docData.course_code = courseCode;
    }
    if (sessionCode) {
      docData.session_code = sessionCode;
    }
    
    const docRef = await addDoc(listeningHistoryCollection, docData);
    return docRef.id;
  } catch (error: any) {
    console.error("Error adding to listening history:", error);
    return "";
  }
}

/**
 * Retrieve the user's listening history (recently played content).
 *
 * This demonstrates the Deduplication pattern: even if a user plays the same
 * content multiple times, we only return the most recent play per content ID.
 * This makes the UI less cluttered and highlights what the user is currently engaged with.
 *
 * Client-side processing: we fetch all history records and sort/deduplicate locally
 * to avoid a composite Firestore index. For large histories (1000+ items), consider
 * pagination or delegating to a Cloud Function.
 *
 * @param userId - The authenticated user's UID
 * @param maxLimit - Maximum number of unique items to return (default: 10)
 * @returns Array of recently-played content (deduped, sorted by most recent first)
 *         Empty array on error (Graceful Degradation)
 */
export async function getListeningHistory(
  userId: string,
  maxLimit = 10
): Promise<ListeningHistoryItem[]> {
  try {
    // Phase 1: Fetch all history for this user (unordered, to avoid index requirement)
    const q = query(listeningHistoryCollection, where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    // Phase 2: Transform Timestamp objects to ISO strings
    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Timestamp Conversion: Same pattern as sessions and favorites
        played_at:
          data.played_at instanceof Timestamp
            ? data.played_at.toDate().toISOString()
            : new Date().toISOString(),
      } as ListeningHistoryItem;
    });

    // Phase 3: Sort by played_at descending (most recent first)
    const sorted = items.sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );

    // Phase 4: Deduplication pattern — keep only the most recent play per content
    // (Shows what the user is currently listening to, not a raw audit trail)
    const seen = new Set<string>();
    const deduplicated = sorted.filter((item) => {
      if (seen.has(item.content_id)) return false; // Already seen this content
      seen.add(item.content_id);
      return true;
    });

    // Phase 5: Return the top N items
    return deduplicated.slice(0, maxLimit);
  } catch (error: any) {
    console.error("Error fetching listening history:", error);
    return [];
  }
}

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

// ==================== PLAYBACK PROGRESS ====================

export interface PlaybackProgress {
  user_id: string;
  content_id: string;
  content_type: string;
  position_seconds: number;
  duration_seconds: number;
  updated_at: Timestamp;
}

const playbackProgressCollection = collection(db, "playback_progress");

// ============================================================
// PLAYBACK PROGRESS SECTION
// Resume points for long-form content (allows users to pick up where they left off).
// ============================================================

/**
 * Save or update the playback position for a content item.
 *
 * This enables the "resume where you left off" feature. To avoid cluttering Firestore
 * with trivial updates, we use filtering heuristics:
 *   - Skip if position < 5 seconds (user just started)
 *   - Skip if position >= 95% of duration (nearly complete; mark as "completed" instead)
 *
 * Document ID is deterministic: `${userId}_${contentId}`, allowing idempotent upserts.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for filtering/analytics)
 * @param positionSeconds - Current playback position in seconds
 * @param durationSeconds - Total content duration in seconds
 */
export async function savePlaybackProgress(
  userId: string,
  contentId: string,
  contentType: string,
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  // Heuristic: skip if position is less than 5 seconds (user just started, not meaningful)
  if (positionSeconds < 5) return;

  // Heuristic: skip if content is nearly complete (95%+).
  // User should mark as completed instead, and progress will be cleared.
  if (durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95) return;

  try {
    const docId = `${userId}_${contentId}`;
    await setDoc(doc(playbackProgressCollection, docId), {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      position_seconds: positionSeconds,
      duration_seconds: durationSeconds,
      updated_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error saving playback progress:", error);
  }
}

/**
 * Retrieve the saved playback position for a content item.
 *
 * Used at content launch to restore the user to their previous position.
 * Returns null if no progress has been saved (new content, or already completed).
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns PlaybackProgress object with position/duration, or null if none found
 */
export async function getPlaybackProgress(
  userId: string,
  contentId: string
): Promise<PlaybackProgress | null> {
  try {
    const docId = `${userId}_${contentId}`;
    const docSnap = await getDoc(doc(playbackProgressCollection, docId));
    
    if (!docSnap.exists()) return null;
    
    return docSnap.data() as PlaybackProgress;
  } catch (error) {
    console.error("Error getting playback progress:", error);
    return null;
  }
}

/**
 * Clear playback progress after content completion.
 *
 * Called when the user reaches the end of content (or marks it complete).
 * Deletes the progress record so future plays start from the beginning.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 */
export async function clearPlaybackProgress(
  userId: string,
  contentId: string
): Promise<void> {
  try {
    const docId = `${userId}_${contentId}`;
    await deleteDoc(doc(playbackProgressCollection, docId));
  } catch (error) {
    console.error("Error clearing playback progress:", error);
  }
}

// ============================================================
// COMPLETION TRACKING SECTION
// User progress toward courses/programs (marks individual items as complete).
// ============================================================

const completedContentCollection = collection(db, "completed_content");

/**
 * Mark a piece of content as completed.
 *
 * This records the user's achievement and is used for:
 *   - Displaying progress bars (X of Y items completed)
 *   - Unlocking next modules (if course structure requires sequential completion)
 *   - Analytics (tracking course graduation rates)
 *
 * Document ID is deterministic: `${userId}_${contentId}`, allowing idempotent updates.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @param contentType - Content type (for filtering/analytics)
 */
export async function markContentCompleted(
  userId: string,
  contentId: string,
  contentType: string
): Promise<void> {
  try {
    const docId = `${userId}_${contentId}`;
    await setDoc(doc(completedContentCollection, docId), {
      user_id: userId,
      content_id: contentId,
      content_type: contentType,
      completed_at: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error marking content as completed:", error);
  }
}

/**
 * Retrieve all completed content IDs for a given user and content type.
 *
 * Used to filter course/program content and show which items have been completed.
 * Returns a Set for fast O(1) lookup when rendering item lists.
 *
 * @param userId - The authenticated user's UID
 * @param contentType - Filter by content type (e.g., "course_session")
 * @returns Set of completed content IDs for fast lookup
 */
export async function getCompletedContentIds(
  userId: string,
  contentType: string
): Promise<Set<string>> {
  try {
    const q = query(
      completedContentCollection,
      where("user_id", "==", userId),
      where("content_type", "==", contentType)
    );
    const snapshot = await getDocs(q);
    const completedIds = new Set<string>();
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      completedIds.add(data.content_id);
    });
    return completedIds;
  } catch (error) {
    console.error("Error getting completed content:", error);
    return new Set<string>();
  }
}

/**
 * Check if a specific content item has been completed by the user.
 *
 * Quick existence check; used to show/hide "Resume" vs "Start" buttons.
 *
 * @param userId - The authenticated user's UID
 * @param contentId - Firestore document ID of the content
 * @returns true if the content has been marked complete
 */
export async function isContentCompleted(
  userId: string,
  contentId: string
): Promise<boolean> {
  try {
    const docId = `${userId}_${contentId}`;
    const docSnap = await getDoc(doc(completedContentCollection, docId));
    return docSnap.exists();
  } catch (error) {
    console.error("Error checking content completion:", error);
    return false;
  }
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
export async function deleteUserAccount(userId: string): Promise<void> {
  console.log(`Starting account deletion for user: ${userId}`);

  try {
    // Helper: Query and batch-delete all docs from a collection matching a field value
    // This pattern queries then mass-deletes in parallel, avoiding a composite index.
    const deleteCollection = async (
      collectionRef: ReturnType<typeof collection>,
      fieldName: string
    ) => {
      const q = query(collectionRef, where(fieldName, "==", userId));
      const snapshot = await getDocs(q);
      // Batch delete: Promise.all() ensures all deletes happen in parallel
      const deletePromises = snapshot.docs.map((docSnapshot) =>
        deleteDoc(docSnapshot.ref)
      );
      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.docs.length} docs from ${collectionRef.path}`);
    };

    // Phase 1: Delete user data from all collections
    await deleteCollection(favoritesCollection, "user_id");
    await deleteCollection(listeningHistoryCollection, "user_id");
    await deleteCollection(sessionsCollection, "user_id");
    await deleteCollection(playbackProgressCollection, "user_id");
    await deleteCollection(completedContentCollection, "user_id");

    // Phase 2: Delete the user's stats/profile document
    const userDocRef = doc(usersCollection, userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      await deleteDoc(userDocRef);
      console.log("Deleted user document");
    }

    console.log("Account deletion complete");
  } catch (error) {
    console.error("Error deleting user account data:", error);
    throw error;
  }
}

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
