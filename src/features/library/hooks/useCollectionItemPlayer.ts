/**
 * ============================================================
 * features/library/hooks/useCollectionItemPlayer.ts
 * ============================================================
 *
 * The shared player mechanics behind the album-track / series-chapter /
 * course-session player screens, parameterized by a `CollectionConfig`.
 * Extracted in Phase 5 Step 5 so one `CollectionItemPlayerScreen` can
 * drive all three. Behavior mirrors the three originals exactly:
 *
 *   - load audio (downloaded local file first, else streamed URL)
 *   - auto-start playback when navigated with autoPlay
 *   - mark content completed once at 80% progress
 *   - prev/next within the sibling list (paywall-gated, cleans up audio,
 *     router.replace to the player route; next auto-plays)
 *
 * It also owns the `usePlayerBehavior` wiring (favorites / rating /
 * report / play-pause). Presentation (MediaPlayer props) and the
 * type-specific sibling-param shape stay in the screen, which passes
 * `buildSiblingParams` in — the parent-level fields (albumTitle, artist,
 * narrator, course codes, color…) live in the route params, not the
 * sibling item, so the screen is the natural owner.
 *
 * MediaPlayer itself stays at src/components/MediaPlayer.tsx for Phase 5
 * (Phase 6 relocates it to shared/media-player/).
 * ============================================================
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../core/auth/AuthContext';
import { useSubscription } from '../../../core/subscription/SubscriptionContext';
import { useAudioPlayer } from '../../../core/audio/useAudioPlayer';
import { getAudioUrlFromPath } from '../../../core/audio/audioFiles';
import { getLocalAudioPath } from '../../../services/downloadService';
import { markContentCompleted } from '../../../services/firestoreService';
import { usePlayerBehavior } from '../../../hooks/usePlayerBehavior';
import type { RatingType, ReportCategory } from '../../../types';
import type { CollectionConfig } from '../types';

export interface UseCollectionItemPlayerArgs<TChild> {
  /** Current child id (the `id` route param). */
  childId: string;
  /** Current child audio storage path. */
  audioPath: string | undefined;
  /** JSON-encoded sibling list (`tracksJson` / `chaptersJson` / `sessionsJson`). */
  siblingsJson: string | undefined;
  /** Current index within the sibling list (string route param). */
  currentIndex: string | undefined;
  /** When 'true', auto-start playback on mount. */
  autoPlay: string | undefined;
  /** Title handed to usePlayerBehavior (type-specific prefix; built by the screen). */
  playerBehaviorTitle: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  /**
   * Build the route params for a sibling when navigating prev/next. Owned by
   * the screen because the parent-level fields come from the current route
   * params (not the sibling). `opts.autoPlay` adds `autoPlay: 'true'` (next).
   */
  buildSiblingParams: (
    sibling: TChild,
    index: number,
    opts: { autoPlay: boolean }
  ) => Record<string, string>;
}

export interface UseCollectionItemPlayerResult<TChild> {
  loading: boolean;
  currentAudioUrl: string | undefined;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  siblings: TChild[];
  hasPrevious: boolean;
  hasNext: boolean;
  // usePlayerBehavior surface
  isFavorited: boolean;
  userRating: RatingType | null;
  onToggleFavorite: () => Promise<void>;
  onPlayPause: () => Promise<void>;
  onRate: (rating: RatingType) => Promise<RatingType | null>;
  onReport: (category: ReportCategory, description?: string) => Promise<boolean>;
  // paywall + navigation
  showPaywall: boolean;
  closePaywall: () => void;
  handleGoBack: () => void;
  handlePrevious: () => void;
  handleNext: () => void;
}

export function useCollectionItemPlayer<TParent, TChild>(
  config: CollectionConfig<TParent, TChild>,
  args: UseCollectionItemPlayerArgs<TChild>
): UseCollectionItemPlayerResult<TChild> {
  const {
    childId,
    audioPath,
    siblingsJson,
    currentIndex,
    autoPlay,
    playerBehaviorTitle,
    durationMinutes,
    thumbnailUrl,
    buildSiblingParams,
  } = args;

  const router = useRouter();
  const { user } = useAuth();
  const { isPremium: hasSubscription } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | undefined>();
  const [showPaywall, setShowPaywall] = useState(false);
  const hasTrackedCompletion = useRef(false);

  const audioPlayer = useAudioPlayer();

  const {
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  } = usePlayerBehavior({
    contentId: childId,
    contentType: config.childContentType,
    audioPlayer,
    title: playerBehaviorTitle,
    durationMinutes,
    thumbnailUrl,
  });

  const siblings: TChild[] = useMemo(() => {
    if (!siblingsJson) return [];
    try {
      return JSON.parse(siblingsJson);
    } catch {
      return [];
    }
  }, [siblingsJson]);

  const currentIdx = parseInt(currentIndex || '0', 10);
  const hasPrevious = siblings.length > 0 && currentIdx > 0;
  const hasNext = siblings.length > 0 && currentIdx < siblings.length - 1;

  // Reset completion tracking when content changes.
  useEffect(() => {
    hasTrackedCompletion.current = false;
  }, [childId]);

  // Load audio: downloaded local file first, else streamed URL.
  useEffect(() => {
    async function loadAudio() {
      if (!audioPath) {
        setLoading(false);
        return;
      }
      try {
        const localPath = await getLocalAudioPath(childId);
        if (localPath) {
          setCurrentAudioUrl(localPath);
          audioPlayer.loadAudio(localPath);
        } else {
          const audioUrl = await getAudioUrlFromPath(audioPath);
          if (audioUrl) {
            setCurrentAudioUrl(audioUrl);
            audioPlayer.loadAudio(audioUrl);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPath]);

  // Auto-start playback when navigated with autoPlay.
  useEffect(() => {
    if (autoPlay === 'true' && !loading && audioPlayer.duration > 0 && !audioPlayer.isPlaying) {
      audioPlayer.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, loading, audioPlayer.duration]);

  // Mark content completed once at 80% progress.
  useEffect(() => {
    async function trackCompletion() {
      if (
        !hasTrackedCompletion.current &&
        user &&
        childId &&
        audioPlayer.progress >= 0.8 &&
        audioPlayer.duration > 0
      ) {
        hasTrackedCompletion.current = true;
        try {
          await markContentCompleted(user.uid, childId, config.childContentType);
        } catch (error) {
          console.error('Failed to mark content completed:', error);
        }
      }
    }
    trackCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPlayer.progress, user, childId]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  const handlePrevious = () => {
    if (!hasPrevious) return;
    const prev = siblings[currentIdx - 1];
    if (!config.getChildIsFree(prev) && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    audioPlayer.cleanup();
    router.replace({
      pathname: config.playerPathname as any,
      params: buildSiblingParams(prev, currentIdx - 1, { autoPlay: false }),
    });
  };

  const handleNext = () => {
    if (!hasNext) return;
    const next = siblings[currentIdx + 1];
    if (!config.getChildIsFree(next) && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    audioPlayer.cleanup();
    router.replace({
      pathname: config.playerPathname as any,
      params: buildSiblingParams(next, currentIdx + 1, { autoPlay: true }),
    });
  };

  const closePaywall = () => setShowPaywall(false);

  return {
    loading,
    currentAudioUrl,
    audioPlayer,
    siblings,
    hasPrevious,
    hasNext,
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
    showPaywall,
    closePaywall,
    handleGoBack,
    handlePrevious,
    handleNext,
  };
}
