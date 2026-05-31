/**
 * ============================================================
 * features/music/api/albums.ts — Album list access
 * ============================================================
 *
 * Album collections (multi-track albums of ambient sounds, music, or ASMR).
 * Split out of the legacy firestoreService.ts in Phase 3 (Group G).
 *
 * Only the list query (getAlbums) and the album/track interfaces live here.
 * Album *detail* lookups (getAlbumById, findAlbumIdByTrackId) belong to the
 * library feature (Group H) and stay in the barrel for now; they import these
 * interfaces from this module during the transition.
 * ============================================================
 */

import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../core/firebase";

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
 * In-memory Cache-Aside store for albums, populated by getAlbums(). Owned by
 * this module after the Phase 3 split.
 */
let _albumsCache: FirestoreAlbum[] | null = null;

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
