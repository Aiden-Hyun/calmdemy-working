/**
 * ============================================================
 * shared/media-player/hooks/useSleepTimerFade.ts — Sleep-timer fade
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * Applies the sleep timer's published fade-out to the audio the screen owns.
 *
 * The PlaybackTimerContext never touches the player (Inversion of Control set
 * up in 6d-2): it publishes `fadeVolume` (1 normally, ramping 1 -> 0 during a
 * fade) and `isFadingOut`. This hook mirrors that multiplier onto the main
 * player, and when the fade reaches 0 it pauses both players and finalizes the
 * timer. A ref guard ensures the pause happens exactly once per fade.
 *
 * Pure side-effect hook — returns nothing.
 * ============================================================
 */

import { useEffect, useRef } from 'react';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';
import { useBackgroundAudio } from '../../../core/audio/useBackgroundAudio';
import { usePlaybackTimer } from '../PlaybackTimerContext';

export interface UseSleepTimerFadeProps {
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  backgroundAudio: ReturnType<typeof useBackgroundAudio>;
  sleepTimer: ReturnType<typeof usePlaybackTimer>;
}

/**
 * useSleepTimerFade — mirror the timer's fade volume onto the player and pause
 * when the fade completes.
 */
export function useSleepTimerFade({
  audioPlayer,
  backgroundAudio,
  sleepTimer,
}: UseSleepTimerFadeProps): void {
  // Guard so the fade-out completion handler pauses exactly once per fade.
  const hasFadePausedRef = useRef(false);

  // Mirror the published fade multiplier onto the main player; restore full
  // volume whenever a fade isn't in progress.
  useEffect(() => {
    if (audioPlayer.player) {
      audioPlayer.player.volume = sleepTimer.isFadingOut ? sleepTimer.fadeVolume : 1;
    }
  }, [sleepTimer.isFadingOut, sleepTimer.fadeVolume, audioPlayer.player]);

  // When the fade reaches 0 the audio is silent: pause both players, then
  // cancelTimer() finalizes (clears the timer and restores fadeVolume to 1).
  useEffect(() => {
    if (sleepTimer.isFadingOut && sleepTimer.fadeVolume === 0 && !hasFadePausedRef.current) {
      hasFadePausedRef.current = true;
      audioPlayer.pause();
      backgroundAudio.pause();
      sleepTimer.cancelTimer();
    } else if (!sleepTimer.isFadingOut) {
      hasFadePausedRef.current = false;
    }
  }, [sleepTimer.isFadingOut, sleepTimer.fadeVolume]);
}
