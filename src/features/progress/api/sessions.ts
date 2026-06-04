/**
 * ============================================================
 * features/progress/api/sessions.ts — Sessions & user stats
 * ============================================================
 *
 * Meditation session recording plus the derived user-stats aggregation
 * (streaks, total minutes, weekly/monthly/yearly breakdowns). Split out of
 * the legacy firestoreService.ts in Phase 3 (Group C). The barrel re-exports
 * the public functions; the `updateUserStats` / `calculateStreak` helpers stay
 * private to this module.
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import { MeditationSession } from "../types";

const sessionsCollection = collection(db, "meditation_sessions");

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

  // Update user stats in the background — don't block the session creation response.
  // Stats are derived data and can tolerate brief staleness.
  updateUserStats(session.user_id).catch((err) =>
    console.error("Background stats update failed:", err)
  );

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
