import { useQuery } from '@tanstack/react-query';
import {
  getEmergencyMeditations,
  getCourses,
  getMeditations,
  getMeditationsByTheme,
  getMeditationsByTechnique,
} from '../../services/firestoreService';

export function useEmergencyMeditations() {
  return useQuery({
    queryKey: ['emergencyMeditations'],
    queryFn: getEmergencyMeditations,
    staleTime: 1000 * 60 * 60,
  });
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
    staleTime: 1000 * 60 * 60,
  });
}

export function useGuidedMeditations() {
  return useQuery({
    queryKey: ['guidedMeditations'],
    queryFn: getMeditations,
    staleTime: 1000 * 60 * 60,
  });
}

export function useMeditationsByTheme(theme: string) {
  return useQuery({
    queryKey: ['meditations', 'theme', theme],
    queryFn: () => theme === 'all' ? getMeditations() : getMeditationsByTheme(theme),
    staleTime: 1000 * 60 * 60,
  });
}

export function useMeditationsByTechnique(technique: string) {
  return useQuery({
    queryKey: ['meditations', 'technique', technique],
    queryFn: () => technique === 'all' ? getMeditations() : getMeditationsByTechnique(technique),
    staleTime: 1000 * 60 * 60,
  });
}
