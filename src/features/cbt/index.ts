/**
 * ============================================================
 * features/cbt/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the cbt feature. Code outside
 * features/cbt/ may import ONLY the symbols re-exported here (Phase 8 makes
 * this machine-checked).
 *
 * - manifest — consumed by src/registry.ts
 * - Screens (home, the five exercises, entry detail) — added as they land; the
 *   route files in app/cbt* consume them.
 *
 * Everything else (api/, hooks/, data/, components/, types) is private.
 * ============================================================
 */

export { CbtHomeScreen } from "./screens/CbtHomeScreen";
export { manifest } from "./manifest";
