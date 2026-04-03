import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import {
  isFavorite,
  toggleFavorite,
  getUserRating,
  setContentRating,
  reportContent,
  addToListeningHistory,
  createSession,
} from '../services/firestoreService';
import { RatingType, ReportCategory } from '../types';
import { useAudioPlayer } from './useAudioPlayer';

/**
 * ============================================================
 * usePlayerBehavior.ts — Content Playback Behavior & User Interactions
 * ============================================================
 *
 * Architectural Role:
 *   This hook encapsulates all user interactions related to audio content
 *   playback: favorites, ratings, reporting, and analytics tracking. It
 *   coordinates between the audio player (via useAudioPlayer), authentication
 *   context, and the Firestore repository layer. Consumed by meditation/music
 *   content screens that display playback controls and metadata actions.
 *
 * Design Patterns:
 *   - Facade: Presents a clean, unified interface (onToggleFavorite, onRate, etc.)
 *     to the screen, hiding the complexity of Repository calls, error handling,
 *     and optimistic updates
 *   - Optimistic Update: Toggles favorite and ratings locally before Firestore
 *     persists, rolling back on error (classic pessimistic fallback)
 *   - Observer: Monitors audio player progress (via dependency array on
 *     audioPlayer.progress) to auto-track session completion at 80% playback
 *   - Gatekeeper: Checks authentication (isAnonymous) before allowing certain
 *     operations; anonymous users are prompted to sign in before favoriting
 *   - Cache Invalidation: Resets tracking refs (hasTrackedPlay, hasTrackedSession)
 *     when contentId changes, ensuring analytics doesn't double-count
 *   - Error Recovery: Firestore failures don't crash the UX; users can retry
 *
 * Key Responsibilities:
 *   1. Load user's favorite status and rating on mount
 *   2. Track listening history on first play
 *   3. Track session completion at 80% progress
 *   4. Provide optimistic toggle/rate/favorite/report handlers
 *   5. Gate paywall content and authentication-required features
 * ============================================================
 */

export interface UsePlayerBehaviorProps {
  contentId: string | undefined;
  contentType: string;
  audioPlayer: ReturnType<typeof useAudioPlayer>;
  title?: string;
  durationMinutes?: number;
  thumbnailUrl?: string;
}

export interface UsePlayerBehaviorReturn {
  // State
  isFavorited: boolean;
  userRating: RatingType | null;
  isLoadingUserData: boolean;

  // Handlers
  onToggleFavorite: () => Promise<void>;
  onPlayPause: () => Promise<void>;
  onRate: (rating: RatingType) => Promise<RatingType | null>;
  onReport: (category: ReportCategory, description?: string) => Promise<boolean>;
}

/**
 * usePlayerBehavior — Manages all user interactions and analytics for a content player.
 *
 * This hook loads and synchronizes user preferences (favorites, ratings) while
 * tracking playback analytics. It implements optimistic updates for immediate UX
 * feedback and defers Firestore persistence with error recovery.
 *
 * Props:
 *   - contentId: The Firestore doc ID of the content (partition key for queries)
 *   - contentType: Discriminator for polymorphic content (meditation, music, story)
 *   - audioPlayer: ReturnType<useAudioPlayer>, provides progress/duration/play/pause
 *   - title, durationMinutes, thumbnailUrl: Metadata for analytics
 *
 * @returns Object with state (isFavorited, userRating, isLoading) and handlers
 */
