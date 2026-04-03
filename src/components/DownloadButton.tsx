import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import {
  isDownloaded,
  isDownloading,
  downloadAudio,
  cancelDownload,
  deleteDownload,
} from '../services/downloadService';

/**
 * ============================================================
 * DownloadButton.tsx — Audio Download Control (Controlled Component)
 * ============================================================
 *
 * Architectural Role:
 *   A Controlled Component that manages the download lifecycle for
 *   audio content (meditations, courses). It tracks three states:
 *   1. Not downloaded → show download icon
 *   2. Downloading → show spinner, allow cancel
 *   3. Downloaded → show checkmark, allow delete (long press)
 *
 *   Integrates with the downloadService (Model layer) to abstract
 *   filesystem operations. Coordinates with premium gates to prevent
 *   downloads of paid content by non-subscribers.
 *
 * Design Patterns:
 *   - Controlled Component: Parent controls enablement via
 *     isPremiumLocked, refreshKey props.
 *   - State Machine: Three distinct states (not downloaded, downloading,
 *     downloaded) drive the UI and available actions.
 *   - Callback Composition: onDownloadComplete, onPremiumRequired
 *     allow parent screens to react to download events without
 *     managing the download logic themselves.
 *
 * Key Dependencies:
 *   - downloadService (filesystem + metadata storage)
 *   - ThemeContext (colors)
 * ============================================================
 */

interface DownloadButtonProps {
  contentId: string;
  contentType: string;
  audioUrl: string;
  metadata: {
    title: string;
    duration_minutes: number;
    thumbnailUrl?: string;
    parentId?: string;
    parentTitle?: string;
    audioPath?: string;
  };
  size?: number;
  darkMode?: boolean;
  onDownloadComplete?: () => void;
  /** When this changes, the download status is re-checked */
  refreshKey?: number | string;
  /** If provided and returns true, the download will be blocked and this callback will be invoked instead */
  onPremiumRequired?: () => void;
  /** Whether this content requires premium (used with onPremiumRequired) */
  isPremiumLocked?: boolean;
}

export function DownloadButton({
  contentId,
  contentType,
  audioUrl,
  metadata,
  size = 24,
  darkMode = false,
  onDownloadComplete,
  refreshKey,
  onPremiumRequired,
  isPremiumLocked = false,
}: DownloadButtonProps) {
  const { theme, isDark } = useTheme();
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  // --- Color Theme ---
  // Respect both the darkMode prop (sleep page) and system dark mode.
  const useDarkColors = darkMode || isDark;

  // --- Status Check on Mount & Refresh ---
  // When contentId or refreshKey changes, re-check whether this content
  // is downloaded. This allows parent screens to invalidate the state
  // (e.g., after a successful download elsewhere) via refreshKey.
  useEffect(() => {
    checkDownloadStatus();
  }, [contentId, refreshKey]);

  /**
   * checkDownloadStatus — Query Download Service
   *
   * Queries downloadService for the current state: is this content
   * already cached locally? Is it currently downloading?
   */
  const checkDownloadStatus = async () => {
    const isAlreadyDownloaded = await isDownloaded(contentId);
    setDownloaded(isAlreadyDownloaded);
    setDownloading(isDownloading(contentId));
  };

  /**
   * handlePress — Multi-State Action Handler
   *
   * Routes to the correct action based on the current state:
   * 1. Premium locked? Invoke paywall.
   * 2. Already downloaded? Do nothing (delete is via long press).
   * 3. Currently downloading? Cancel.
   * 4. Not downloaded? Start download.
   */
  const handlePress = async () => {
    // --- Premium Gate ---
    // If this content requires a subscription and the user doesn't have one,
    // invoke the paywall callback and bail. This Gatekeeper pattern prevents
    // unauthorized downloads.
    if (isPremiumLocked && onPremiumRequired) {
      onPremiumRequired();
      return;
    }

    // --- Already Downloaded ---
    // Do nothing on tap. User must long-press to delete.
    if (downloaded) {
      return;
    }

    // --- Cancel In-Progress Download ---
    if (downloading) {
      await cancelDownload(contentId);
      setDownloading(false);
      setProgress(0);
      return;
    }

    // --- Start New Download ---
    setDownloading(true);
    setProgress(0);

    const success = await downloadAudio(
      contentId,
      contentType,
      audioUrl,
      metadata,
      (p) => setProgress(p)
    );

    setDownloading(false);
    setProgress(0);

    if (success) {
      setDownloaded(true);
      onDownloadComplete?.();
    }
  };

  /**
   * handleLongPress — Delete Downloaded Content
   *
   * Long-pressing a downloaded item removes it from the local cache.
   * This prevents accidental deletes while keeping the delete action
   * discoverable (gesture hint in the UI description).
   */
  const handleLongPress = async () => {
    if (downloaded) {
      await deleteDownload(contentId);
      setDownloaded(false);
    }
  };

  // --- Icon Colors ---
  const iconColor = useDarkColors
    ? theme.colors.sleepTextMuted
    : theme.colors.textMuted;
  const downloadedColor = '#4CAF50'; // Green checkmark

  // --- Downloading State: Show Spinner ---
  // Replaces the icon with an activity indicator while the download
  // progresses. Tapping cancels the download.
  if (downloading) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.button, { width: size + 16, height: size + 16 }]}
      >
        <View style={styles.progressContainer}>
          <ActivityIndicator size="small" color={iconColor} />
        </View>
      </TouchableOpacity>
    );
  }

  // --- Downloaded or Not Downloaded State ---
  // Shows either a green checkmark (downloaded) or a download icon (not downloaded).
  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={[styles.button, { width: size + 16, height: size + 16 }]}
    >
      <Ionicons
        name={downloaded ? 'checkmark-circle' : 'arrow-down-circle-outline'}
        size={size}
        color={downloaded ? downloadedColor : iconColor}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
