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
export { AbcExerciseScreen } from "./screens/AbcExerciseScreen";
export { SocraticExerciseScreen } from "./screens/SocraticExerciseScreen";
export { CoreBeliefsExerciseScreen } from "./screens/CoreBeliefsExerciseScreen";
export { DecatastrophizingExerciseScreen } from "./screens/DecatastrophizingExerciseScreen";
export { GratitudeExerciseScreen } from "./screens/GratitudeExerciseScreen";
export { CbtEntryDetailScreen } from "./screens/CbtEntryDetailScreen";
export { manifest } from "./manifest";
