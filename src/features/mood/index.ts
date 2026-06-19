/**
 * ============================================================
 * features/mood/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the mood feature. Code outside
 * features/mood/ may import ONLY the symbols re-exported here (Phase 8 makes
 * this machine-checked).
 *
 * - manifest — consumed by src/registry.ts
 * - MoodHomeScreen — added with the screen (the route file consumes it).
 *
 * Everything else (api/, hooks/, data/, components/, types) is private.
 * ============================================================
 */

export { MoodHomeScreen } from "./screens/MoodHomeScreen";
export { manifest } from "./manifest";
