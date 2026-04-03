/**
 * ============================================================
 * downloadService.ts — Offline Download Manager (Facade + Cache-Aside)
 * ============================================================
 *
 * Architectural Role:
 *   This module is a Facade that abstracts the complexity of managing offline
 *   content downloads for Calmdemy's offline-first capability. It coordinates
 *   three concerns: (1) file I/O via expo-file-system, (2) metadata persistence
 *   via AsyncStorage, and (3) download lifecycle management (progress tracking,
 *   resumable downloads, cancellation).
 *
 * Design Patterns:
 *   - Facade: Provides a simple, cohesive API (downloadAudio, deleteDownload, etc.)
 *     that hides the orchestration of file system, storage, and networking APIs.
 *   - Cache-Aside: The downloadAudio function checks if content is already
 *     cached locally before fetching; callers can then use getLocalAudioPath
 *     to read from cache instead of streaming from the network.
 *   - State Machine: Active downloads are tracked in-memory and transitioned
 *     through states: pending → in-progress → complete (or failed).
 *   - Repository-ish: While not a true Firestore repository, this module
 *     encapsulates all offline-storage access, providing a single point of change
 *     if Calmdemy ever swaps storage backends (e.g., SQLite for more complex queries).
 *
 * Key Dependencies:
 *   - expo-file-system (local filesystem access, resumable downloads)
 *   - @react-native-async-storage (lightweight metadata persistence)
 *
 * Consumed By:
 *   - useAudioPlayer hook: Checks isDownloaded() to decide between local
 *     playback (getLocalAudioPath) and streaming (network URL).
 *   - Screen components: Call downloadAudio, deleteDownload, getTotalStorageUsed
 *     to implement offline media management UI.
 * ============================================================
 */

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = '@calmdemy_downloads';
const DOWNLOADS_DIR = `${FileSystem.documentDirectory}downloads/`;

export interface DownloadedContent {
  contentId: string;
  contentType: string;
  title: string;
  duration_minutes: number;
  thumbnailUrl?: string;
  localPath: string;
  downloadedAt: number;
  fileSize: number;
  // Additional metadata for navigation
  parentId?: string; // courseId, seriesId, or albumId
  parentTitle?: string;
  audioPath?: string; // Original audio path for reference
}

// --- In-Memory State for Active Downloads ---
// These Maps track ongoing download operations so callers can observe progress
// and cancel downloads. Entries are added when downloadAudio() is called and
// removed when the download completes or fails.
const activeDownloads = new Map<string, FileSystem.DownloadResumable>();
const downloadProgressCallbacks = new Map<string, (progress: number) => void>();

/**
 * Ensure the downloads directory exists.
 *
 * Creates the `downloads/` subdirectory in the app's document directory on
 * first invocation. Subsequent calls are safe (idempotent) — we probe existence
 * before attempting creation. This is a Classic Guard Pattern — a defensive
 * check that prevents errors when the directory already exists.
 *
 * @internal Called by downloadAudio before any file I/O.
 */
async function ensureDownloadsDir(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

/**
 * Retrieve all downloaded content metadata from persistent storage.
 *
 * Queries AsyncStorage (the app's key-value store) for the serialized list of
 * downloaded items. This is part of the Cache-Aside pattern — after fetching
 * this list, callers can use getLocalAudioPath to check if a specific piece
 * of content is cached locally.
 *
 * Errors are logged but do not throw; instead, an empty array is returned.
 * This is a Graceful Degradation strategy — if storage is corrupted or
 * unavailable, the app continues to function (the offline features are simply
 * disabled until storage recovers).
 *
 * @returns Array of DownloadedContent metadata, or empty if none exist or
 *          if storage access fails.
 */
export async function getDownloadedContent(): Promise<DownloadedContent[]> {
  try {
    const data = await AsyncStorage.getItem(DOWNLOADS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting downloaded content:', error);
    return [];
  }
}

/**
 * Persist the list of downloaded content metadata to AsyncStorage.
 *
 * Called after successful downloads and after deletions to keep the metadata
 * index in sync with the actual files on disk. Like getDownloadedContent,
 * errors are logged but do not throw — a failed write is treated as non-fatal.
 *
 * @internal This is a write-through pattern — changes are committed to storage
 *           immediately, ensuring metadata never gets out of sync with the
 *           filesystem (e.g., if the app crashes).
 *
 * @param downloads - The array of DownloadedContent to serialize and persist.
 */
async function saveDownloadedContent(downloads: DownloadedContent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(downloads));
  } catch (error) {
    console.error('Error saving downloaded content:', error);
  }
}

