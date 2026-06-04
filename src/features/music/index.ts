/**
 * features/music/index.ts — Public API
 *
 * Screens (consumed by route files), the music query hooks, and the manifest.
 * SoundPlayer kept its name (LoopingSoundScreen rename deferred). useSleepSounds
 * is consumed through this public index by TrackPlayerScreen, which injects the
 * list into the shared BackgroundAudioPicker (6d-2 inverted that coupling and
 * deleted the old src/hooks/queries/useMusicQueries barrel).
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
export { manifest } from './manifest';
