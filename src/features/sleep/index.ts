/**
 * features/sleep/index.ts — Public API
 *
 * Screens (consumed by route files), the sleep query hooks, and the manifest.
 * Domain types (NatureSound / BedtimeStory / SleepStory) live in ./types,
 * relocated from src/types/index.ts in 6d-4.
 */
export { SleepHomeScreen } from './screens/SleepHomeScreen';
export { BedtimeStoryPlayerScreen } from './screens/BedtimeStoryPlayerScreen';
export { SleepMeditationPlayerScreen } from './screens/SleepMeditationPlayerScreen';
export { BedtimeStoriesScreen } from './screens/BedtimeStoriesScreen';
export { SleepMeditationsScreen } from './screens/SleepMeditationsScreen';
export { useBedtimeStories, useSleepMeditations, useSeries } from './hooks/queries';
// Single-item resolvers surfaced for library's polymorphic content resolver
// (api/content.ts), consumed through this public index (Phase 8: feature →
// feature is allowed via index.ts only).
export { getSleepMeditationById } from './api/sleepMeditations';
export { getSeries } from './api/series';
export { manifest } from './manifest';
