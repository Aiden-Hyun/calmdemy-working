/**
 * ============================================================
 * features/routines/hooks/optimistic.ts — Optimistic-update helper
 * ============================================================
 *
 * Most routines mutations act on a single list-shaped React Query cache
 * (add / remove / patch an item). This helper builds the standard optimistic
 * trio for that case:
 *   - onMutate: cancel in-flight fetches, snapshot the cache, apply `apply`
 *     so the UI updates immediately.
 *   - onError: roll the snapshot back.
 *   - onSettled: invalidate (+ any extra keys) to reconcile with the server.
 *
 * Spread it into useMutation alongside `mutationFn`. Optimistic creates use a
 * `temp-…` id that the reconciling refetch replaces with the real doc.
 *
 * Mutations that touch more than one cache family (e.g. todos → flat list +
 * month caches, habit edit → list + detail) wire the trio inline instead.
 * ============================================================
 */

import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function optimisticList<TItem, TVars>(
  queryClient: QueryClient,
  key: QueryKey,
  apply: (list: TItem[], vars: TVars) => TItem[],
  extraInvalidate: QueryKey[] = []
) {
  return {
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<TItem[]>(key);
      queryClient.setQueryData<TItem[]>(key, (list) => apply(list ?? [], vars));
      return { prev };
    },
    onError: (_err: unknown, _vars: TVars, context: { prev: TItem[] | undefined } | undefined) => {
      if (context) queryClient.setQueryData(key, context.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      for (const extra of extraInvalidate) queryClient.invalidateQueries({ queryKey: extra });
    },
  };
}
