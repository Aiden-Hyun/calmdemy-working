/**
 * ============================================================
 * features/downloads/hooks/queries.ts — Downloads data queries (SWR)
 * ============================================================
 *
 * React Query hook for the downloads feature's device-local state. Split out
 * of the legacy src/hooks/queries/useHomeQueries.ts in Phase 6c (same partial-
 * split pattern as progress). Reads the feature's own api/ layer.
 *
 * Downloaded content is device-local (no Firestore sync, no auth guard), so the
 * cache key is global — all consumers read the same downloaded-content state.
 * Consumed by Home once it migrates (Phase 6c step 10).
 * ============================================================
 */

import { useQuery } from '@tanstack/react-query';
import { getDownloadedContent } from '../../../core/downloads/downloadService';

export function useDownloadedContent() {
  return useQuery({
    queryKey: ['downloadedContent'],
    queryFn: getDownloadedContent,
  });
}
