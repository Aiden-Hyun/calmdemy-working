/**
 * hooks/queries/useMusicQueries.ts — Barrel (transitional)
 *
 * Implementation moved to features/music/hooks/queries.ts in Phase 6c. This
 * thin re-export keeps the neutral path for shared/media-player/
 * BackgroundAudioPicker (which consumes useSleepSounds) so shared/ doesn't
 * import from a feature. The real coupling inversion is Phase 6d.
 */
export * from '../../features/music/hooks/queries';
