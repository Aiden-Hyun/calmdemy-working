/**
 * ============================================================
 * services/downloadService.ts — Barrel (transitional)
 * ============================================================
 *
 * The implementation moved to features/downloads/api/downloadService.ts in
 * Phase 6c. This thin re-export keeps the broadly-shared low-level download
 * helpers reachable from a neutral path so that shared/ modules
 * (shared/lists/AudioListScreen, shared/media-player/TrackPlayerScreen),
 * core/auth (AuthContext.deleteAccount), and the not-yet-migrated music/sleep/
 * meditation list screens don't have to import from a feature — which would
 * invert the features → shared → core dependency direction.
 *
 * Same pattern as the firestoreService barrel. It can be deleted once those
 * low-level helpers are promoted to core/ (a Phase 6d/later decision); until
 * then the downloads feature owns the implementation and everyone else reads
 * it through here.
 * ============================================================
 */

export * from '../features/downloads/api/downloadService';
