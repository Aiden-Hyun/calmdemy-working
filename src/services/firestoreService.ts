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

// In-memory cache for collection data (populated by getSeries/getAlbums, used by getContentById)
let _seriesCache: any[] | null = null;
let _albumsCache: any[] | null = null;

// Collection references
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

// ==================== MEDITATIONS ====================

/**
 * Get all guided meditations
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
 * Get meditations filtered by theme (uses array-contains for themes array)
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
 * Get meditations filtered by technique (uses array-contains for techniques array)
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
 * Get a single meditation by ID
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

// ==================== SESSIONS ====================

export async function createSession(
  session: Omit<MeditationSession, "id" | "completed_at">
): Promise<string> {
  const docRef = await addDoc(sessionsCollection, {
    ...session,
    completed_at: serverTimestamp(),
  });

  // Update user stats
  await updateUserStats(session.user_id);

  return docRef.id;
}

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

// ==================== USER STATS ====================

async function updateUserStats(userId: string) {
  try {
    const sessions = await getUserSessions(userId, 1000);

    const totalMinutes = sessions.reduce(
      (sum, session) => sum + session.duration_minutes,
      0
    );

    const streak = calculateStreak(sessions);

    // Get current longest streak from user doc
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.exists() ? userDoc.data() : {};
    const currentLongest = userData.longest_streak || 0;

    // Update longest_streak if current streak exceeds it
    const newLongestStreak = Math.max(streak, currentLongest);

    await setDoc(
      userRef,
      {
        total_meditation_minutes: totalMinutes,
        meditation_streak: streak,
        longest_streak: newLongestStreak,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating user stats:", error);
  }
}

function calculateStreak(sessions: MeditationSession[]): number {
  if (sessions.length === 0) return 0;

  let streak = 1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastSession = new Date(sessions[0].completed_at);
  lastSession.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor(
    (today.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff > 1) return 0;

  for (let i = 1; i < sessions.length; i++) {
    const currentDate = new Date(sessions[i - 1].completed_at);
    const previousDate = new Date(sessions[i].completed_at);

    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);

    const diff = Math.floor(
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff === 1) {
      streak++;
    } else if (diff > 1) {
      break;
    }
  }

  return streak;
}

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

// ==================== PROGRAMS ====================

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

// ==================== BREATHING EXERCISES ====================

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

// ==================== BEDTIME STORIES ====================

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

// ==================== DAILY QUOTES ====================

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

// ==================== FAVORITES ====================

export async function getUserFavorites(
  userId: string
): Promise<UserFavorite[]> {
  try {
    // Use simple query without orderBy to avoid requiring composite index
    // Sort client-side instead
    const q = query(favoritesCollection, where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        favorited_at:
          data.favorited_at instanceof Timestamp
            ? data.favorited_at.toDate().toISOString()
            : new Date().toISOString(),
      } as UserFavorite;
    });

    // Sort by favorited_at descending (most recent first)
    return items.sort(
      (a, b) =>
        new Date(b.favorited_at).getTime() - new Date(a.favorited_at).getTime()
    );
  } catch (error: any) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

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
    // Query ALL favorites for this content (any type) to handle legacy data
    const q = query(
      favoritesCollection,
      where("user_id", "==", userId),
      where("content_id", "==", contentId)
    );
    const existing = await getDocs(q);

    if (!existing.empty) {
      // Remove ALL favorites for this content (handles legacy entries with wrong type)
      const deletePromises = existing.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      return false;
    } else {
      // Add favorite with content type and denormalized metadata
      await addDoc(favoritesCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        favorited_at: serverTimestamp(),
        // Denormalized fields for fast reads (avoids N+1 lookups)
        ...(metadata && {
          title: metadata.title,
          thumbnail_url: metadata.thumbnail_url || null,
          duration_minutes: metadata.duration_minutes,
          ...(metadata.course_code && { course_code: metadata.course_code }),
          ...(metadata.session_code && { session_code: metadata.session_code }),
        }),
      });
      return true;
    }
  } catch (error) {
    console.error("Error toggling favorite:", error);
    return false;
  }
}

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

// ==================== CONTENT RESOLVER ====================

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
  // For course sessions - to display code badge and module info
  course_code?: string; // e.g., "CBT101"
  session_code?: string; // e.g., "CBT101M1L"
}

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
    // Handle emergency meditations from Firestore
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

    // Handle series_chapter from Firestore (check cache first)
    if (contentType === "series_chapter") {
      const allSeries = _seriesCache ?? await getSeries();
      for (const series of allSeries) {
        const chapter = series.chapters?.find((c) => c.id === contentId);
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
      return null;
    }

    // Handle album_track from Firestore (check cache first)
    if (contentType === "album_track") {
      const allAlbums = _albumsCache ?? await getAlbums();
      for (const album of allAlbums) {
        const track = album.tracks?.find((t) => t.id === contentId);
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
      return null;
    }

    // Handle course_session from Firestore
    if (contentType === "course_session") {
      const allCourses = await getCourses();
      for (const course of allCourses) {
        const session = course.sessions?.find((s) => s.id === contentId);
        if (session) {
          return {
            id: contentId,
            title: session.title, // Just session title, not "Course: Session"
            thumbnail_url: course.thumbnailUrl,
            duration_minutes: session.duration_minutes,
            content_type: contentType,
            course_code: course.code,
            session_code: session.code,
          };
        }
      }
      return null;
    }

    // Handle sleep_meditation from Firestore
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

    // Handle other Firestore-stored types
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

    const docRef = doc(db, collectionName, contentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) return null;

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
    return null;
  }
}

export async function getFavoritesWithDetails(
  userId: string
): Promise<ResolvedContent[]> {
  try {
    const favorites = await getUserFavorites(userId);
    const resolvedContent: ResolvedContent[] = [];

    for (const fav of favorites) {
      const favData = fav as any; // Raw Firestore doc may have denormalized fields

      // Use denormalized data if available (new favorites), fall back to lookup (legacy)
      if (favData.title) {
        resolvedContent.push({
          id: fav.content_id,
          title: favData.title,
          thumbnail_url: favData.thumbnail_url,
          duration_minutes: favData.duration_minutes || 0,
          content_type: fav.content_type,
          course_code: favData.course_code,
          session_code: favData.session_code,
        });
      } else {
        // Legacy favorite without denormalized data — resolve via lookup
        const content = await getContentById(fav.content_id, fav.content_type);
        if (content) {
          resolvedContent.push(content);
        }
      }
    }

    return resolvedContent;
  } catch (error) {
    console.error("Error fetching favorites with details:", error);
    return [];
  }
}

// ==================== SLEEP MEDITATIONS ====================

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

// ==================== EMERGENCY MEDITATIONS ====================

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

// ==================== COURSES ====================

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
    course.sessions = await getCourseSessionsByCourseId(id);
    course.sessionCount = course.sessions.length;

    return course;
  } catch (error) {
    console.error("Error fetching course:", error);
    return null;
  }
}

// ==================== PARENT LOOKUP HELPERS ====================
// Lightweight lookups to find parent ID for child content (used for navigation)

export async function findSeriesIdByChapterId(chapterId: string): Promise<string | null> {
  try {
    const allSeries = _seriesCache ?? await getSeries();
    for (const s of allSeries) {
      if (s.chapters?.some(ch => ch.id === chapterId)) return s.id;
    }
    return null;
  } catch { return null; }
}

export async function findAlbumIdByTrackId(trackId: string): Promise<string | null> {
  try {
    const allAlbums = _albumsCache ?? await getAlbums();
    for (const a of allAlbums) {
      if (a.tracks?.some(t => t.id === trackId)) return a.id;
    }
    return null;
  } catch { return null; }
}

export async function findCourseIdBySessionId(sessionId: string): Promise<string | null> {
  try {
    const q = query(
      collection(db, "course_sessions"),
      where("__name__", "==", sessionId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data().courseId || null;
  } catch { return null; }
}

// ==================== SERIES ====================

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

export async function getSeries(): Promise<FirestoreSeries[]> {
  try {
    const snapshot = await getDocs(collection(db, "series"));
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      const chapters = (data.chapters || []).map((ch: FirestoreSeriesChapter) => ({ ...ch, isFree: true }));
      return { id: doc.id, ...data, chapters } as FirestoreSeries;
    });
    _seriesCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching series:", error);
    return [];
  }
}

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

// ==================== ALBUMS ====================

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

export async function getAlbums(): Promise<FirestoreAlbum[]> {
  try {
    const snapshot = await getDocs(collection(db, "albums"));
    const result = snapshot.docs.map((doc) => {
      const data = doc.data();
      const tracks = (data.tracks || []).map((t: FirestoreAlbumTrack) => ({ ...t, isFree: true }));
      return { id: doc.id, ...data, tracks } as FirestoreAlbum;
    });
    _albumsCache = result;
    return result;
  } catch (error) {
    console.error("Error fetching albums:", error);
    return [];
  }
}

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

// ==================== SLEEP SOUNDS ====================

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

// ==================== BACKGROUND SOUNDS ====================

export interface FirestoreBackgroundSound {
  id: string;
  title: string;
  icon: string;
  category: string;
  audioPath: string;
  color: string;
}

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

// ==================== WHITE NOISE / MUSIC / ASMR ====================

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

// ==================== LISTENING HISTORY ====================

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

export async function getListeningHistory(
  userId: string,
  maxLimit = 10
): Promise<ListeningHistoryItem[]> {
  try {
    // Use simple query without orderBy to avoid requiring composite index
    // Sort client-side instead
    const q = query(listeningHistoryCollection, where("user_id", "==", userId));
    const snapshot = await getDocs(q);

    const items = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        played_at:
          data.played_at instanceof Timestamp
            ? data.played_at.toDate().toISOString()
            : new Date().toISOString(),
      } as ListeningHistoryItem;
    });

    // Sort by played_at descending (most recent first)
    const sorted = items.sort(
      (a, b) =>
        new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );

    // Deduplicate by content_id, keeping only the most recent play
    const seen = new Set<string>();
    const deduplicated = sorted.filter((item) => {
      if (seen.has(item.content_id)) return false;
      seen.add(item.content_id);
      return true;
    });

    return deduplicated.slice(0, maxLimit);
  } catch (error: any) {
    console.error("Error fetching listening history:", error);
    return [];
  }
}

// ==================== NARRATORS ====================

export interface FirestoreNarrator {
  id: string;
  name: string;
  bio?: string;
  photoUrl: string;
}

// Cache for narrator data
const narratorCache: Map<string, FirestoreNarrator> = new Map();

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

export async function getNarratorByName(
  name: string
): Promise<FirestoreNarrator | null> {
  // Check cache first
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

    // Cache it
    narratorCache.set(name.toLowerCase(), narrator);
    return narrator;
  } catch (error) {
    console.error("Error fetching narrator by name:", error);
    return null;
  }
}

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

/**
 * Save or update playback progress for a content item
 */
