import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import {
  getTodayQuote,
  getListeningHistory,
  getFavoritesWithDetails,
  getUserStats,
} from '../../services/firestoreService';
import { getDownloadedContent } from '../../services/downloadService';

export function useTodayQuote() {
  return useQuery({
    queryKey: ['todayQuote'],
    queryFn: getTodayQuote,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
}

export function useListeningHistory(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listeningHistory', user?.uid, limit],
    queryFn: () => getListeningHistory(user!.uid, limit),
    enabled: !!user?.uid,
  });
}

export function useFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['favorites', user?.uid],
    queryFn: () => getFavoritesWithDetails(user!.uid),
    enabled: !!user?.uid,
  });
}

export function useDownloadedContent() {
  return useQuery({
    queryKey: ['downloadedContent'],
    queryFn: getDownloadedContent,
  });
}

export function useUserStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['userStats', user?.uid],
    queryFn: () => getUserStats(user!.uid),
    enabled: !!user?.uid,
  });
}
