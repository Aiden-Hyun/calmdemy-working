/**
 * ============================================================
 * features/library/navigation.ts — polymorphic content router
 * ============================================================
 *
 * `navigateToContent` routes any of the app's content types to its
 * destination screen. Extracted from `app/(tabs)/home.tsx` in Phase 5
 * Step 7 so Home — and later Downloads, search, and the Phase 7 Discover
 * tab — can share one router instead of each re-implementing the switch.
 *
 * The hierarchical types (series_chapter / album_track / course_session)
 * resolve their parent id via the library's own lookups in
 * `./api/content`, then deep-link into the unified collection detail
 * screen with `autoOpenItemId`.
 *
 * Emergency content needs the full meditation metadata (title, audioPath,
 * color, …) which the caller already has loaded — so the caller passes
 * the `emergencyMeditations` list in as context rather than this function
 * re-fetching it (a Phase 7+ optimization could move to a by-id fetch).
 * ============================================================
 */

import type { Router } from 'expo-router';
import type { FirestoreEmergencyMeditation } from '../../services/firestoreService';
import {
  findSeriesIdByChapterId,
  findAlbumIdByTrackId,
  findCourseIdBySessionId,
} from './api/content';

export interface NavigateToContentContext {
  /** Emergency meditations already loaded by the caller (Home). */
  emergencyMeditations: FirestoreEmergencyMeditation[];
}

/**
 * Navigate to the screen that plays/opens a piece of content.
 *
 * @param contentId   Firestore id of the content
 * @param contentType Discriminated content type (8 variants + legacy emergency)
 * @param router      Expo Router instance from the caller's `useRouter()`
 * @param ctx         Caller-supplied context (the loaded emergency list)
 */
export async function navigateToContent(
  contentId: string,
  contentType: string,
  router: Router,
  ctx: NavigateToContentContext
): Promise<void> {
  const { emergencyMeditations } = ctx;

  // Handle emergency content that may have been saved with the wrong type.
  if (contentId.startsWith('emergency_')) {
    const em = emergencyMeditations.find((e) => e.id === contentId);
    if (em) {
      router.push({
        pathname: '/emergency/[id]',
        params: {
          id: em.id, title: em.title, description: em.description,
          duration: String(em.duration_minutes), audioPath: em.audioPath,
          color: em.color, icon: em.icon, narrator: em.narrator || '',
          thumbnailUrl: em.thumbnailUrl || ''
        }
      });
    } else {
      router.push('/(tabs)/meditate');
    }
    return;
  }

  switch (contentType) {
    case 'meditation':
      router.push({ pathname: '/meditation/[id]', params: { id: contentId } });
      break;
    case 'bedtime_story':
      router.push({ pathname: '/sleep/[id]', params: { id: contentId } });
      break;
    case 'breathing_exercise':
      router.push('/breathing');
      break;
    case 'nature_sound':
      router.push({ pathname: '/music/[id]', params: { id: contentId } });
      break;
    case 'series_chapter': {
      const seriesId = await findSeriesIdByChapterId(contentId);
      if (seriesId) {
        router.push({ pathname: '/series/[id]', params: { id: seriesId, autoOpenItemId: contentId } });
      } else {
        router.push('/(tabs)/sleep');
      }
      break;
    }
    case 'album_track': {
      const albumId = await findAlbumIdByTrackId(contentId);
      if (albumId) {
        router.push({ pathname: '/album/[id]', params: { id: albumId, autoOpenItemId: contentId } });
      } else {
        router.push('/(tabs)/music');
      }
      break;
    }
    case 'emergency': {
      const emergency = emergencyMeditations.find((e) => e.id === contentId);
      if (emergency) {
        router.push({
          pathname: '/emergency/[id]',
          params: {
            id: emergency.id, title: emergency.title, description: emergency.description,
            duration: String(emergency.duration_minutes), audioPath: emergency.audioPath,
            color: emergency.color, icon: emergency.icon, narrator: emergency.narrator || '',
            thumbnailUrl: emergency.thumbnailUrl || ''
          }
        });
      } else {
        router.push('/(tabs)/meditate');
      }
      break;
    }
    case 'course_session': {
      const courseId = await findCourseIdBySessionId(contentId);
      if (courseId) {
        router.push({ pathname: '/course/[id]', params: { id: courseId, autoOpenItemId: contentId } });
      } else {
        router.push('/(tabs)/meditate');
      }
      break;
    }
    case 'sleep_meditation':
      router.push({ pathname: '/sleep/meditation/[id]', params: { id: contentId } });
      break;
  }
}
