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
 * Note on the download service: its implementation was promoted to
 * core/downloads/downloadService.ts in Phase 6e-A. The helpers are pure
 * infrastructure (expo-file-system + AsyncStorage, no Firestore/feature logic)
 * and are consumed by shared/ modules and core/auth, which must not import from
 * a feature — so core/ is their correct home and every consumer (including this
 * feature's own hooks/screens) imports from there. DownloadButton (the reusable
 * control) lives in shared/downloads/, not this feature.
 * ============================================================
 */

export { DownloadsScreen } from './screens/DownloadsScreen';
export { OfflinePlayerScreen } from './screens/OfflinePlayerScreen';
export { useDownloadedContent } from './hooks/queries';
export { manifest } from './manifest';
