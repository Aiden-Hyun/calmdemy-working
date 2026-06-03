/**
 * ============================================================
 * features/downloads/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the downloads feature. Code outside
 * features/downloads/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - DownloadsScreen — rendered by app/downloads/index.tsx (route file)
 * - OfflinePlayerScreen — rendered by app/downloads/player.tsx (route file)
 * - useDownloadedContent — device-local downloaded-content query; consumed by
 *   Home once it migrates
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * Note on the download service: its implementation lives in
 * api/downloadService.ts but is intentionally NOT re-exported here. Its
 * low-level helpers are consumed by shared/ modules and core/auth, which must
 * not import from a feature — so those consumers read it through the neutral
 * barrel at src/services/downloadService.ts instead. DownloadButton (the
 * reusable control) lives in shared/downloads/, not this feature.
 * ============================================================
 */

export { DownloadsScreen } from './screens/DownloadsScreen';
export { OfflinePlayerScreen } from './screens/OfflinePlayerScreen';
export { useDownloadedContent } from './hooks/queries';
export { manifest } from './manifest';
