/**
 * ============================================================
 * features/library/hooks/useFavoriteToggle.ts — Favorite state + toggle
 * ============================================================
 *
 * One slice of the former shared `usePlayerBehavior` god-hook, relocated to
 * the library feature in Phase 6d-3. Owns the favorite status for a piece of
 * content and the optimistic toggle handler, sourcing data from the library's
 * own `api/favorites`. Player screens compose this (via the public index)
 * alongside the rating/report/tracking hooks.
 *
 * Design Patterns:
 *   - Optimistic Update: flips local state before Firestore persists, syncing
 *     to the server response and reverting on error.
 *   - Gatekeeper: anonymous users are prompted to sign in / link before they
 *     can favorite (favorites require a real account).
 * ============================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../core/auth/AuthContext';
import { useSubscription } from '../../../core/subscription/SubscriptionContext';
import { isFavorite, toggleFavorite } from '../api/favorites';

export interface UseFavoriteToggleProps {
  contentId: string | undefined;
  contentType: string;
}

export interface UseFavoriteToggleReturn {
  isFavorited: boolean;
  onToggleFavorite: () => Promise<void>;
}

/**
 * useFavoriteToggle — favorite status + optimistic toggle for one content item.
 *
 * @param contentId - Firestore doc ID of the content (partition key)
 * @param contentType - Discriminator for polymorphic content
 */
export function useFavoriteToggle({
  contentId,
  contentType,
}: UseFavoriteToggleProps): UseFavoriteToggleReturn {
  const router = useRouter();
  const { user, isAnonymous } = useAuth();
  const { isPremium } = useSubscription();

  const [isFavoritedState, setIsFavoritedState] = useState(false);

  // Load the user's existing favorite status for this content on mount / change.
  useEffect(() => {
    async function loadFavorite() {
      if (!user || !contentId) return;
      try {
        const favorited = await isFavorite(user.uid, contentId);
        setIsFavoritedState(favorited);
      } catch (error) {
        // Graceful Degradation: keep the default (not favorited) on failure.
        console.error('Failed to load favorite status:', error);
      }
    }

    loadFavorite();
  }, [user, contentId]);

  const onToggleFavorite = useCallback(async () => {
    if (!user || !contentId) return;

    // Gatekeeper: anonymous users must upgrade to a real account first.
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

    // Optimistic Update: flip immediately, then reconcile with the server.
    const previousState = isFavoritedState;
    setIsFavoritedState(!previousState);

    try {
      const newFavorited = await toggleFavorite(user.uid, contentId, contentType as any);
      if (newFavorited !== !previousState) {
        setIsFavoritedState(newFavorited);
      }
    } catch {
      // Error Recovery: revert so the user can retry from a consistent state.
      setIsFavoritedState(previousState);
    }
  }, [user, contentId, contentType, isAnonymous, isPremium, isFavoritedState, router]);

  return {
    isFavorited: isFavoritedState,
    onToggleFavorite,
  };
}
