/**
 * ============================================================
 * features/library/hooks/useContentReport.ts — Content reporting
 * ============================================================
 *
 * One slice of the former shared `usePlayerBehavior` god-hook, relocated to
 * the library feature in Phase 6d-3. Owns the report handler for a piece of
 * content, sourcing from the library's own `api/ratings` (reports live in the
 * ratings module). Thin wrapper that marshals the current content identity
 * into the repository call; the screen layer surfaces success/failure.
 * ============================================================
 */

import { useCallback } from 'react';
import { useAuth } from '../../../core/auth/AuthContext';
import { ReportCategory } from '../../../types';
import { reportContent } from '../api/ratings';

export interface UseContentReportProps {
  contentId: string | undefined;
  contentType: string;
}

export interface UseContentReportReturn {
  onReport: (category: ReportCategory, description?: string) => Promise<boolean>;
}

/**
 * useContentReport — submit a moderation report for one content item.
 *
 * @param contentId - Firestore doc ID of the content (partition key)
 * @param contentType - Discriminator for polymorphic content
 */
export function useContentReport({
  contentId,
  contentType,
}: UseContentReportProps): UseContentReportReturn {
  const { user } = useAuth();

  const onReport = useCallback(
    async (category: ReportCategory, description?: string): Promise<boolean> => {
      if (!user || !contentId) return false;

      try {
        return await reportContent(user.uid, contentId, contentType, category, description);
      } catch (error) {
        // Surface the failure to the caller (screen shows an Alert).
        console.error('Failed to report content:', error);
        throw error;
      }
    },
    [user, contentId, contentType]
  );

  return { onReport };
}
