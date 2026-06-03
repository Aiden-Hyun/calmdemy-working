/**
 * ============================================================
 * features/library/hooks/queries.ts — Library data queries (SWR)
 * ============================================================
 *
 * The daily quote and the user's favorites — content queries the Home screen
 * renders. Drained from the legacy src/hooks/queries/useHomeQueries.ts in Phase
 * 6c (the last two hooks; the file is deleted once empty). They read library's
 * own api/ layer (quotes, content) rather than the firestoreService barrel.
 *
 * Consumed by Home via the library public index.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../core/auth/AuthContext';
import { getTodayQuote } from '../api/quotes';
import { getFavoritesWithDetails } from '../api/content';

/**
 * The daily featured quote. Global (no user partition), cached 24h.
 */
export function useTodayQuote() {
  return useQuery({
    queryKey: ['todayQuote'],
    queryFn: getTodayQuote,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

/**
 * The user's favorites with full metadata. User-partitioned; deferred until
 * the user is authenticated.
 */
export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', user?.uid],
    queryFn: () => getFavoritesWithDetails(user!.uid),
    enabled: !!user?.uid,
  });
}
