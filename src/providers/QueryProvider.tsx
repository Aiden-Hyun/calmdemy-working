/**
 * ============================================================
 * QueryProvider.tsx — React Query Configuration & Persistence
 * ============================================================
 *
 * Architectural Role:
 *   This module configures React Query (TanStack Query) with sensible
 *   defaults for a mobile meditation app: 5-minute stale time,
 *   24-hour cache lifetime, and persistent cache via AsyncStorage
 *   for offline resilience.
 *
 * Design Patterns:
 *   - Provider Pattern: Wraps the app in PersistQueryClientProvider
 *     to inject query client and caching logic into all descendants.
 *   - Cache Warming & Stale-While-Revalidate: staleTime = 5 minutes
 *     means data is fresh for 5 mins; after that, React Query marks
 *     it stale and refetches in the background while serving stale data.
 *   - Persistence (Read-Through Cache): AsyncStorage persists successful
 *     queries. On cold start, hydrates from disk before any fetch.
 *     This is the Read-Through Cache pattern applied to mobile.
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
 *   - staleTime: 5 minutes. After 5 mins, data is marked stale and
 *     React Query fetches fresh data in the background (Stale-While-Revalidate).
 *   - gcTime: 24 hours. Cache entries older than 24h are garbage-collected.
 *   - retry: 2 attempts. Failed requests retry twice before giving up.
 *
 * These defaults balance responsiveness (fresh data every 5 mins),
 * offline resilience (24h of cache), and bandwidth (don't retry aggressively).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30, // 30 minutes: user data rarely changes mid-session
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
