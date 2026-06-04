/**
 * ============================================================
 * features/emergency/hooks/queries.ts — Emergency Meditation Queries
 * ============================================================
 *
 * Architectural Role:
 *   React Query hook for the emergency feature's content. Emergency
 *   meditations are short, soothing sessions surfaced for moments of acute
 *   stress or anxiety. Relocated here from features/meditation in 6d-4 — the
 *   hook always belonged to the emergency feature, not meditation.
 *
 * Design Patterns:
 *   - Stale-While-Revalidate (SWR): caches for 1 hour, serving stale data
 *     while refetching in the background for reliable offline-first delivery.
 *   - Read-Through Cache: the queryFn reads through the firestoreService
 *     barrel (which re-exports this feature's own api/emergencyMeditations).
 *     Phase 6e collapses that indirection onto the feature api directly.
 *
 * Consumed By:
 *   HomeScreen (through this feature's public index) renders the emergency
 *   shortcut list.
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { getEmergencyMeditations } from '../../../services/firestoreService';

/**
 * Hook for fetching high-priority emergency/quick meditations.
 *
 * Emergency meditations are short, soothing sessions designed for moments of
 * acute stress or anxiety. This query caches them for 1 hour, prioritizing
 * quick availability over absolute freshness.
 *
 * @returns A React Query result containing the list of emergency meditations
 */
export function useEmergencyMeditations() {
  return useQuery({
    queryKey: ['emergencyMeditations'],
    queryFn: getEmergencyMeditations,
    // Stale-While-Revalidate: cache for 1 hour, then refetch in background.
    // This ensures the emergency meditation list is always available, even offline.
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
