/**
 * ============================================================
 * features/meditation/api/courses.ts — Course access
 * ============================================================
 *
 * Structured learning paths (courses) with hierarchical sessions.
 * Split out of the legacy firestoreService.ts in Phase 3 (Group E).
 *
 * Note: the library feature's polymorphic getContentById resolves
 * course_session content using getCourses() and these interfaces. During
 * Phase 3 the barrel re-exports them; Phase 5 (library extraction) imports
 * them directly from here.
 * ============================================================
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../../../core/firebase";

export interface FirestoreCourseSession {
  id: string;
  courseId: string;
  code?: string; // e.g., "CBT101M1P" -> parsed to "Module 1 Practice"
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  order: number;
  dayNumber?: number; // Display ordinal shown in the course detail UI (e.g., "Day 1").
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
  totalDuration?: number; // Aggregated session minutes, surfaced in the detail header.
  difficulty?: string;    // Free-form difficulty label (e.g., "Beginner").
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