/**
 * Check if a piece of content is downloaded and available for offline playback.
 *
 * Performs a two-step validation: (1) lookup the contentId in the metadata index
 * (AsyncStorage), and (2) probe the filesystem to confirm the file still exists.
 * The second step is crucial — if a user manually deleted a file from their device
 * via a file manager, we discover the mismatch and return false, prompting the UI
 * to re-download or fall back to streaming.
 *
 * This is a Read-Through Cache pattern with **validation**: we trust the cache
 * (metadata) but verify its backing store (the actual file) to detect staleness.
 *
 * @param contentId - The unique identifier of the content to check.
 * @returns true if both metadata exists AND the file is present on disk;
 *          false otherwise.
 */
export async function isDownloaded(contentId: string): Promise<boolean> {
  const downloads = await getDownloadedContent();
  const download = downloads.find(d => d.contentId === contentId);
  if (!download) return false;

  // --- Verification step: confirm the file still physically exists on disk ---
  // Without this check, stale metadata could return true for a file that was
  // deleted manually or by the OS due to storage pressure.
  const fileInfo = await FileSystem.getInfoAsync(download.localPath);
  return fileInfo.exists;
}

/**
 * Retrieve the local filesystem path for a downloaded content.
 *
 * This function is the key part of the Cache-Aside pattern: after checking
 * that content is downloaded (via isDownloaded), the caller can use this function
 * to get the actual file path, which can then be passed directly to the audio
 * player to play offline without network access.
 *
 * Like isDownloaded, this validates both metadata and filesystem state. If the
 * file is missing, it returns null and the caller should fall back to streaming.
 *
 * @param contentId - The unique identifier of the content.
 * @returns The filesystem path (file://) to the downloaded audio, or null if
 *          not found or if the file has been deleted.
 */
export async function getLocalAudioPath(contentId: string): Promise<string | null> {
  const downloads = await getDownloadedContent();
  const download = downloads.find(d => d.contentId === contentId);
  if (!download) return null;

  // --- Verify file exists before returning the path ---
  // Protects against race conditions and manual filesystem deletions.
  const fileInfo = await FileSystem.getInfoAsync(download.localPath);
  if (!fileInfo.exists) return null;

  return download.localPath;
}

/**
 * Download audio content for offline use.
 *
 * This is the core orchestration function. It manages the full lifecycle of a
 * download: (1) ensure the directory exists, (2) check if already cached (idempotent),
 * (3) create a resumable download task, (4) stream progress to a callback,
 * (5) persist metadata to AsyncStorage, and (6) clean up in-memory state.
 *
 * The function implements several important patterns:
 *   - **Idempotent**: Calling this twice with the same contentId is safe — the
 *     second call detects that the file exists and returns true immediately.
 *   - **Progress Observable**: onProgress callbacks allow the UI to show a
 *     download progress bar in real time.
 *   - **Resumable Transfers**: expo-file-system's createDownloadResumable supports
 *     pausing and resuming interrupted downloads (see cancelDownload).
 *   - **Error Resilience**: Errors are logged but do not propagate; instead,
 *     false is returned, allowing the UI to retry or show a user-friendly message.
 *
 * @param contentId - Unique identifier (used as the local filename base).
 * @param contentType - Discriminator tag (e.g., "meditation", "soundscape") for filtering.
 * @param audioUrl - The remote URL to download from (with potential query params).
 * @param metadata - Rich content metadata (title, duration, thumbnails, etc.)
 *                   stored alongside the download for UI rendering without
 *                   needing to re-fetch from Firestore.
 * @param onProgress - Optional callback invoked as bytes are downloaded.
 *                     Receives a value from 0–100 (percentage complete).
 * @returns true if the download succeeded (or was already cached); false if
 *          an error occurred.
 */
