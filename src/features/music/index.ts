/**
 * features/music/index.ts — Public API
 *
 * Screens (consumed by route files), the music query hooks, and the manifest.
 * The looping ambient-sound player component is LoopingSoundScreen (renamed
 * from SoundPlayer in 6d-4); it stays internal to this feature, consumed only
 * by SoundPlayerScreen. useSleepSounds is consumed through this public index by
 * TrackPlayerScreen, which injects the list into the shared BackgroundAudioPicker
 * (6d-2 inverted that coupling and deleted the old src/hooks/queries/useMusicQueries
 * barrel).
 */
export { MusicHomeScreen } from './screens/MusicHomeScreen';
export { SoundPlayerScreen } from './screens/SoundPlayerScreen';
export { MusicListScreen } from './screens/MusicListScreen';
export { WhiteNoiseListScreen } from './screens/WhiteNoiseListScreen';
export { NatureSoundsListScreen } from './screens/NatureSoundsListScreen';
export { AsmrListScreen } from './screens/AsmrListScreen';
export {
  useSleepSounds,
  useWhiteNoise,
  useMusic,
  useAsmr,
  useAlbums,
} from './hooks/queries';
// getSleepSoundById surfaced for the shared/media-player background-sound
// controller when the firestoreService barrel was deleted (Phase 6e-B).
export { getSleepSoundById } from './api/sleepSounds';
// getAlbums surfaced for library's polymorphic content resolver
// (api/content.ts), consumed through this public index (Phase 8: feature →
// feature is allowed via index.ts only).
export { getAlbums } from './api/albums';
export { manifest } from './manifest';
