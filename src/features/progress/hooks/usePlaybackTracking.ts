/**
 * ============================================================
 * features/progress/hooks/usePlaybackTracking.ts — Playback analytics
 * ============================================================
 *
 * One slice of the former shared `usePlayerBehavior` god-hook, relocated to
 * the progress feature in Phase 6d-3. Owns the playback-analytics side of a
 * content player: the play/pause handler that records listening history on
 * first play, and the observer that records a completed session at 80%
 * progress. Sources from progress's own `api/listeningHistory` + `api/sessions`.
 *
 * Design Patterns:
 *   - Observer: watches audioPlayer.progress to fire a session record once the
 *     80% completion threshold is crossed.
 *   - Fire-once gate: refs (hasTrackedPlay / hasTrackedSession) prevent double
 *     counting; reset whenever contentId changes (Cache Invalidation).
 *   - Error Recovery: analytics failures are logged, never interrupt playback.
 * ============================================================
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';
import { addToListeningHistory } from '../api/listeningHistory';
import { createSession } from '../api/sessions';

export interface UsePlaybackTrackingProps {
  contentId: string | undefined;
  contentType: string;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  title?: string;
  durationMinutes?: number;
  thumbnailUrl?: string;
}

export interface UsePlaybackTrackingReturn {
  onPlayPause: () => Promise<void>;
}

/**
 * usePlaybackTracking — play/pause control plus listening-history and
 * session-completion analytics for one content item.
 *
 * @param contentId - Firestore doc ID of the content (partition key)
 * @param contentType - Discriminator for polymorphic content
 * @param audioPlayer - ReturnType<useAudioPlayer> (progress/duration/play/pause)
 * @param title, durationMinutes, thumbnailUrl - metadata for analytics records
 */
export function usePlaybackTracking({
  contentId,
  contentType,
  audioPlayer,
  title,
  durationMinutes,
  thumbnailUrl,
}: UsePlaybackTrackingProps): UsePlaybackTrackingReturn {
  const { user, isAnonymous } = useAuth();

  // Fire-once gates, reset when the content changes (Cache Invalidation).
  const hasTrackedPlay = useRef(false);
  const hasTrackedSession = useRef(false);

  useEffect(() => {
    hasTrackedPlay.current = false;
    hasTrackedSession.current = false;
  }, [contentId]);

  // Observer: record a completed session once playback crosses 80%.
  useEffect(() => {
    async function trackSession() {
      if (
        !hasTrackedSession.current &&
        user &&
        contentId &&
        durationMinutes &&
        audioPlayer.progress >= 0.8 &&
        audioPlayer.duration > 0
      ) {
        // Mark before the async call so progress updates can't double-fire.
        hasTrackedSession.current = true;

        try {
          await createSession({
            user_id: user.uid,
            duration_minutes: durationMinutes,
            session_type: contentType as any,
          });
        } catch (error) {
          console.error('Failed to track session:', error);
        }
      }
    }

    trackSession();
  }, [audioPlayer.progress, audioPlayer.duration, user, contentId, contentType, durationMinutes]);

  const onPlayPause = useCallback(async () => {
    if (audioPlayer.isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();

      // Fire-once gate: record listening history on first play (signed-in only).
      if (!hasTrackedPlay.current && user && contentId && title && !isAnonymous) {
        hasTrackedPlay.current = true;

        try {
          await addToListeningHistory(
            user.uid,
            contentId,
            contentType as any,
            title,
            durationMinutes || 0,
            thumbnailUrl
          );
        } catch (error) {
          console.error('Failed to track listening history:', error);
        }
      }
    }
  }, [audioPlayer, user, contentId, contentType, title, durationMinutes, thumbnailUrl, isAnonymous]);

  return { onPlayPause };
}
