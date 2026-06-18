/**
 * ============================================================
 * shared/media-player/hooks/useTrackDownload.ts — Offline download
 * ============================================================
 *
 * One slice of the TrackPlayerScreen orchestration extracted in Phase 6d-3.
 * Owns offline-download state for the current track: whether it is downloaded,
 * whether a download is in progress, the progress percentage, and the resolved
 * local thumbnail path (preferred over the remote URL for offline artwork).
 *
 * Sources the download primitives from core/downloads/downloadService (a shared
 * service, not a feature) — no feature dependency.
 * ============================================================
 */

import { useState, useEffect } from 'react';
import {
  isDownloaded,
  downloadAudio,
  isDownloading as checkIsDownloading,
  getLocalThumbnailPath,
} from '../../../core/downloads/downloadService';

export interface UseTrackDownloadProps {
  contentId?: string;
  contentType?: string;
  audioUrl?: string;
  title: string;
  durationMinutes: number;
  thumbnailUrl?: string;
  parentId?: string;
  parentTitle?: string;
  audioPath?: string;
}

export interface UseTrackDownloadReturn {
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  localThumbnail: string | null;
  handleDownload: () => Promise<void>;
}

/**
 * useTrackDownload — offline-download state + handler for one track.
 */
export function useTrackDownload({
  contentId,
  contentType,
  audioUrl,
  title,
  durationMinutes,
  thumbnailUrl,
  parentId,
  parentTitle,
  audioPath,
}: UseTrackDownloadProps): UseTrackDownloadReturn {
  const [isDownloadedState, setIsDownloadedState] = useState(false);
  const [isDownloadingState, setIsDownloadingState] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [localThumbnail, setLocalThumbnail] = useState<string | null>(null);

  // When content changes, check whether it's already downloaded and resolve
  // its cached thumbnail for offline artwork.
  useEffect(() => {
    async function checkDownloadStatus() {
      if (!contentId) return;
      const downloaded = await isDownloaded(contentId);
      setIsDownloadedState(downloaded);
      setIsDownloadingState(checkIsDownloading(contentId));
      if (downloaded) {
        const thumbPath = await getLocalThumbnailPath(contentId);
        setLocalThumbnail(thumbPath);
      } else {
        setLocalThumbnail(null);
      }
    }
    checkDownloadStatus();
  }, [contentId]);

  const handleDownload = async () => {
    // Guard clauses: fail silently if any required data is missing or in progress.
    if (!contentId || !contentType || !audioUrl || isDownloadingState || isDownloadedState) return;

    setIsDownloadingState(true);
    setDownloadProgress(0);

    const success = await downloadAudio(
      contentId,
      contentType,
      audioUrl,
      {
        title,
        duration_minutes: durationMinutes,
        thumbnailUrl,
        parentId,
        parentTitle,
        audioPath,
      },
      (progress) => setDownloadProgress(progress)
    );

    setIsDownloadingState(false);
    setDownloadProgress(0);
    if (success) {
      setIsDownloadedState(true);
      // Resolve the freshly-cached thumbnail so artwork updates immediately.
      if (contentId) {
        const thumbPath = await getLocalThumbnailPath(contentId);
        setLocalThumbnail(thumbPath);
      }
    }
  };

  return {
    isDownloaded: isDownloadedState,
    isDownloading: isDownloadingState,
    downloadProgress,
    localThumbnail,
    handleDownload,
  };
}
