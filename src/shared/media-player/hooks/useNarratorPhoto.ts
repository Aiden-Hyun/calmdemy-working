/**
 * ============================================================
 * shared/media-player/hooks/useNarratorPhoto.ts — Narrator photo fetch
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * When a player screen supplies an instructor name but no photo URL, this hook
 * looks the photo up so the narrator can still be shown with their picture.
 *
 * Sources `getNarratorByName` from the library feature's public index. This is
 * one of the permitted `shared/media-player -> features/{music,library,progress}`
 * edges (Phase 6e-B): the media player intentionally plays content from every
 * content feature, so a bounded, documented dependency on their public APIs is
 * honest rather than fictional isolation. See the audit doc's "Permitted
 * shared -> feature edges" allow-list (Phase 8 reads it directly).
 * ============================================================
 */

import { useState, useEffect } from 'react';
import { getNarratorByName } from '../../../features/library';

/**
 * useNarratorPhoto — resolve the instructor's photo URL.
 *
 * @param instructor - Instructor/narrator display name, if any
 * @param instructorPhotoUrl - Pre-supplied photo URL; when present, used as-is
 * @returns The resolved photo URL (the supplied one, or one fetched by name)
 */
export function useNarratorPhoto(
  instructor: string | undefined,
  instructorPhotoUrl: string | undefined
): string | null {
  const [narratorPhotoUrl, setNarratorPhotoUrl] = useState<string | null>(
    instructorPhotoUrl || null
  );

  useEffect(() => {
    async function fetchNarratorPhoto() {
      if (instructor && !instructorPhotoUrl) {
        const narrator = await getNarratorByName(instructor);
        if (narrator?.photoUrl) {
          setNarratorPhotoUrl(narrator.photoUrl);
        }
      }
    }
    fetchNarratorPhoto();
  }, [instructor, instructorPhotoUrl]);

  return narratorPhotoUrl;
}