export async function downloadAudio(
  contentId: string,
  contentType: string,
  audioUrl: string,
  metadata: {
    title: string;
    duration_minutes: number;
    thumbnailUrl?: string;
    parentId?: string;
    parentTitle?: string;
    audioPath?: string;
  },
  onProgress?: (progress: number) => void
): Promise<boolean> {
  try {
    await ensureDownloadsDir();

    // --- Phase 1: Extract file extension and derive the local path ---
    // We parse the URL to extract the file extension, stripping off query
    // parameters (e.g., ?token=xyz) that might be appended by CDN URLs.
    // Fallback to 'mp3' if no extension is found. Using contentId as the
    // filename ensures uniqueness and makes cache lookup O(1).
    const extension = audioUrl.split('.').pop()?.split('?')[0] || 'mp3';
    const localPath = `${DOWNLOADS_DIR}${contentId}.${extension}`;

    // --- Phase 2: Idempotency check (Cache-Aside) ---
    // If this content is already downloaded and the file exists, return
    // immediately. This prevents redundant network requests and respects
    // the user's existing local cache.
    const existingDownload = await isDownloaded(contentId);
    if (existingDownload) {
      return true;
    }

    // --- Phase 3: Register progress callback ---
    // Store the callback in a Map so the download progress handler (below)
    // can find it and invoke it with updated percentages.
    if (onProgress) {
      downloadProgressCallbacks.set(contentId, onProgress);
    }

    // --- Phase 4: Create resumable download task ---
    // expo-file-system provides resumable downloads, meaning they can be
    // paused/resumed without starting over. The progress handler fires
    // repeatedly as chunks arrive, allowing real-time UI updates.
    const downloadResumable = FileSystem.createDownloadResumable(
      audioUrl,
      localPath,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        const callback = downloadProgressCallbacks.get(contentId);
        if (callback) {
          callback(Math.round(progress * 100));
        }
      }
    );

    // --- Phase 5: Track active download (needed for cancellation) ---
    // Store a reference so cancelDownload can find and pause this task.
    activeDownloads.set(contentId, downloadResumable);

    // --- Phase 6: Execute the download ---
    const result = await downloadResumable.downloadAsync();

    // --- Phase 7: Clean up in-memory state ---
    // Remove the download from the active set and the progress callback.
    // This must happen regardless of success/failure.
    activeDownloads.delete(contentId);
    downloadProgressCallbacks.delete(contentId);

    if (!result || !result.uri) {
      return false;
    }

    // --- Phase 8: Query file metadata (size) ---
    // We record the file size for storage accounting (getTotalStorageUsed).
    // Cast to 'any' because expo-file-system's types are loose.
    const fileInfo = await FileSystem.getInfoAsync(result.uri);
    const fileSize = (fileInfo as any).size || 0;

    // --- Phase 9: Persist metadata (write-through) ---
    // Build a DownloadedContent record and append it to the AsyncStorage index.
    // If an entry with the same contentId already exists (unlikely given our
    // idempotency check above, but possible in edge cases), we remove the old
    // entry first to avoid duplicates.
    const downloads = await getDownloadedContent();
    const newDownload: DownloadedContent = {
      contentId,
      contentType,
      title: metadata.title,
      duration_minutes: metadata.duration_minutes,
      thumbnailUrl: metadata.thumbnailUrl,
      localPath: result.uri,
      downloadedAt: Date.now(),
      fileSize,
      parentId: metadata.parentId,
      parentTitle: metadata.parentTitle,
      audioPath: metadata.audioPath,
    };

    const updatedDownloads = downloads.filter(d => d.contentId !== contentId);
    updatedDownloads.push(newDownload);
    await saveDownloadedContent(updatedDownloads);

    return true;
  } catch (error) {
    console.error('Error downloading audio:', error);
    // --- Defensive cleanup: ensure in-memory state is cleared even on error ---
    activeDownloads.delete(contentId);
    downloadProgressCallbacks.delete(contentId);
    return false;
  }
}

/**
 * Cancel an in-progress download.
 *
 * Pauses the resumable download task using expo-file-system's pauseAsync.
 * The partial file remains on disk, allowing the user to resume the download
 * later (though Calmdemy currently does not expose a resume API — it would
 * require re-invoking downloadAudio with the same contentId).
 *
 * Errors during cancellation are swallowed — this is a best-effort operation
 * that prioritizes always cleaning up in-memory state, even if the pause
 * request fails.
 *
 * @param contentId - The unique identifier of the download to cancel.
 */
export async function cancelDownload(contentId: string): Promise<void> {
  const download = activeDownloads.get(contentId);
  if (download) {
    try {
      await download.pauseAsync();
    } catch (error) {
      // Ignore errors when canceling — we'll clean up state regardless.
    }
    activeDownloads.delete(contentId);
    downloadProgressCallbacks.delete(contentId);
  }
}

/**
 * Check if a download is currently in progress.
 *
 * A simple in-memory lookup — returns true only if downloadAudio was called
 * for this contentId and has not yet completed or failed. Useful for the UI
 * to show a "Downloading..." indicator or disable the download button while
 * a transfer is underway.
 *
 * @param contentId - The unique identifier to check.
 * @returns true if a download task is active; false otherwise.
 */
