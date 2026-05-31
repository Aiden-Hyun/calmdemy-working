/**
 * ============================================================
 * features/sleep/api/series.ts — Series (episodic content) access
 * ============================================================
 *
 * Episodic, multi-chapter content. Split out of the legacy
 * firestoreService.ts in Phase 3 (Group F).
 *
 * Series *detail* lookups (getSeriesById, findSeriesIdByChapterId) belong to
 * the library feature (Group H) and stay in the barrel for now. This module
 * owns the list query (getSeries) plus the series/chapter interfaces, and keeps
 * its own Cache-Aside `_seriesCache`. library's getContentById resolver imports
 * these interfaces; Phase 5 wires that up directly.
 * ============================================================
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";

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
 * In-memory Cache-Aside store for series, populated by getSeries(). Owned by
 * this module after the Phase 3 split (the barrel previously shared one cache
 * across getSeries and the library lookups).
 */
let _seriesCache: FirestoreSeries[] | null = null;

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
