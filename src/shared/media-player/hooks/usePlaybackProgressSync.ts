/**
 * ============================================================
 * shared/media-player/hooks/usePlaybackProgressSync.ts
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * Keeps Firestore playback-position state in sync with the player so users can
 * resume where they left off:
 *   - restore the saved position on mount (unless this is an autoplay jump),
 *   - debounce-save during playback (on pause, or at most every 10s),
 *   - clear the saved position once the content is effectively complete (95%),
 *   - save the final position on unmount.
 *
 * Sources the save/get/clear primitives from the legacy firestoreService barrel
 * (the same imports the component used); the barrel migration is Phase 6e.
 *
 * Pure side-effect hook — returns nothing.
 * ============================================================
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';
import {
  savePlaybackProgress,
  getPlaybackProgress,
  clearPlaybackProgress,
} from '../../../services/firestoreService';

export interface UsePlaybackProgressSyncProps {
  contentId?: string;
  contentType?: string;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  /** Skip restoring saved position (set when autoplay jumps to the next track). */
  skipRestore: boolean;
}

/**
 * usePlaybackProgressSync — restore / save / clear Firestore playback position.
 */
export function usePlaybackProgressSync({
  contentId,
  contentType,
  audioPlayer,
  skipRestore,
}: UsePlaybackProgressSyncProps): void {
  const { user } = useAuth();

  const lastSaveTime = useRef(0); // Timestamp of last save (for debouncing).
  const hasRestoredPosition = useRef(false); // Prevents restoring more than once.

  // Restore the saved position on mount (waits for audio to be ready; skips
  // nearly-finished positions and autoplay jumps).
  useEffect(() => {
    async function restorePosition() {
      if (!user?.uid || !contentId || hasRestoredPosition.current) return;

      if (skipRestore) {
        hasRestoredPosition.current = true;
        return;
      }

      const progress = await getPlaybackProgress(user.uid, contentId);
      if (progress && progress.position_seconds > 5) {
        const checkAndSeek = () => {
          if (audioPlayer.duration > 0) {
            audioPlayer.seekTo(progress.position_seconds);
            hasRestoredPosition.current = true;
          } else {
            setTimeout(checkAndSeek, 100);
          }
        };
        checkAndSeek();
      } else {
        hasRestoredPosition.current = true;
      }
    }
    restorePosition();
  }, [user?.uid, contentId, audioPlayer.duration, skipRestore]);

  // Reset the tracking refs when content changes so the next item starts fresh.
  useEffect(() => {
    hasRestoredPosition.current = false;
    lastSaveTime.current = 0;
  }, [contentId]);

  // Debounced save: on pause, or at most every 10 seconds during playback.
  useEffect(() => {
    if (!user?.uid || !contentId || !contentType) return;
    if (audioPlayer.position < 5 || audioPlayer.duration === 0) return;

    const now = Date.now();
    const shouldSave =
      (!audioPlayer.isPlaying && audioPlayer.position > 5) ||
      (now - lastSaveTime.current >= 10000);

    if (shouldSave) {
      lastSaveTime.current = now;
      savePlaybackProgress(
        user.uid,
        contentId,
        contentType,
        audioPlayer.position,
        audioPlayer.duration
      );
    }
  }, [user?.uid, contentId, contentType, audioPlayer.position, audioPlayer.isPlaying, audioPlayer.duration]);

  // Clear the saved position once content is effectively complete (>= 95%).
  useEffect(() => {
    if (!user?.uid || !contentId) return;
    if (audioPlayer.progress >= 0.95 && audioPlayer.duration > 0) {
      clearPlaybackProgress(user.uid, contentId);
    }
  }, [user?.uid, contentId, audioPlayer.progress, audioPlayer.duration]);

  // Save the current position on unmount (captures progress even without a pause).
  useEffect(() => {
    return () => {
      if (user?.uid && contentId && contentType && audioPlayer.position > 5 && audioPlayer.duration > 0) {
        savePlaybackProgress(
          user.uid,
          contentId,
          contentType,
          audioPlayer.position,
          audioPlayer.duration
        );
      }
    };
  }, [user?.uid, contentId, contentType, audioPlayer.position, audioPlayer.duration]);
}
