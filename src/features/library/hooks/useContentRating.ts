/**
 * ============================================================
 * features/library/hooks/useContentRating.ts — Rating state + toggle
 * ============================================================
 *
 * One slice of the former shared `usePlayerBehavior` god-hook, relocated to
 * the library feature in Phase 6d-3. Owns the user's rating for a piece of
 * content and the optimistic rate handler, sourcing data from the library's
 * own `api/ratings`.
 *
 * Design Patterns:
 *   - Optimistic Update: sets the rating locally before Firestore persists,
 *     syncing to the server response and reverting on error.
 *   - Radio Toggle: rating the same value twice clears it (sets null).
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { RatingType } from '../../../types';
import { getUserRating, setContentRating } from '../api/ratings';

export interface UseContentRatingProps {
  contentId: string | undefined;
  contentType: string;
}

export interface UseContentRatingReturn {
  userRating: RatingType | null;
  onRate: (rating: RatingType) => Promise<RatingType | null>;
}

/**
 * useContentRating — rating state + optimistic toggle for one content item.
 *
 * @param contentId - Firestore doc ID of the content (partition key)
 * @param contentType - Discriminator for polymorphic content
 */
export function useContentRating({
  contentId,
  contentType,
}: UseContentRatingProps): UseContentRatingReturn {
  const { user } = useAuth();

  const [userRating, setUserRating] = useState<RatingType | null>(null);

  // Load the user's existing rating for this content on mount / change.
  useEffect(() => {
    async function loadRating() {
      if (!user || !contentId) return;
      try {
        const rating = await getUserRating(user.uid, contentId);
        setUserRating(rating);
      } catch (error) {
        // Graceful Degradation: keep the default (unrated) on failure.
        console.error('Failed to load rating:', error);
      }
    }

    loadRating();
  }, [user, contentId]);

  const onRate = useCallback(
    async (rating: RatingType): Promise<RatingType | null> => {
      if (!user || !contentId) return null;

      // Radio toggle: re-selecting the current rating clears it.
      const previousRating = userRating;
      const optimisticRating = previousRating === rating ? null : rating;

      // Optimistic Update: assume success, reconcile with the server.
      setUserRating(optimisticRating);

      try {
        const serverRating = await setContentRating(user.uid, contentId, contentType, rating);
        if (serverRating !== optimisticRating) {
          setUserRating(serverRating);
        }
        return serverRating;
      } catch {
        // Error Recovery: revert to the previous rating.
        setUserRating(previousRating);
        return previousRating;
      }
    },
    [user, contentId, contentType, userRating]
  );

  return {
    userRating,
    onRate,
  };
}
