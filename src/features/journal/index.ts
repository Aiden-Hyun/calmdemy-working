/**
 * ============================================================
 * features/journal/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the journal feature. Code outside
 * features/journal/ may import ONLY the symbols re-exported here (Phase 8
 * makes this machine-checked).
 *
 * - manifest — consumed by src/registry.ts
 * - JournalHomeScreen / EntryDetailScreen — added as the screens land (the
 *   route files in app/journal* consume them).
 *
 * Everything else (api/, hooks/, data/, components/, NewEntryModal, types) is
 * private to the feature.
 * ============================================================
 */

export { JournalHomeScreen } from "./screens/JournalHomeScreen";
export { manifest } from "./manifest";
