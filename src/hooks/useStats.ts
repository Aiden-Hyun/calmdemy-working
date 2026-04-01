import { useCallback } from 'react';
import { useUserStats } from './queries/useHomeQueries';

export function useStats() {
  const { data: stats, isLoading: loading, error, refetch } = useUserStats();

  const refreshStats = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    stats: stats ?? null,
    loading,
    error: error ? (error instanceof Error ? error.message : 'Failed to fetch stats') : null,
    refreshStats,
  };
}