export function isDownloading(contentId: string): boolean {
  return activeDownloads.has(contentId);
}

/**
 * Delete a downloaded piece of content (both file and metadata).
 *
 * Performs a two-phase deletion: (1) deletes the audio file from the filesystem
 * (if it exists), and (2) removes the metadata from AsyncStorage. The function
 * is idempotent — if the content is not found or the file is already gone,
 * it returns true without error.
 *
 * This implements a careful Cleanup pattern: before deleting from metadata,
 * we check that the file exists on disk. This guards against a subtle bug
 * where metadata might reference a file that was manually deleted, and we
 * want to clean up the stale metadata even if the file is already gone.
 *
 * @param contentId - The unique identifier of the download to delete.
 * @returns true if deletion succeeded (or content was not found); false if
 *          an unexpected error occurred.
 */
export async function deleteDownload(contentId: string): Promise<boolean> {
  try {
    const downloads = await getDownloadedContent();
    const download = downloads.find(d => d.contentId === contentId);

    if (download) {
      // --- Phase 1: Delete the file from the filesystem ---
      const fileInfo = await FileSystem.getInfoAsync(download.localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(download.localPath);
      }

      // --- Phase 2: Remove the metadata entry ---
      const updatedDownloads = downloads.filter(d => d.contentId !== contentId);
      await saveDownloadedContent(updatedDownloads);
    }

    return true;
  } catch (error) {
    console.error('Error deleting download:', error);
    return false;
  }
}

/**
 * Delete all downloaded content at once.
 *
 * Bulk delete operation that removes all audio files and clears the metadata
 * index. Useful for "Clear All Downloads" features in settings. The function
 * is resilient: if a single file deletion fails, it continues deleting the
 * rest (Fault Tolerance pattern). Only if the final saveDownloadedContent
 * fails does the entire function return false.
 *
 * @returns true if all deletions succeeded; false if an unexpected error
 *          occurred (though individual file deletions may have succeeded).
 */
export async function deleteAllDownloads(): Promise<boolean> {
  try {
    const downloads = await getDownloadedContent();

    // --- Phase 1: Delete all files with per-file error isolation ---
    // Each file deletion is wrapped in try-catch so that if one fails,
    // we continue with the rest. This is a best-effort cleanup strategy.
    for (const download of downloads) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(download.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(download.localPath);
        }
      } catch (error) {
        // Continue deleting other files — don't abort the entire operation.
      }
    }

    // --- Phase 2: Clear the metadata index ---
    await saveDownloadedContent([]);

    return true;
  } catch (error) {
    console.error('Error deleting all downloads:', error);
    return false;
  }
}

/**
 * Calculate the total disk space used by all downloaded content.
 *
 * Sums the fileSize field across all entries in the metadata index.
 * Used by the storage management UI to show "X.XX GB of downloads".
 * This is a simple aggregation — it does NOT re-scan the filesystem,
 * so it is fast but depends on accurate metadata. If metadata is stale
 * (e.g., due to a crash during download), the returned value may be
 * slightly off.
 *
 * @returns Total bytes used by all downloads. Returns 0 if no downloads exist.
 */
export async function getTotalStorageUsed(): Promise<number> {
  const downloads = await getDownloadedContent();
  return downloads.reduce((total, d) => total + d.fileSize, 0);
}

/**
 * Format a byte count as a human-readable string (e.g., "1.2 MB").
 *
 * Uses logarithmic math to determine the appropriate unit (B, KB, MB, GB)
 * and formats the value to one decimal place. Used throughout the UI to
 * display file sizes in storage management screens.
 *
 * @param bytes - The size in bytes.
 * @returns A formatted string like "42.5 MB" or "0 B".
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Retrieve the IDs of all downloads matching a specific content type.
 *
 * Filters the metadata index by contentType (e.g., "meditation", "soundscape")
 * and returns the contentIds as a Set for O(1) membership testing. Used by
 * screens to quickly determine which pieces of content in a given category
 * are downloaded, allowing them to show badges or disable download buttons
 * appropriately.
 *
 * @param contentType - The content type discriminator to filter by.
 * @returns A Set of contentIds matching the type. Returns an empty Set if
 *          no downloads of that type exist.
 */
export async function getDownloadedContentIds(contentType: string): Promise<Set<string>> {
  const downloads = await getDownloadedContent();
  const ids = downloads.filter(d => d.contentType === contentType).map(d => d.contentId);
  return new Set(ids);
}
