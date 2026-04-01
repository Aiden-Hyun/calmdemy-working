import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours (must be >= maxAge for persistence)
      retry: 2,
    },
  },
});

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'calmdemy-query-cache',
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24, // Cache persists for 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            // Only persist successful queries with data
            return query.state.status === 'success' && query.state.data !== undefined;
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
