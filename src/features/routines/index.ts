/**
 * ============================================================
 * features/routines/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the routines feature. Code outside
 * features/routines/ may import ONLY the symbols re-exported here.
 *
 * - manifest — consumed by src/registry.ts
 * - RoutinesHomeScreen — consumed by the app/routines.tsx route file
 *
 * Add each screen as its route file is created; nothing else. Everything under
 * api/, hooks/, domain/, data/, components/, and types is private.
 * ============================================================
 */

export { RoutinesHomeScreen } from "./screens/RoutinesHomeScreen";
export { HabitEditorScreen } from "./screens/HabitEditorScreen";
export { manifest } from "./manifest";
