/**
 * ============================================================
 * QueryProvider.tsx — React Query Configuration & Persistence
 * ============================================================
 *
 * Architectural Role:
 *   This module configures React Query (TanStack Query) with explicit-invalidation
 *   semantics suitable for a content app where data changes from defined user
 *   actions (purchase, favorite, complete) rather than at unpredictable times:
 *   never-stale queries, 24-hour cache lifetime, and persistent cache via
 *   AsyncStorage for offline resilience.
 *
 * Design Patterns:
 *   - Provider Pattern: Wraps the app in PersistQueryClientProvider
 *     to inject query client and caching logic into all descendants.
 *   - Explicit Invalidation: staleTime is Infinity, so React Query never
 *     auto-refetches in the background. Mutations are responsible for
 *     invalidating affected query keys so subsequent reads refetch. This
 *     keeps cold-start fast and reduces unnecessary Firestore reads.
 *   - Persistence: AsyncStorage persists successful queries. On cold start,
 *     hydrates from disk before any fetch so the app displays cached data
 *     immediately while consumers decide whether to invalidate.
 *   - Selective Dehydration: Only successful queries with non-null data
 *     are persisted; failed queries are discarded to prevent stale errors.
 *
 * Key Dependencies:
 *   - @tanstack/react-query: Core caching and server state management
 *   - @tanstack/react-query-persist-client: Persistence layer
 *   - AsyncStorage: Local disk persistence
 *
 * Consumed By:
 *   Root app shell. Every feature that uses useQuery() hooks
 *   automatically inherits these defaults and persistence.
 * ============================================================
 */

import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Query Client Configuration ---

/**
 * Singleton QueryClient with app-wide defaults.
 *
 * Configuration:
 *   - staleTime: Infinity. Queries never auto-refetch; mutations must call
 *     queryClient.invalidateQueries(key) when they change data the UI is
 *     reading. This trades automatic freshness for explicit, predictable
 *     refetches — appropriate for a content app where most reads are
 *     long-lived (catalog, narrators, course structure).
 *   - gcTime: 24 hours. Cache entries older than 24h are garbage-collected.
 *   - retry: 2 attempts. Failed requests retry twice before giving up.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity, // Only refetch when explicitly invalidated by mutations
      gcTime: 1000 * 60 * 60 * 24, // 24 hours: must be >= maxAge for persistence
      retry: 2, // Retry failed requests twice
    },
  },
});

// --- Persistence Configuration ---

/**
 * AsyncStorage persister for React Query.
 *
 * Saves successful queries to disk and restores on app cold start.
 * This is a Read-Through Cache: on startup, queries are hydrated from
 * disk before any network fetch, so the app displays cached data immediately
 * while fetching fresh data in the background.
 */
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'calmdemy-query-cache',
});

/**
 * Provider component that wraps the app with React Query client and persistence.
 *
 * On app startup, hydrates cached queries from AsyncStorage. Subsequent queries
 * are cached in memory and persisted to disk after each successful fetch.
 * Failed/cancelled queries are not persisted (only success + data).
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // Cache persists for 24 hours
        // Cache-buster: bump this string to discard the entire persisted cache
        // on the next cold start. Needed here because the data-access layer
        // swallows errors into `[]` (graceful degradation), so a transient
        // failure (e.g. a Firestore permission blip) gets cached as a
        // *successful* empty result and — with staleTime: Infinity — never
        // refetches. Bumping the buster clears any such poisoned entries.
        buster: '2026-06-content-rules-fix',
        dehydrateOptions: {
          /**
           * Selective dehydration: only persist queries that have succeeded
           * and have data. Skip failed, loading, or empty queries to prevent
           * serving stale errors or null states on cold start.
           */
          shouldDehydrateQuery: (query) => {
            return query.state.status === 'success' && query.state.data !== undefined;
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
