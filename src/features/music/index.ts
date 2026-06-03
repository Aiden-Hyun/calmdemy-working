/**
 * features/music/index.ts — Public API
 *
 * Screens (consumed by route files), the music query hooks, and the manifest.
 * SoundPlayer kept its name (LoopingSoundScreen rename deferred). useMusicQueries
 * also has a transitional barrel at src/hooks/queries/useMusicQueries.ts for the
 * shared BackgroundAudioPicker consumer (6d inverts that coupling).
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