export async function savePlaybackProgress(
  userId: string,
  contentId: string,
  contentType: string,
  positionSeconds: number,
  durationSeconds: number
): Promise<void> {
  // Skip saving if position is less than 5 seconds (not meaningful)
  if (positionSeconds < 5) return;
  
  // Skip saving if content is nearly complete (will be cleared anyway)
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
 * Get saved playback progress for a content item
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
 * Clear playback progress when content is completed
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

// ============================================================================
// COMPLETED CONTENT TRACKING
// ============================================================================

const completedContentCollection = collection(db, "completed_content");

/**
 * Mark a content item as completed
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
 * Get all completed content IDs for a user and content type
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
 * Check if a specific content item is completed
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

// ==================== ACCOUNT DELETION ====================

/**
 * Delete all user data from Firestore
 * Called before deleting the Firebase Auth account
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  console.log(`Starting account deletion for user: ${userId}`);
  
  try {
    // Helper function to delete all docs matching a query
    const deleteCollection = async (
      collectionRef: ReturnType<typeof collection>,
      fieldName: string
    ) => {
      const q = query(collectionRef, where(fieldName, "==", userId));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((docSnapshot) =>
        deleteDoc(docSnapshot.ref)
      );
      await Promise.all(deletePromises);
      console.log(`Deleted ${snapshot.docs.length} docs from ${collectionRef.path}`);
    };

    // Delete from all user-specific collections
    await deleteCollection(favoritesCollection, "user_id");
    await deleteCollection(listeningHistoryCollection, "user_id");
    await deleteCollection(sessionsCollection, "user_id");
    await deleteCollection(playbackProgressCollection, "user_id");
    await deleteCollection(completedContentCollection, "user_id");

    // Delete the user document itself
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

// ==================== CONTENT RATINGS ====================

/**
 * Get user's rating for a specific content
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
 * Set or toggle user's rating for content
 * If same rating exists, removes it (toggle off)
 * If different rating exists, updates it
 * If no rating exists, creates one
 */
export async function setContentRating(
  userId: string,
  contentId: string,
  contentType: string,
  rating: RatingType
): Promise<RatingType | null> {
  try {
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
        // Same rating - toggle off (remove)
        await deleteDoc(existingDoc.ref);
        return null;
      } else {
        // Different rating - update
        await setDoc(existingDoc.ref, {
          user_id: userId,
          content_id: contentId,
          content_type: contentType,
          rating: rating,
          rated_at: serverTimestamp(),
        });
        return rating;
      }
    } else {
      // No rating exists - create new
      await addDoc(contentRatingsCollection, {
        user_id: userId,
        content_id: contentId,
        content_type: contentType,
        rating: rating,
        rated_at: serverTimestamp(),
      });
      return rating;
    }
  } catch (error) {
    console.error("Error setting content rating:", error);
    return null;
  }
}

// ==================== CONTENT REPORTS ====================

/**
 * Submit a report for content
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