export function usePlayerBehavior({
  contentId,
  contentType,
  audioPlayer,
  title,
  durationMinutes,
  thumbnailUrl,
}: UsePlayerBehaviorProps): UsePlayerBehaviorReturn {
  const router = useRouter();
  const { user, isAnonymous } = useAuth();
  const { isPremium } = useSubscription();

  // --- Reactive State ---
  const [isFavoritedState, setIsFavoritedState] = useState(false);
  const [userRating, setUserRating] = useState<RatingType | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);

  // --- Tracking Refs (Cache Invalidation Pattern) ---
  // These prevent duplicate analytics events when dependencies change.
  // They are reset each time contentId changes (see effect below).
  const hasTrackedPlay = useRef(false);
  const hasTrackedSession = useRef(false);

  /**
   * --- Cache Invalidation (Reset Tracking Refs) ---
   *
   * When the user navigates to a different content item, we must reset the
   * tracking refs to avoid double-counting analytics events. This is the
   * Cache Invalidation pattern — clearing "cached" state when the primary key
   * (contentId) changes.
   */
  useEffect(() => {
    hasTrackedPlay.current = false;
    hasTrackedSession.current = false;
  }, [contentId]);

  /**
   * --- Load User Preferences (Favorite Status & Rating) ---
   *
   * On mount or when the user changes, fetch the user's existing favorite
   * status and rating for this content. This populates the UI with the correct
   * state so users see their previous interactions reflected immediately.
   *
   * Uses Promise.all for parallel queries (minor optimization: read two
   * documents concurrently instead of sequentially).
   *
   * Error Recovery: If the fetch fails, we still set isLoadingUserData = false
   * so the screen doesn't hang with a loading spinner. The default state
   * (favorited = false, rating = null) is a reasonable fallback.
   */
  useEffect(() => {
    async function loadUserData() {
      if (!user || !contentId) {
        setIsLoadingUserData(false);
        return;
      }

      setIsLoadingUserData(true);
      try {
        // Read-Through Cache pattern: fetch user's state from Firestore
        const [favorited, rating] = await Promise.all([
          isFavorite(user.uid, contentId),
          getUserRating(user.uid, contentId),
        ]);
        setIsFavoritedState(favorited);
        setUserRating(rating);
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Graceful Degradation: continue with default state (not favorited)
      } finally {
        setIsLoadingUserData(false);
      }
    }

    loadUserData();
  }, [user, contentId]);

  /**
   * --- Track Session Completion (Observer Pattern) ---
   *
   * When the user reaches 80% playback progress, automatically create a
   * session record in Firestore for analytics. This tracks which content
   * users "effectively consumed" (80% is generally considered "completed").
   *
   * The hasTrackedSession ref is a "fire once" gate: we set it to true
   * immediately after the first tracking call, so even if progress bounces
   * around >= 80%, we only count the session once.
   *
   * Dependencies on audioPlayer.progress drive this effect; whenever progress
   * changes, we check if we've crossed the 80% threshold.
   */
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
        // Fire-once gate: mark as tracked before the async call to prevent
        // multiple calls if progress keeps updating
        hasTrackedSession.current = true;

        try {
          // Optimistic Update: record the session immediately
          await createSession({
            user_id: user.uid,
            duration_minutes: durationMinutes,
            session_type: contentType as any,
          });
        } catch (error) {
          // Error Recovery: log but don't crash; the UX continues normally
          console.error('Failed to track session:', error);
        }
      }
    }

    trackSession();
  }, [audioPlayer.progress, audioPlayer.duration, user, contentId, contentType, durationMinutes]);

  /**
   * onToggleFavorite — Add or remove content from favorites (Optimistic Update).
   *
   * Workflow:
   *   1. Gatekeeper: Check if user is authenticated; anon users are prompted
   *   2. Optimistic Update: Immediately flip isFavoritedState locally
   *   3. Firestore: Call Repository's toggleFavorite (may take 1-2s)
   *   4. Sync: If server response differs from optimistic guess, correct it
   *   5. Error Recovery: On error, revert to previous state
   *
   * This pattern gives instant UI feedback while ensuring eventual consistency
   * with the server. If the network call fails, the UI reverts, and the user
   * can try again.
   *
   * Note: Anonymous users are prompted to sign in/link before favoriting.
   * This is a business logic gate — favorites require authentication.
   */
  const onToggleFavorite = useCallback(async () => {
    if (!user || !contentId) return;

    // --- Gatekeeper: Anonymous User Check ---
    // Anonymous users must upgrade to a real account to save preferences
    if (isAnonymous) {
      const isLinkMode = isPremium;
      Alert.alert(
        isLinkMode ? 'Link Account Required' : 'Sign In Required',
        isLinkMode
          ? 'Link your account to save favorites and sync across devices.'
          : 'Create an account to save favorites and sync across devices.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isLinkMode ? 'Link Account' : 'Sign In',
            onPress: () => router.push(isLinkMode ? '/login?mode=link' : '/login'),
          },
        ]
      );
      return;
    }

    // --- Optimistic Update: Assume success and update UI immediately ---
    const previousState = isFavoritedState;
    setIsFavoritedState(!previousState);

    try {
      // Persist to Firestore via Repository
      const newFavorited = await toggleFavorite(user.uid, contentId, contentType as any);

      // --- Sync: Correct if server response differs from optimistic guess ---
      // This handles edge cases like simultaneous updates from other devices
      if (newFavorited !== !previousState) {
        setIsFavoritedState(newFavorited);
      }
    } catch {
      // --- Error Recovery: Revert to previous state on failure ---
      // The user can tap again to retry; they're not left in an inconsistent state
      setIsFavoritedState(previousState);
    }
  }, [user, contentId, contentType, isAnonymous, isPremium, isFavoritedState, router]);

  /**
   * onPlayPause — Toggle playback and track listening history.
   *
   * On first play (fire-once via hasTrackedPlay ref), adds the content to the
   * user's listening history. Anonymous users are excluded from tracking.
   *
   * This is the Observer pattern applied to the useAudioPlayer:
   * we react to play/pause events and emit analytics side-effects.
   */
  const onPlayPause = useCallback(async () => {
    if (audioPlayer.isPlaying) {
      audioPlayer.pause();
    } else {
      audioPlayer.play();

      // --- Fire-once gate: Track listening history on first play ---
      // hasTrackedPlay prevents double-tracking if the user rapidly pauses/resumes
      if (!hasTrackedPlay.current && user && contentId && title && !isAnonymous) {
        hasTrackedPlay.current = true;

        try {
          // Optimistic Update: record immediately without awaiting
          await addToListeningHistory(
            user.uid,
            contentId,
            contentType as any,
            title,
            durationMinutes || 0,
            thumbnailUrl
          );
        } catch (error) {
          // Error Recovery: log but don't interrupt playback
          console.error('Failed to track listening history:', error);
        }
      }
    }
  }, [audioPlayer, user, contentId, contentType, title, durationMinutes, thumbnailUrl, isAnonymous]);

  /**
   * onRate — Rate content with toggle behavior (Optimistic Update).
   *
   * Behavior:
   *   - If the current rating equals the new rating, toggle it off (set to null)
   *   - Otherwise, set the new rating
   *
   * This implements a radio-button toggle pattern: clicking the same rating
   * twice clears it.
   *
   * Like onToggleFavorite, this uses Optimistic Update + Error Recovery:
   * the UI updates immediately, then we persist and sync with the server.
   */
  const onRate = useCallback(async (rating: RatingType): Promise<RatingType | null> => {
    if (!user || !contentId) return null;

    // Calculate expected new state optimistically
    const previousRating = userRating;
    const optimisticRating = previousRating === rating ? null : rating;

    // --- Optimistic Update: Assume success ---
    setUserRating(optimisticRating);

    try {
      // Persist to Firestore
      const serverRating = await setContentRating(user.uid, contentId, contentType, rating);

      // --- Sync: Correct if server response differs ---
      if (serverRating !== optimisticRating) {
        setUserRating(serverRating);
      }
      return serverRating;
    } catch {
      // --- Error Recovery: Revert to previous state ---
      setUserRating(previousRating);
      return previousRating;
    }
  }, [user, contentId, contentType, userRating]);

  /**
   * onReport — Submit a content report to moderation (Facade).
   *
   * Delegates directly to the Repository's reportContent function. This is
   * a thin wrapper that checks authentication and marshals the contentId
   * and contentType from the hook's scope into the Repository call.
   *
   * Reports are not optimistically updated — we let the async call complete
   * and inform the user of success/failure via an Alert in the screen layer.
   */
  const onReport = useCallback(async (category: ReportCategory, description?: string): Promise<boolean> => {
    if (!user || !contentId) return false;

    try {
      return await reportContent(user.uid, contentId, contentType, category, description);
    } catch (error) {
      // Error Recovery: log and let the caller handle the error
      console.error('Failed to report content:', error);
      throw error;
    }
  }, [user, contentId, contentType]);

  return {
    // --- State ---
    isFavorited: isFavoritedState,
    userRating,
    isLoadingUserData,
    // --- Handlers ---
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  };
}
