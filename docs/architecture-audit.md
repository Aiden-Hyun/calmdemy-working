# Calmdemy Architecture Audit — Phase 0

Status: decisions locked, Phase 0a in progress
Scope: every `.ts`/`.tsx` file in `/app` and `/src` (110 files)
Goal: prepare for a Toss-style modular refactor so we can safely add many features (Journal/CBT, Mood, etc.) without the codebase rotting

---

## Locked decisions

**Tab structure (finalized)**
| Position | Tab | Houses |
|---|---|---|
| 1 | **Home** | personalized today |
| 2 | **Library** | passive audio: meditations, music, sleep stories, sleep meditations, ASMR, white noise, nature sounds, albums/series/courses |
| 3 | **Tools** | active engagement: breathing, journal/CBT (when built), mood check-in (when built), gratitude, active meditation sessions |
| 4 | **Profile** | identity, stats summary, settings, account |
| 5 | **Discover** | full feature shelf — every feature listed by category, with search |

**Naming resolution: Library tab vs `features/library/` module**
The Library tab IS the library feature. `features/library/` owns both the tab home screen and the album/series/course collection screens. Individual content data still lives in feature modules (`features/meditation/data`, `features/music/data`, `features/sleep/data`); the Library tab composes them via React Query hooks.

**Other decisions**
- Delete on confirmation: `MeditationCard`, `MeditationTimer`, `PremiumGate`. Keep `ProgressRing` as a primitive.
- `AccountSwitchConfirmModal`: defer to Phase 6 (auth migration). Audit agent missed that login.tsx imports it. Will consolidate with `AccountSwitchWarning` then.
- `SleepTimerContext`: shared, not sleep-only. Used by every player that goes through `MediaPlayer` (meditation, sleep, library content, emergency, downloads). Moves to `shared/media-player/`, rename to `PlaybackTimerContext`.
- Music single-item player: add `getSoundById`, adopt `usePlayerBehavior`.
- Renames: `AudioPlayer → AudioControls`, `MediaPlayer → TrackPlayerScreen`, `SoundPlayer → LoopingSoundScreen`.
- `ReportModal`: goes to `shared/modals/` (reusable across features).
- List-screen template: one shared `shared/lists/AudioListScreen.tsx` used by every feature.
- ESLint boundary violations: **hard errors** (refuses to compile).

---

## Phase 0a progress

**Chunk 1 — DONE (this turn)**
- ✅ Deleted: `src/components/MeditationCard.tsx`, `src/components/MeditationTimer.tsx`, `src/components/PremiumGate.tsx`, `app/meditations/technique/_layout.tsx`, `app/sleep-sounds.tsx`
- ✅ Removed `sleep-sounds` Stack.Screen from `app/_layout.tsx`
- ✅ Stripped 16 debug telemetry fetches from `app/login.tsx` (8), `src/contexts/AuthContext.tsx` (5), `src/components/AccountPromptModal.tsx` (3)
- ✅ Removed stale `MeditationCard` mention from `ContentCard.tsx` JSDoc
- ✅ Moved `src/data/seedContent.ts` → `scripts/seed/seedContent.ts`; removed empty `src/data/` directory
- ✅ Added `"exclude": ["scripts/**", "node_modules"]` to `tsconfig.json`
- ✅ TypeScript: no new errors introduced (24 pre-existing errors flagged separately for triage)

**Chunk 2 — DONE (this turn)**
- ✅ Added `requireEnv` / `getEnv` / `getEnvList` helpers at `src/utils/env.ts` — fail-fast on missing config with helpful errors
- ✅ Migrated RevenueCat SDK keys (`SubscriptionContext.tsx`) to `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` / `_ANDROID`
- ✅ Migrated Google OAuth client IDs (`AuthContext.tsx`) to `EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID` / `_IOS_CLIENT_ID`
- ✅ Migrated Firebase config (`firebase.ts`) to `EXPO_PUBLIC_FIREBASE_*`
- ✅ Migrated admin UID allowlist (`SubscriptionContext.tsx`) to comma-separated `EXPO_PUBLIC_ADMIN_UIDS`
- ✅ Created `.env` (real values, gitignored) and overwrote stale Supabase-era `.env.example` with the current Firebase + RevenueCat + OAuth structure
- ✅ Expanded `.gitignore`: `.env*.local`, `.DS_Store`, `.expo/`, `node_modules/`
- ✅ Verified: zero hardcoded secrets remain in source; no new TypeScript errors

**Note:** these "secrets" are not cryptographic — Firebase apiKey, RevenueCat SDK keys, and OAuth client IDs are public client identifiers by design. The migration win is hygiene + flexibility (dev/staging/prod separation, rotation without code edits), not security per se.

**Chunk 3 — DONE (this turn)**
- ✅ Added `src/constants/storageKeys.ts` with `ONBOARDING_KEY` and `THEME_MODE_KEY` exports
- ✅ Added `src/utils/guestNickname.ts` extracting the 16-line nickname helper that was duplicated in home + profile
- ✅ Replaced inline `ONBOARDING_KEY` string literals in `app/index.tsx` and `app/onboarding.tsx` with the constant
- ✅ Replaced inline `generateGuestNickname` functions in `app/(tabs)/home.tsx` and `app/(tabs)/profile.tsx` with the imported helper
- ✅ Deleted the redundant `fonts` const export from `src/hooks/useFonts.ts` (nothing imports it — all consumers use `theme.fonts.*` via `useTheme()`)
- ✅ `PREMIUM_ENTITLEMENT_ID`: kept canonical in `AuthSubscriptionManager.ts`, removed duplicate from `SubscriptionContext.tsx`, re-exported there for backward compatibility
- ✅ `ThemeContext.tsx` now imports `THEME_MODE_KEY` from constants instead of defining locally

**Deferred to later phases** (audit had these as duplicates, but they're not actually identical — would change behavior to consolidate):
- `themeCategories` / `therapyCategories` / `techniqueCategories` — tab-version has 6 entries; browser-version has 7-8 (adds an "all" pivot plus extra entries like `loving-kindness`/`progressive-relaxation`, plus a `description` field for techniques). Will reconcile when we extract `features/meditation/`.
- `getCategoryIcon` — 6 call sites, but 3 are no-param inline switches in detail screens (`album/[id]`, `series/[id]`, `sleep/[id]`) that use a captured local value. They're not actually shareable functions. The 3 param-taking versions could share a util, but the cleanup is small relative to the disruption. Defer until list-screen template work in Phase 5.

**Chunk 4 — DONE (this turn)**
- ✅ Fixed theme storage-key bug in `AuthContext.deleteAccount`: the preserve list was `["@theme_mode"]` while `ThemeContext` writes `@calmdemy_theme_mode`. The preserve was a no-op and theme got wiped on account deletion. Now both use `THEME_MODE_KEY` from `storageKeys.ts`.
- ✅ Updated `QueryProvider.tsx` JSDoc to reflect actual behavior (staleTime is `Infinity` with explicit invalidation, not "5-minute Stale-While-Revalidate" as the comments claimed).

## Phase 0a — complete

All four cleanup chunks landed. Codebase is now:
- ~7,500 LOC of dead/duplicate code removed (Chunk 1: ~2,300 LOC; Chunk 3: ~150 LOC of inline functions + `fonts` redefinition)
- Zero debug telemetry remaining in source
- All secrets sourced from `EXPO_PUBLIC_*` env vars
- Two known-bad bugs fixed (theme preserve key, stale React Query staleTime comment)
- 0 new TypeScript errors introduced
- TypeScript baseline: **0 errors** (down from 24 — the spawned task resolved the pre-existing drift)

## Phase 1 progress

| Subsystem | Status | Files moved |
|---|---|---|
| `core/ui` | ✅ DONE | `AnimatedPressable`, `AnimatedView`, `Skeleton`, `ProgressRing`, `TabBarButton`, `scale` (6 files; 52 import sites updated) |
| `core/theme` | ✅ DONE | `ThemeContext`, `theme/index.ts`, `useFonts` (3 files; ~100 import sites updated across `app/` and `src/components/`) |
| `core/firebase` | ✅ DONE | `firebase.ts` → `core/firebase/index.ts` |
| `core/env` | ✅ DONE | `utils/env.ts` → `core/env/index.ts` (new subsystem; not in original target arch) |
| `core/storage` | ✅ DONE | `constants/storageKeys.ts` → `core/storage/keys.ts` |
| `core/query` | ✅ DONE | `providers/QueryProvider.tsx` → `core/query/QueryProvider.tsx` |
| `core/network` | ✅ DONE | `contexts/NetworkContext.tsx` → `core/network/NetworkContext.tsx` |
| `core/notifications` | ✅ DONE | `services/notificationService.ts` → `core/notifications/notificationService.ts` (no consumers yet — moved to its rightful home for when wired up) |
| `core/audio` | ✅ DONE | `useAudioPlayer`, `useBackgroundAudio`, `useAudioUrlQueries`, `audioFiles` (4 files moved); `services/audioService.ts` **deleted** (dead — `configureAudioMode` had zero callers, the `audioService` shim was self-documented as dead). The `audioFiles.ts` split (helpers vs `storagePaths` asset registry) deferred to Phase 5 when we extract features. |
| `core/auth` | ✅ DONE | `AuthContext` (24 importers), `ProtectedRoute` (29 importers), `useProviderManagement` (1 importer) |
| `core/subscription` | ✅ DONE | `SubscriptionContext` (26 importers), `AuthSubscriptionManager` (1 importer) |
| `core/nav` | ✅ DONE | `OfflineNavigator` (1 importer); `PreloadGate` and `ContentPreloadContext` **deleted** (both had zero consumers, slated for Phase 4 deletion anyway) |

## Phase 3 plan — split firestoreService.ts

**Status:** ✅ COMPLETE. All 8 groups (A–H) landed; `firestoreService.ts` is now a thin barrel.

### Phase 3 — complete

All eight groups are committed (one commit per group, TypeScript at 0 errors after each):

| Commit | Group | Target |
|---|---|---|
| `58eb270` | A — breathing | `features/breathing/api/exercises.ts` |
| `facdf32` | B — emergency | `features/emergency/api/emergencyMeditations.ts` |
| `723e44d` | D — auth cleanup | `core/auth/cleanup.ts` |
| `bf408c1` | C — progress | `features/progress/api/{sessions,listeningHistory,playbackProgress,completion}.ts` |
| `9e2dea0` | E — meditation | `features/meditation/api/{meditations,courses}.ts` |
| `0783b78` | F — sleep | `features/sleep/api/{bedtimeStories,sleepMeditations,series}.ts` |
| `b321acd` | G — music | `features/music/api/{albums,sleepSounds,backgroundSounds,music}.ts` |
| (this commit) | H — library | `features/library/api/{quotes,favorites,content,narrators,ratings}.ts` |

**End state:**
- `src/services/firestoreService.ts` went from **2,607 LOC of implementation** to a **~135-line pure re-export barrel** — zero function bodies, zero collection refs, zero module state. Every consumer still imports from it unchanged (Phase 3 invariant held).
- The only surface change is the deliberate deletion of dead `getPrograms` / `meditation_programs` (Group E) — confirmed no consumers repo-wide.
- Each feature now owns its data access under `features/<name>/api/`; `core/auth/cleanup.ts` owns the account purge.
- TypeScript: **0 errors** throughout.

**Carried-forward gotchas for Phase 5 (library extraction):**
- `content.ts` holds the one accepted cross-feature dependency: the polymorphic `getContentById` imports content-type interfaces + getters from emergency/sleep/meditation/music `api/` modules. Clean this up when library is fully extracted.
- The Cache-Aside `_seriesCache`/`_albumsCache` are now duplicated: `getSeries` (sleep) and `getAlbums` (music) each own a live cache, while `content.ts` keeps its own cold copies (never written → the `?? await get…()` paths always fetch live). Reconcile in Phase 5 (e.g. let the resolver consume the feature caches, or drop the cache vars).
- `app/`, `src/hooks/queries/`, and other consumers still import from the `firestoreService` barrel — walking them onto the feature `index.ts` public surfaces (and then deleting the barrel) is Phase 5/6 work.

**Paused before Phase 5** (library feature build) per the session brief — that's a larger architectural lift deserving a fresh session.

---

**Original checklist (kept for reference):**

This section is the canonical checklist for a fresh session.

**Goal:** Carve `src/services/firestoreService.ts` (currently 2,607 lines, ~60 exports) into per-feature `api/` modules so each feature owns its own data access. Keep `firestoreService.ts` as a thin barrel re-export during transition so no consumer breaks.

**Why this matters:** Until this split happens, every feature secretly depends on every other feature through this one file. Phase 1 moved infrastructure into `core/`, but `firestoreService` is still the universal coupling point.

### Strategy

1. **One commit per target group** (8 groups total — see mapping below). Each commit:
   - Creates the target folder (`features/<name>/api/` or `core/auth/cleanup.ts`).
   - Moves the relevant functions + interfaces into a new file.
   - Replaces the original definitions in `firestoreService.ts` with `export { ... } from '<new path>'` re-exports.
   - Verifies `npx tsc --noEmit` → 0 errors.

2. **Consumers don't change during Phase 3.** Every screen and hook keeps importing from `firestoreService` because the barrel re-export preserves the same surface. Consumer migration happens later (interleaved with Phase 5/6 feature extractions).

3. **`firestoreService.ts` ends Phase 3 as a barrel-only file** — ~60 lines of `export { x } from './path'` and nothing else. Phase 5/6 walks consumers off the barrel, then it gets deleted.

### Function-by-function mapping (current line numbers in `firestoreService.ts`)

#### Group A — `features/breathing/api/` (1 function) ✅ DONE
- `getBreathingExercises` (line 614) → `src/features/breathing/api/exercises.ts`
- Note: type `BreathingExercise` already lives in `src/features/breathing/types.ts` (from Phase 2). Update the function to import from there.
- Done: function + its own `breathing_exercises` collection ref moved to the new file; `firestoreService.ts` re-exports it; dropped the now-unused `breathingCollection` const and `BreathingExercise` import from the barrel. tsc 0 errors; barrel still exports 70 symbols; file 2607 → 2566 LOC.

#### Group B — `features/emergency/api/` (2 functions + 1 type) ✅ DONE
- `FirestoreEmergencyMeditation` interface (1276) → `src/features/emergency/api/emergencyMeditations.ts`
- `getEmergencyMeditations` (1298)
- `getEmergencyMeditationById` (1320)
- Done: all three moved. Barrel **imports** the two functions (not just `export ... from`) because `getContentById` calls `getEmergencyMeditationById` internally — a bare `export { } from` would not create the local binding it needs. Type re-exported via `export type`. tsc 0 errors; surface unchanged; file 2566 → 2514 LOC.

#### Group C — `features/progress/api/` (12 functions + 1 type) ✅ DONE
- `createSession` (259)
- `getUserSessions` (289)
- `getUserStats` (459)
- `addToListeningHistory` (1983)
- `getListeningHistory` (2045)
- `PlaybackProgress` interface (2186)
- `savePlaybackProgress` (2218)
- `getPlaybackProgress` (2257)
- `clearPlaybackProgress` (2283)
- `markContentCompleted` (2316)
- `getCompletedContentIds` (2344)
- `isContentCompleted` (2376)
- Done: split across four cohesive files — `sessions.ts` (sessions + stats, plus the private `updateUserStats`/`calculateStreak` helpers which stay module-private), `listeningHistory.ts`, `playbackProgress.ts`, `completion.ts`. The whole progress cluster is self-contained (only `createSession`→`updateUserStats`→`getUserSessions`/`calculateStreak` and `getUserStats`→`getUserSessions` call each other; nothing remaining in the barrel calls any of them), so plain `export … from` re-exports suffice. Removed now-dead `sessionsCollection`/`listeningHistoryCollection`/`usersCollection` consts and the orphaned `MeditationSession`/`ListeningHistoryItem` type imports from the barrel. tsc 0 errors; surface unchanged; file 2475 → 1823 LOC.

#### Group D — `core/auth/cleanup.ts` (1 function) ✅ DONE
- `deleteUserAccount` (2418) — cross-collection cleanup invoked from `AuthContext.deleteAccount`. Lives in core because it's auth-housekeeping that touches many features. (Phase 6 may further evolve this into a `core/auth/cleanup-registry` where features register their own teardown — keep the function single-purpose for now.)
- Done: moved to `src/core/auth/cleanup.ts` with its own collection refs (user_favorites, listening_history, meditation_sessions, playback_progress, completed_content, users). Barrel bare-re-exports it; `AuthContext` keeps importing from `firestoreService` (consumer unchanged per Phase 3 rule). The collection consts in the barrel stay — other progress/library functions still use them. tsc 0 errors; file 2514 → 2475 LOC.

#### Group E — `features/meditation/api/` (9 functions + 2 types) ✅ DONE
- `getMeditations` (133)
- `getMeditationsByTheme` (162)
- `getMeditationsByTechnique` (196)
- `getMeditationById` (228)
- `getPrograms` (580) — **confirmed dead and DELETED** (grep found no consumers in `app/` or `src/` outside the barrel; `MeditationProgram` type stays in `src/types` only because another interface field references it). Removed the function, the `meditation_programs` collection ref, and the `MeditationProgram` import from the barrel.
- `FirestoreCourseSession` interface (1343)
- `FirestoreCourse` interface (1356)
- `getCourses` (1405)
- `getCourseById` (1435)
- Done: `meditations.ts` (the four meditation getters) and `courses.ts` (both interfaces + the private `getCourseSessionsByCourseId` helper + `getCourses`/`getCourseById`). `getCourses` is **imported** into the barrel (not bare re-exported) because `getContentById` calls it to resolve `course_session` content; everything else is a plain re-export, course types via `export type`. Also dropped the now-dead `meditationsCollection` const and `GuidedMeditation`/`MeditationProgram` imports. Cross-feature note: library's `getContentById` (Group H) will import `FirestoreCourse`/`FirestoreCourseSession` directly from `meditation/api/courses` in Phase 5; for now it goes through the barrel re-export. tsc 0 errors; file 1823 → 1559 LOC.

#### Group F — `features/sleep/api/` (6 functions + 2 types + aliases) ✅ DONE
- `getBedtimeStories` (660)
- `getBedtimeStoryById` (687)
- `getSleepStories` alias (702) and `getSleepStoryById` alias (703)
- `FirestoreSleepMeditation` interface (1209)
- `getSleepMeditations` (1231)
- `getSleepMeditationById` (1253)
- `FirestoreSeriesChapter` interface (1550)
- `FirestoreSeries` interface (1560)
- `getSeries` (1583)
  - Series detail (`getSeriesById`, `findSeriesIdByChapterId`) goes to `library` — see Group H
- Done: three files — `bedtimeStories.ts` (both getters + the legacy `getSleepStories`/`getSleepStoryById` aliases), `sleepMeditations.ts` (interface + both getters), `series.ts` (both interfaces + `getSeries`, owning its own Cache-Aside `_seriesCache`). Internal-call bindings: `getSeries` (called by `getContentById` + `findSeriesIdByChapterId`) and `getSleepMeditationById` (called by `getContentById`) are **imported** into the barrel; the series interfaces are `import type`'d because `getSeriesById` (a library lookup staying in the barrel until Group H) references them by name. **Cache note:** `getSeries` now populates the *feature's* `_seriesCache`, so the barrel's own `_seriesCache` (read by the two library lookups still here) stays cold until Group H — correctness is unaffected (it just falls back to a live `getSeries()` call), only the in-barrel cache hit is lost temporarily. Dropped the orphaned `bedtimeStoriesCollection` const and `BedtimeStory` import. tsc 0 errors; file 1559 → 1411 LOC.

#### Group G — `features/music/api/` (11 functions + 4 types) ✅ DONE
- Done: four files — `albums.ts` (album/track interfaces + `getAlbums`, owning its own `_albumsCache`), `sleepSounds.ts`, `backgroundSounds.ts`, `music.ts` (white noise / music / asmr + `FirestoreMusicItem`). `getAlbumById` and `findAlbumIdByTrackId` are **library** lookups and stay in the barrel until Group H, so `getAlbums` is **imported** (called by `getContentById` / `findAlbumIdByTrackId`) and the album interfaces are `import type`'d (referenced by name in `getAlbumById`). Same cold-cache note as series: the barrel's `_albumsCache` is read-only/cold until Group H. Dropped the orphaned `NatureSound` import. tsc 0 errors; file 1411 → 1136 LOC.
- `FirestoreAlbumTrack` interface (1632)
- `FirestoreAlbum` interface (1641)
- `getAlbums` (1663) — list, surfaced on music tab
  - Album detail (`getAlbumById`, `findAlbumIdByTrackId`) goes to `library` — see Group H
- `FirestoreSleepSound` interface (1709)
- `getSleepSounds` (1729)
- `getSleepSoundsByCategory` (1750)
- `getSleepSoundById` (1777)
- `FirestoreBackgroundSound` interface (1796)
- `getBackgroundSounds` (1813)
- `getBackgroundSoundsByCategory` (1834)
- `getBackgroundSoundById` (1860)
- `FirestoreMusicItem` interface (1879)
- `getWhiteNoise` (1901)
- `getMusic` (1921)
- `getAsmr` (1942)

#### Group H — `features/library/api/` (15 functions + 3 types) — the biggest, do last ✅ DONE
- Done: split into five files — `quotes.ts` (getTodayQuote), `favorites.ts` (getUserFavorites/toggleFavorite/isFavorite), `content.ts` (ResolvedContent + getContentById + getFavoritesWithDetails + the three find* lookups + getSeriesById + getAlbumById, sharing local cold `_seriesCache`/`_albumsCache`), `narrators.ts` (FirestoreNarrator + cache + 3 getters), `ratings.ts` (getUserRating/setContentRating/reportContent). `content.ts` is where the accepted cross-feature imports land — it pulls `getEmergencyMeditationById`, `getSleepMeditationById`, `getCourses`, `getSeries` (+ series interfaces), `getAlbums` (+ album interfaces) directly from each feature's `api/`, exactly as the doc anticipated for the polymorphic resolver. With `getContentById` and the lookups now living in the library module, **the barrel has no internal callers left**, so all the previously import-and-re-export bindings (getCourses/getSeries/getAlbums/getSleepMeditationById/getEmergencyMeditationById) collapsed back to plain `export … from` re-exports. tsc 0 errors.
- `getTodayQuote` (720)
- `getUserFavorites` (770)
- `toggleFavorite` (830)
- `isFavorite` (902)
- `ResolvedContent` interface (932)
- `getContentById` (987) — polymorphic resolver across all content types
- `getFavoritesWithDetails` (1165)
- `findSeriesIdByChapterId` (1480) — moved from sleep collection because it's library-routing
- `findAlbumIdByTrackId` (1503) — same reasoning for albums
- `findCourseIdBySessionId` (1527) — same reasoning for courses
- `getSeriesById` (1610)
- `getAlbumById` (1690)
- `FirestoreNarrator` interface (2098)
- `getNarrators` (2120)
- `getNarratorByName` (2144)
- `getNarratorProfileUrl` (2179)
- `getUserRating` (2476)
- `setContentRating` (2516)
- `reportContent` (2586)

### Cross-feature dependencies after Phase 3

These types are imported by other groups and will need to be either:
1. Re-exported through the owning feature's `index.ts`, OR
2. Imported directly via a relative path during Phase 3 (treat as temporary until Phase 5/6).

| Type | Owner | Imported by |
|---|---|---|
| `FirestoreCourse` / `FirestoreCourseSession` | meditation | library's `getContentById` (polymorphic resolver) |
| `FirestoreSleepMeditation` / `FirestoreSeries` / `FirestoreSeriesChapter` | sleep | library's `getContentById` |
| `FirestoreAlbum` / `FirestoreAlbumTrack` / `FirestoreMusicItem` / `FirestoreSleepSound` | music | library's `getContentById` |
| `FirestoreEmergencyMeditation` | emergency | library's `getContentById` |
| `BreathingExercise` (already in features/breathing/types) | breathing | nothing in firestoreService except its own function |

The polymorphic `getContentById` is the worst case — it imports every content-type interface. After Phase 3 it imports them directly from each feature's `api/` file. Phase 5 (library extraction) is the time to clean this up properly.

### Suggested commit order

Easiest first (proves the pattern), then by size:

1. **Group A — breathing** (smallest, 1 function — proves the barrel-export technique)
2. **Group B — emergency** (small, no cross-feature consumers)
3. **Group D — core/auth/cleanup** (1 function, lifts a long-running coupling out)
4. **Group C — progress** (medium, no cross-feature deps)
5. **Group E — meditation** (medium, exports types that library needs)
6. **Group F — sleep** (medium, exports types that library needs)
7. **Group G — music** (medium-large, exports types that library needs)
8. **Group H — library** (largest, depends on types from groups E/F/G; do last so its dependencies are in place)

### Verification protocol (per commit)

After each group:
1. `npx tsc --noEmit` — must be 0 errors.
2. `grep -c "^export " src/services/firestoreService.ts` should decrease (or hold flat as re-exports replace originals).
3. `git diff --stat` on `firestoreService.ts` should show the file shrinking.
4. Commit message format: `Split firestoreService: <group> -> <target path>` with the function list in the body.

### Other splits to consider (defer to later phases or fold in as you go)

- `src/types/index.ts` — currently re-exports `BreathingPattern`/`BreathingExercise` from breathing (from Phase 2). When `BreathingExercise` is no longer imported by `firestoreService.ts` (after Group A lands), the re-export can be deleted.
- Per-feature types still in `src/types/index.ts` (`GuidedMeditation`, `BedtimeStory`, `MeditationSession`, `ListeningHistoryItem`, `UserFavorite`, `DailyQuote`, `NatureSound`, etc.) should move into their respective features. Do this alongside the function move for each group — it's natural to relocate the type with its only data consumer.
- `src/hooks/queries/useHomeQueries.ts` — split it later. The hook is consumed by the Home screen; updating it after firestoreService is split is one of the first steps of Phase 5 (Home/library).

## Phase 4 — complete (done as a side effect of Phase 1)

Phase 4 in the original migration plan was "Delete `ContentPreloadContext` and `PreloadGate`." Both files had zero consumers in the repo (confirmed by grep). They were pulled forward and deleted in Phase 1's `core/{auth,subscription,nav}` batch (commit `828c3de`), since their slot in the architecture (a render-blocking preload context) was redundant with the existing `core/query` React Query setup.

Verified post-Phase 3:
- No `ContentPreloadContext*` / `PreloadGate*` files anywhere in the tree.
- No code references to either symbol.

Nothing for a future session to do here.

## Phase 5 plan — build the `library` feature

**Status:** ✅ COMPLETE (pending the user's in-simulator parity pass on Steps 4/6/7/8). All 8 steps landed, one commit each, TypeScript at 0 errors after every commit.

### Phase 5 — complete

| Step | Commit | What landed |
|---|---|---|
| 1 — config contract | `54edd8c` | `types.ts`, `data/contentTypes.ts`, `manifest.ts`, `index.ts` |
| 2 — inventory | `7f594b7` | `docs/library-screen-inventory.md` (design input) |
| 3 — detail hook | `3d44838` | `hooks/useCollectionDetail.ts` |
| 4 — detail screen | `bd5b31d` | `screens/CollectionDetailScreen.tsx` + 3 route wrappers |
| 5 — player hook | `539a068` | `hooks/useCollectionItemPlayer.ts` |
| 6 — player screen | `6bad867` | `screens/CollectionItemPlayerScreen.tsx` + 3 route wrappers |
| 7 — navigation | `f422ab9` | `navigation.ts` (`navigateToContent` out of home.tsx) |
| 8 — content icons | `9f41392` | `contentIcons.ts` (`getCategoryIcon` consolidated) |

**End state:**
- `src/features/library/` is a complete feature module: `api/` (Phase 3) + `components?`/`hooks/`/`screens/`/`data/` + `navigation.ts` + `contentIcons.ts` + `types.ts` + `manifest.ts` + `index.ts`. (~2,686 LOC total in the module.)
- The six album/series/course detail+player route files dropped from **2,413 LOC to 126** (each ≤ 23 lines), all thin `ProtectedRoute` wrappers around `CollectionDetailScreen` / `CollectionItemPlayerScreen`. Route URLs unchanged.
- `app/(tabs)/home.tsx` 831 → 752 (navigateToContent extracted). Three tab/list screens no longer carry their own `getCategoryIcon`.
- Public surface (`features/library/index.ts`): `CollectionDetailScreen`, `CollectionItemPlayerScreen`, `navigateToContent`, `getCategoryIcon`, `manifest`.
- TypeScript: **0 errors** throughout.

**Open decisions resolved with the user (all "recommended" options):**
1. Course-specific rendering lives behind `contentType === 'course'` conditionals in the screen (lean config — no `parseChildCode`).
2. `MediaPlayer` stays at `src/components/MediaPlayer.tsx` for Phase 5; Phase 6 relocates it to `shared/media-player/`.
3. Phase 5 delivers the feature *module* only — the Library tab home screen + 5-tab restructure are Phase 7.

**Carry-forward notes for later phases:**
- `docs/library-screen-inventory.md` is a temporary artifact — delete once the user has confirmed simulator parity.
- Runtime `permission-denied` on `clearPlaybackProgress` and the expo-audio `pause`/`NativeSharedObjectNotFound` teardown warnings observed in the simulator are pre-existing player/MediaPlayer + Firestore-rules issues (not Phase 5 regressions) — worth addressing during the Phase 6 media-player work.
- `manifest.route` is `'/library'`, reserved for the Phase 7 tab route (doesn't resolve yet; collection content is reached via `/album`, `/series`, `/course`).
- The no-param inline `getCategoryIcon` in `app/sleep/[id].tsx` (sleep-meditation detail) is left for the Phase 6 sleep-feature migration.

**Paused before Phase 6** (per-feature migrations — 13 features) per the session brief; that's a larger lift for a fresh session.

---

## Phase 6 plan — extract `shared/` and migrate the 13 remaining features

**Status:** not started. This section is the canonical checklist.

**Goal:** Empty out the pre-refactor leftovers in `src/components/`, `src/contexts/`, `src/hooks/`, `src/services/`, `src/types/` and land every feature in its own `src/features/<name>/` folder. End state: `src/` contains only `core/`, `shared/`, `features/`, `registry.ts`, `test-setup.ts`. The `firestoreService.ts` barrel disappears when its last consumer migrates.

**Scope:** much bigger than Phase 5. 17 component files, 1 context, 7 hooks, 2 services, 1 types file, 2 utils, 1 constants file in flight, plus 13 feature migrations and ~5 cross-cutting couplings to break. Estimated 2-3 weeks of focused work — **do not attempt as one session.**

**Recommended sub-phases (do in order, fresh session per sub-phase if needed):**

### Phase 6a — Extract `shared/` (the home for cross-feature reusable code) — ✅ COMPLETE

**Status:** ✅ COMPLETE — all 9 files relocated, 3 commits, tsc 0 errors after each. See "Phase 6a — complete" below for the wrap-up. The table batches are marked ✅ DONE inline.

The pre-refactor `src/components/`, `src/contexts/`, and one hook still hold code that doesn't belong to any single feature. They land in `src/shared/`. Same playbook as Phase 1 — `git mv`, `sed -i ''` for path rewrites, hand-fix intra-module imports, `tsc --noEmit` clean per commit.

**Files in this sub-phase:** (all ✅ DONE)

| Current | Target | Rename? | Notes |
|---|---|---|---|
| `src/components/MediaPlayer.tsx` | `src/shared/media-player/TrackPlayerScreen.tsx` | yes | 1,461 LOC. Locked decision: rename per audit. Phase 6a moves it; Phase 6d extracts the `useMediaPlayerOrchestration` hook from inside it. |
| `src/components/AudioPlayer.tsx` | `src/shared/media-player/AudioControls.tsx` | yes | Locked rename. The inner controls widget. |
| `src/components/BackgroundAudioPicker.tsx` | `src/shared/media-player/BackgroundAudioPicker.tsx` | no | Imports `useSleepSounds` from music feature (cross-feature coupling). Document; fix in 6d. |
| `src/components/SleepTimerPicker.tsx` | `src/shared/media-player/SleepTimerPicker.tsx` | no | UI for the playback timer. |
| `src/contexts/SleepTimerContext.tsx` | `src/shared/media-player/PlaybackTimerContext.tsx` | yes | Locked rename: misleadingly named "sleep" but used by every player. |
| `src/hooks/usePlayerBehavior.ts` | `src/shared/media-player/usePlayerBehavior.ts` | no | Move to shared for 6a; decompose in 6d (favorites/ratings/history/paywall hooks per feature). |
| `src/components/ContentCard.tsx` | `src/shared/cards/ContentCard.tsx` | no | Used by 4+ tab screens. |
| `src/components/LoadingScreen.tsx` | `src/shared/loading/LoadingScreen.tsx` | no | Branded splash; used by `ProtectedRoute` and the bootstrap. |
| `src/components/ReportModal.tsx` | `src/shared/modals/ReportModal.tsx` | no | Locked decision: shared, not media-player-local. |

After the moves, update import sites in `app/` and remaining `src/components/`, `src/features/`, and `core/auth/ProtectedRoute.tsx` (uses `LoadingScreen`).

**Out of scope for 6a:** `MediaPlayer.tsx` decomposition, `usePlayerBehavior` decomposition, `BackgroundAudioPicker` coupling break, AccountSwitchConfirmModal consolidation — all those are 6d. 6a is pure relocation.

**Verification per commit:** `tsc --noEmit` clean. Recommend ~3 commits (media-player, cards/loading/modals, hooks).

**Expected diff:** ~10 file moves + ~80 import-site rewrites. No behavior change.

#### Phase 6a — complete

All three batches landed on `main`, one commit each, tsc at 0 errors after every commit. Pure relocation — no behavior change, no decomposition (6d), no consumer-barrel migration (6e).

| Commit | Batch | Moves |
|---|---|---|
| `2224b88` | media-player (5 files, 3 renames) | `MediaPlayer.tsx`→`media-player/TrackPlayerScreen.tsx`, `AudioPlayer.tsx`→`media-player/AudioControls.tsx`, `BackgroundAudioPicker.tsx`→`media-player/`, `SleepTimerPicker.tsx`→`media-player/`, `contexts/SleepTimerContext.tsx`→`media-player/PlaybackTimerContext.tsx` |
| `26840f8` | cards/loading/modals (3 files) | `ContentCard.tsx`→`cards/`, `LoadingScreen.tsx`→`loading/`, `ReportModal.tsx`→`modals/` |
| `a453297` | hooks (1 file) | `hooks/usePlayerBehavior.ts`→`media-player/usePlayerBehavior.ts` |

**End state:**
- `src/shared/` now exists with 4 buckets: `media-player/` (6 files: TrackPlayerScreen, AudioControls, BackgroundAudioPicker, SleepTimerPicker, PlaybackTimerContext, usePlayerBehavior), `cards/` (ContentCard), `loading/` (LoadingScreen), `modals/` (ReportModal). ~4,810 LOC relocated.
- **Renames + export renames applied** (confirmed with user before coding): `MediaPlayer`→`TrackPlayerScreen`, `AudioPlayer`→`AudioControls`, and the de-"sleep"-ification of the timer context — `SleepTimerProvider`→`PlaybackTimerProvider`, `useSleepTimer`→`usePlaybackTimer`, `SleepTimerContextType`→`PlaybackTimerContextType` (it's used by every player, not just sleep). `BackgroundAudioPicker`, `SleepTimerPicker`, `ContentCard`, `LoadingScreen`, `ReportModal`, `usePlayerBehavior` kept their names.
- 11 import-site files rewritten: `app/_layout.tsx` (provider), the five `<TrackPlayerScreen>` route consumers (`app/{meditation,sleep,sleep/meditation,emergency,downloads/player}`), the four tab screens (`app/(tabs)/{home,music,sleep,meditate}`) for ContentCard, `app/music/[id]` for ReportModal, `core/auth/ProtectedRoute` for LoadingScreen, and `features/library/{screens/CollectionItemPlayerScreen,hooks/useCollectionItemPlayer}`. Total: 23 files changed, +107/-111.
- Git rename-detection held (similarity ≥91%), so history is preserved across every move.
- TypeScript: **0 errors** throughout. No `src/`-wide stale references to any old path or symbol remain (grep-verified).

**Deliberately left for later sub-phases (per the brief):**
- `src/components/` still holds the 6c-bound feature components: `AccountPromptModal`, `AccountSwitchConfirmModal`, `AccountSwitchWarning`, `CredentialCollisionModal`, `DownloadButton`, `PaywallModal`, `RecoveryWizard`, `SoundPlayer`, `StatsCard` — none on the 9-file list; untouched.
- `src/contexts/` is now empty save `__tests__/AuthContext.test.tsx` (a core/auth test, unrelated to 6a). Empty-dir/test cleanup is a later concern.
- `BackgroundAudioPicker → useSleepSounds` (music) cross-feature coupling: still present, path-rewritten only. Break in 6d.
- `usePlayerBehavior` god-hook: relocated intact. Decompose in 6d.
- Consumers still import the data layer through the `firestoreService` barrel (TrackPlayerScreen, usePlayerBehavior, useCollectionItemPlayer). Barrel migration + deletion is 6e.

**Carry-forward for the next session (6b–6e planning):** the four other open decisions from the "Open decisions worth raising before starting Phase 6" list (auth bootstrap routing, `legal` as feature vs shared, `courseCodeParser` ownership, `guestNickname` ownership) are 6c concerns — resolve them when those feature migrations start. 6a confirmed the Phase 1 playbook scales cleanly to `shared/`: `git mv` + quote-aware `sed` for path depth + word-boundary `sed` for symbol renames (watch for substring collisions like `useAudioPlayer` vs `AudioPlayer`).

### Phase 6b — Build the shared list-screen template — ✅ COMPLETE

**Status:** ✅ COMPLETE — template built + validated on `app/music/asmr.tsx`, 2 commits, tsc 0 errors after each. See "Phase 6b — complete" below.

The 9 list screens duplicate the same loop (fetch items → resolve audio URLs → track downloaded IDs → render). Build one shared template, then apply it to music/sleep/meditation in their migrations (Phase 6c).

**Files that will adopt the template** (do not migrate them in 6b — just build the template and validate with one):
- `app/meditations/index.tsx`
- `app/meditations/techniques.tsx`
- `app/meditations/therapies.tsx`
- `app/sleep/bedtime-stories.tsx`
- `app/sleep/sleep-meditations.tsx`
- `app/music/asmr.tsx`
- `app/music/white-noise.tsx`
- `app/music/music.tsx`
- `app/music/nature-sounds.tsx`

**Output:** `src/shared/lists/AudioListScreen.tsx` (parameterized by content-type config + a hook returning items) and a hook `useAudioUrlsForList` (or fold into the screen). Validate by migrating one screen (probably `app/music/asmr.tsx` — simplest) and confirming visual parity.

**Verification:** `tsc --noEmit` clean. User simulator-checks the one migrated screen.

#### Phase 6b — complete

Both commits landed on `main`, tsc at 0 errors after each.

| Commit | What landed |
|---|---|
| `7204bce` | `src/shared/lists/AudioListScreen.tsx` (286 LOC) — the template, no consumers |
| `eec4b14` | `app/music/asmr.tsx` migrated to it (247 → 25 LOC) — the validation case |

**Design decisions (confirmed with user before building — all "recommended"):**
1. **Full screen shell.** The template owns the whole visual shell the four near-identical music screens duplicate byte-for-byte: `sleepyNight` gradient + header (title/back) + `FlatList` (loading spinner + empty state) + the sound-row card + `DownloadButton` wiring + `PaywallModal` + `/music/[id]` nav. A consuming route is now a ~25-line composition. (This intentionally goes further than the doc's original "screen owns scaffold / template owns list only" sketch — picked deliberately to hit the LOC target on the byte-identical music set; generalize when non-music features adopt it.)
2. **Built-in sound card**, rendered internally and parameterized by `downloadContentType` + `itemHref`. No `renderItem` prop yet — added in 6c when a feature needs a different row shape.
3. **Reused `core/audio/useAudioUrls`** (already shipped by `app/music/music.tsx`) instead of building a new `useAudioUrlsForList`. The hook the doc sketched already existed in core.

**Template surface** (`AudioListScreen<T extends AudioListItem>`):
- Required props: `items: T[]`, `loading: boolean`, `title: string`, `emptyIcon`, `emptyText`.
- Optional: `downloadContentType` (default `'sound'`), `itemHref` (default `(item) => /music/${item.id}`, typed as expo-router `Href` since `typedRoutes` is on).
- `AudioListItem` is a structural shape (`id/title/description/icon/color/audioPath` + optional `isFree`) satisfied by both `FirestoreMusicItem` and `FirestoreSleepSound`.

**Parity note for the validated screen:** asmr's one mechanism change is audio-URL resolution moving from its hand-rolled `useEffect` loop to `useAudioUrls` (React Query) — observably identical (same `resolveAudioUrls` loop, same Map, same `DownloadButton` visibility + `refreshKey` semantics), and it's exactly what `music.tsx` already ships. The dead `downloadedIds` read (set-but-never-rendered in all 9 originals) is preserved as a write-only setter so `DownloadButton`'s refresh callback shape is unchanged. **User does the simulator parity pass on the ASMR route.**

**Carry-forward — 8 list screens still to adopt the template in their Phase 6c feature migration:**
- music feature: `app/music/white-noise.tsx`, `app/music/music.tsx` (already on `useAudioUrls`), `app/music/nature-sounds.tsx` (adds a category-filter chip row — needs a header/filter slot)
- sleep feature: `app/sleep/bedtime-stories.tsx` (category filter), `app/sleep/sleep-meditations.tsx` (flat)
- meditation feature: `app/meditations/index.tsx`, `app/meditations/techniques.tsx`, `app/meditations/therapies.tsx` (theme/technique/therapy filters + "all" pivots)

**Template-growth notes for 6c** (don't pre-build — add when the adopting feature needs it): a `renderItem` override for non-sound row shapes (course code badges, story chapter counts); a `filter`/header-slot prop for the category-chip screens (nature-sounds, bedtime-stories, meditations); parameterized gradient/palette + `itemHref` for non-music routes; reconsider whether the `duration_minutes: 30` download metadata constant should be per-item.

### Phase 6c — Per-feature migrations (13 features, one feature per commit-cluster)

Each feature follows the breathing template (Phase 2). Per-feature work:
1. Move feature-specific hooks from `src/hooks/` → `features/<name>/hooks/`
2. Move feature-specific types from `src/types/index.ts` → `features/<name>/types.ts`
3. Move feature-specific components from `src/components/` → `features/<name>/components/`
4. Extract screens from `app/<route>.tsx` → `features/<name>/screens/`; update route files to thin wrappers
5. Create `features/<name>/manifest.ts` matching the `FeatureManifest` contract in `src/registry.ts`
6. Create `features/<name>/index.ts` with public API (screens used by routes + manifest)
7. Migrate the feature's consumers off the `firestoreService` barrel onto its own `features/<name>/api/` (already populated by Phase 3) — same import target, just via the feature's `index.ts` or `api/` paths

**Recommended order — smallest/least-coupled first to validate the template at each step:**

| Order | Feature | Routes involved | Notable quirks |
|---|---|---|---|
| 1 | `legal` ✅ DONE | `app/privacy.tsx`, `app/terms.tsx` | ✅ `724da7a`. Single manifest (route `/privacy`, label 'Privacy & Terms'). Screens → `features/legal/screens/{Privacy,Terms}Screen.tsx`; routes thinned to ~12 LOC. Text kept inline. |
| 2 | `emergency` ✅ DONE | `app/emergency/[id].tsx` + `_layout.tsx` | ✅ `9745a13`. Screen → `features/emergency/screens/EmergencyPlayerScreen.tsx` (private `adjustColor` kept inline); route thinned to 18 LOC; `_layout.tsx` untouched. Manifest: 'Emergency Calm' / heart-outline / #E57373, practice, requiresAuth. api/ stays on barrel (6e). |
| 3 | `settings` ✅ DONE | `app/settings.tsx` | ✅ `f5e5211`. Screen → `features/settings/screens/SettingsScreen.tsx`; route thinned to 18 LOC. Delete-account flow kept inline (TODO: extract to `features/auth/hooks/useAccountDeletion.ts` when auth lands). 'Settings'/settings-outline/#8B8685. |
| 4 | `profile` ✅ DONE | `app/(tabs)/profile.tsx` | ✅ `6fee604`. Screen → `features/profile/screens/ProfileScreen.tsx`; route thinned to 18 LOC. `milestones`/`getNextMilestone`/`useStats` now imported from `features/progress` (cross-feature via index). 'Your Sanctuary' card kept custom (no StatsCard rewrite, per decision). Done **after** progress (its dependency). |
| 5 | `progress` ✅ DONE | `app/stats.tsx` | ✅ `b536c2a`. StatsScreen + useStats + StatsCard + milestones(+getNextMilestone, made pure) → `features/progress/`. Partial `useHomeQueries` split: `useUserStats`+`useListeningHistory` → `hooks/queries.ts` (read own api/, not barrel). Time-range math kept inline (not extracted to utils/ this session). Manifest 'Your Sanctuary'/stats-chart/#C4A77D. |
| 6 | `downloads` ✅ DONE | `app/downloads/{index,player}.tsx` | ✅ `e2eb515`. Screens → `DownloadsScreen`/`OfflinePlayerScreen` (routes 13/17 LOC). `downloadService` → `features/downloads/api/` **+ barrel kept at `src/services/downloadService.ts`** (shared/core consumers). `DownloadButton` → **`shared/downloads/`** (not the feature — consumed by `shared/lists/AudioListScreen`); 10 import sites swept. `useDownloadedContent` → `features/downloads/hooks/queries.ts`. requiresAuth false. |
| 7 | `auth` ✅ DONE | `app/login.tsx`, `app/account-security.tsx` | ✅ `31c5b13`. 2 screens + 4 modals → `features/auth/`; Google SVG → `assets/googleIcon.ts`; bootstrap → `bootstrap/useStartupRoute.ts`; delete-account → `hooks/useAccountDeletion.ts` (settings consumes it). PaywallModal import path updated. **AccountSwitch consolidation deferred to 6d** (props differ — not a swap; both moved as-is). |
| 8 | `subscription` ✅ DONE | (no routes; modal-based) | ✅ `acd4037`. `PaywallModal` + `RecoveryWizard` → `features/subscription/components/`; 15 import sites swept. Couplings path-updated only (6d inverts). **Documented shared→feature edge**: `shared/lists/AudioListScreen` → `features/subscription` (PaywallModal can't go to shared/ — depends on auth). State stays in `core/subscription/`. |
| 9 | `onboarding` ✅ DONE | `app/onboarding.tsx` (869 LOC) | ✅ `1b8dd73`. Screen → `features/onboarding/screens/`; route 10 LOC. `freeFeatures`/`premiumFeatures`/`FeatureItem` → `data/featureCatalogues.ts`. Step components + pricing utils kept inline. manifest `enabled: false`. |
| 10 | `home` | `app/(tabs)/home.tsx` (752 LOC after Phase 5) | Most cross-feature-coupled screen. Composes from many features via the registry-style pattern. `generateGuestNickname` already in `src/utils/`. |
| 11 | `meditation` | `app/(tabs)/meditate.tsx`, `app/meditation/[id].tsx`, `app/meditations/{index,techniques,therapies}.tsx` | Themecategories/therapyCategories/techniqueCategories arrays — Chunk 3 deferred dedupe here. Use the 6b list-screen template for index/techniques/therapies. `useMeditation` and `useMeditateQueries` move here. |
| 12 | `sleep` | `app/(tabs)/sleep.tsx`, `app/sleep/[id].tsx`, `app/sleep/meditation/[id].tsx`, `app/sleep/bedtime-stories.tsx`, `app/sleep/sleep-meditations.tsx` | The remaining inline `getCategoryIcon` (sleep-meditation detail) consolidates with `library/contentIcons`. Use the 6b list-screen template. `useSleepQueries` moves here. |
| 13 | `music` | `app/(tabs)/music.tsx`, `app/music/[id].tsx`, `app/music/{asmr,white-noise,music,nature-sounds}.tsx` | `SoundPlayer` renames to `LoopingSoundScreen` per locked decision and moves to `features/music/screens/`. `useMusicQueries` moves here. Music single-item player gets `getSoundById` per locked decision (Chunk 4 audit). Use the 6b list-screen template — 4 of music's list screens are near-byte-identical. |

`features/breathing/` already exists from Phase 2 — no migration needed, but check that nothing in `app/(tabs)/meditate.tsx` or anywhere expects to find breathing in `core/`.

After Phase 6c lands, `src/components/`, `src/hooks/`, `src/services/downloadService.ts`, and `src/types/index.ts` should be empty (or near-empty — `src/types/index.ts` keeps the cross-feature discriminators `SessionType`, `RatingType`, `ReportCategory`, `User`, `UserPreferences` — those move to `shared/types/` as the last step of 6c).

`src/hooks/queries/useHomeQueries.ts` splits during the home migration (step 10): `useTodayQuote` → library, `useListeningHistory` → progress (or library), `useFavorites` → library, `useDownloadedContent` → downloads, `useUserStats` → progress. Per the original audit §6.

#### Phase 6c — legal + emergency complete (2 of 13)

The two smallest features landed this session, validating the per-feature migration template (breathing/Phase 2 shape) before the bigger features. 4 commits, tsc at 0 errors after each, no behavior change. Route URLs unchanged throughout.

| Feature | Migration commit | Doc commit | LOC notes |
|---|---|---|---|
| `legal` | `724da7a` | `afdbc5a` | `app/{privacy,terms}.tsx` 280+232 LOC bodies → `features/legal/screens/{Privacy,Terms}Screen.tsx`; routes now ~12 LOC each. |
| `emergency` | `9745a13` | (this commit) | `app/emergency/[id].tsx` 133 LOC → `features/emergency/screens/EmergencyPlayerScreen.tsx`; route now 18 LOC. |

**Decisions confirmed with the user (all recommended):**
1. **Legal: single manifest** (`id: 'legal'`, `route: '/privacy'`, `label: 'Privacy & Terms'`) covering both screens, rather than two sibling manifests.
2. **Emergency identity:** `label: 'Emergency Calm'`, `icon: 'heart-outline'`, `color: '#E57373'`, `category: 'practice'`.
3. **`requiresSubscription: false`** on both (legal is public with `requiresAuth: false`; emergency gates per-item via `isFree`, with `requiresAuth: true`).
4. **Legal text kept inline** in the screen files (no data/Markdown extraction — deferred).

**Pattern notes carried forward for the remaining 11 features:**
- The route-file → feature move is not a clean `git mv` rename in git's eyes: the route path persists (now a thin wrapper) while the bulk content lands at a new path, so git records it as modify + add. Content history is preserved via the blob; `git log --follow <new path>` traces it.
- `manifest.route` for a param-only feature (emergency has no standalone list/index route) was set to the param path `/emergency/[id]`. Phase 7 (Discover) may want a real entry route or a list screen for it — flagged, not resolved here.
- `index.ts` re-exports screens + manifest only (matching breathing); `api/` stays internal and its consumers stay on the `firestoreService` barrel until Phase 6e.
- Both features' `api/` (emergency) and screens import depth followed `features/<name>/{screens,api}/ → ../../../core` / `../../../shared`.

**Remaining 11 features** (settings, profile, progress, downloads, auth, subscription, onboarding, home, meditation, sleep, music) are planned in subsequent sessions per the table order above.

#### Phase 6c — progress + profile complete (4 of 13)

Paired deliberately to validate the **cross-feature consumption pattern** (feature B imports feature A's public `index.ts`) on a small, well-understood coupling before the bigger features (home, settings) rely on it. progress migrated first because profile depends on it. 4 commits, tsc 0 errors after each, no behavior change.

| Feature | Migration commit | Doc commit | LOC notes |
|---|---|---|---|
| `progress` | `b536c2a` | `21769f0` | `app/stats.tsx` 694 → 17-LOC wrapper. Module now holds `screens/StatsScreen`, `hooks/{useStats,queries}`, `components/StatsCard`, `data/milestones`, `api/` (Phase 3), manifest, index. |
| `profile` | `6fee604` | (this commit) | `app/(tabs)/profile.tsx` 680 → 18-LOC wrapper; `screens/ProfileScreen` consumes progress's public API. |

**Decisions confirmed with the user (all recommended):**
1. progress identity: `label: 'Your Sanctuary'`, `icon: 'stats-chart-outline'`, `color: '#C4A77D'`, `route: '/stats'`, `category: 'progress'`.
2. profile identity: `label: 'Profile'`, `icon: 'person-circle-outline'`, `color: '#7DAFB4'`, `route: '/(tabs)/profile'`, `category: 'account'`.
3. profile's 'Your Sanctuary' summary card kept its bespoke 3-stat layout — **not** rewritten to use `StatsCard` (zero visual-regression risk; cross-feature consumption is already proven via `milestones`/`getNextMilestone`/`useStats`).
4. stats time-range chart math kept inline in `StatsScreen` (not extracted to `utils/timeRange.ts`); `milestones` + `getNextMilestone` (made pure) live in `features/progress/data/milestones.ts`.

**Cross-feature consumption pattern (the point of this pair):**
- `features/profile` imports `{ useStats, milestones, getNextMilestone } from '../../progress'` — through the public `index.ts`, never a deep path. This is the feature→feature pattern (allowed via public surface) that home/settings/etc. will use.
- `features/progress/index.ts` deliberately exposes more than screens+manifest: `StatsCard`, `useStats`, `useListeningHistory`, `milestones`, `getNextMilestone`, `Milestone`. `useUserStats` stays **internal** (only `useStats` wraps it).

**`useHomeQueries.ts` partial split (per constraint #4):**
- `useUserStats` + `useListeningHistory` moved to `features/progress/hooks/queries.ts`, now reading the feature's **own** `api/` (`sessions`, `listeningHistory`) instead of the `firestoreService` barrel — first instance of a 6c consumer migrating off the barrel.
- The other 3 hooks (`useTodayQuote`, `useFavorites`, `useDownloadedContent`) stay in `useHomeQueries.ts`. **Do not delete that file** — it's drained and removed only when all five have moved out (library + downloads + home migrations).
- Moving the two hooks forced **import redirects** (not migrations) in `app/(tabs)/home.tsx` (`useStats` + `useListeningHistory` now from `features/progress`) and `app/(tabs)/profile.tsx` (`useStats`). Necessary because the definitions moved; the consuming screens are otherwise untouched.

**Pattern notes carried forward:**
- A feature can own data hooks that an as-yet-unmigrated screen (home) consumes — expose them on the feature index and redirect the consumer's import. This keeps tsc green without dragging the consumer's full migration forward.
- profile's `route: '/(tabs)/profile'` is registry metadata only — nothing navigates to it programmatically (the tab bar owns it). Phase 7 may revisit the tab-route form.
- The audit's original "feature → shared → core, never feature → feature" invariant is refined by this session: **feature → feature is allowed when it goes through the target's public `index.ts`** (the brief's explicit cross-feature consumption pattern). Phase 8's ESLint rule must permit index-only feature imports, not ban all feature→feature edges.

**Remaining 9 features** (settings, downloads, auth, subscription, onboarding, home, meditation, sleep, music) planned in subsequent sessions per the table order.

#### Phase 6c — settings + downloads complete (6 of 13)

settings (a quick single-screen win) then downloads (the bigger lift — service relocation, a high-import-surface component, two screens, a queries split). 4 commits, tsc 0 errors after each, no behavior change.

| Feature | Migration commit | Doc commit | LOC notes |
|---|---|---|---|
| `settings` | `f5e5211` | `964ba70` | `app/settings.tsx` 453 → 18-LOC wrapper. Delete-account flow kept inline (TODO: → `features/auth/hooks/useAccountDeletion.ts` when auth lands). |
| `downloads` | `e2eb515` | (this commit) | `app/downloads/{index,player}.tsx` → `DownloadsScreen`/`OfflinePlayerScreen` (13/17 LOC). `downloadService` + barrel; `DownloadButton` → `shared/downloads/`; `useDownloadedContent` split out. |

**Decisions confirmed with the user (all recommended):**
1. settings identity: `'Settings'` / `settings-outline` / `#8B8685`, route `/settings`, category account, requiresAuth.
2. downloads identity: `'Downloads'` / `download-outline` / `#8B9F82`, route `/downloads`, category library, **requiresAuth false** (the list route has no `ProtectedRoute` — offline use; the player route keeps its own).
3. **Download homing (the significant one):** `downloadService` impl → `features/downloads/api/`, but a thin re-export **barrel stays at `src/services/downloadService.ts`**; `DownloadButton` → `shared/downloads/` (not the feature). Chosen over the brief-literal "everything into the feature" because `downloadService` and `DownloadButton` are consumed by `shared/` modules (`AudioListScreen`, `TrackPlayerScreen`) and `core/auth` (`AuthContext`), and `features → shared → core` forbids the reverse edges.

**Why the barrel + shared/ placement (carry-forward reasoning):**
- `downloadService`'s 17 consumers include `shared/lists`, `shared/media-player`, `core/auth`, and 7 not-yet-migrated music/sleep/meditation list screens. Migrating all of them onto `features/downloads` would invert the dependency direction. The barrel keeps the literal import path neutral (`services/…`), so there are **zero** shared→feature / core→feature edges. The documented `core/auth → downloads` backward-dep concern **dissolves** — `AuthContext` keeps importing `deleteAllDownloads` from the barrel, unchanged.
- `DownloadButton` is a reusable control (like `ContentCard` → `shared/cards`). It's rendered by `shared/lists/AudioListScreen`, so placing it in `features/downloads/components` would be a shared→feature edge. It lives in `shared/downloads/` and imports the service via the barrel.
- **Verification #3 relaxed:** `grep services/downloadService` is intentionally non-empty (the barrel + its consumers persist), mirroring the firestoreService barrel. Deleting it requires first promoting the low-level helpers (`getDownloadedContentIds`, `isDownloaded`, `getLocalAudioPath`, etc.) to **core/** — a future decision (the truly correct long-term home, since shared/ depends on them). Flag for Phase 6d/6e.
- The downloads feature's **own** screens/hook read `api/downloadService` directly; everyone else reads the barrel.

**`useHomeQueries.ts` drain progress:** `useDownloadedContent` removed (→ downloads). The file now holds **2** hooks (`useTodayQuote`, `useFavorites`) — both drain in the library/home migrations. Still not deletable.

**Remaining 7 features** (auth, subscription, onboarding, home, meditation, sleep, music) planned per the table order. Per-feature specs below.

#### Phase 6c — features 7-13 plan (canonical specs for the remaining migrations)

**Status:** 6 of 13 done. **Order matters** because some features unblock others:

1. **auth** — unblocks settings' delete-account TODO and subscription's coupling
2. **subscription** — depends on auth being in place (so `PaywallModal` can import `AccountPromptModal` via auth's public index)
3. **onboarding** — uses subscription's paywall internally
4. **meditation** — applies `AudioListScreen` template to 2 of its list screens
5. **sleep** — applies `AudioListScreen` template to 2 of its list screens
6. **music** — applies `AudioListScreen` template to remaining 3 sub-screens, completes `SoundPlayer` move
7. **home** — last (it consumes data from every other feature)

**Discipline for the continuing session:**
- One commit per feature for the migration; optional second commit per feature for the doc update (same pattern as the previous 6 sub-sessions)
- TypeScript at 0 errors after every commit (forcing function)
- Don't push until all 7 land (or user explicitly says push)
- Don't drift into Phase 6d (couplings) or 6e (barrel deletion) — those happen after the 13-feature surface is in place
- Update this doc's Phase 6c table to mark each feature ✅ DONE with commit hashes as you go

---

##### 7. auth (BIG — multiple files, surgical extractions)

**Files in flight:**
| Current | Target |
|---|---|
| `app/login.tsx` (~766 LOC) | `features/auth/screens/LoginScreen.tsx` |
| `app/account-security.tsx` (~780 LOC) | `features/auth/screens/AccountSecurityScreen.tsx` |
| `app/index.tsx` bootstrap routing (~50 LOC of the file) | `features/auth/bootstrap/useStartupRoute.ts` (extract as a hook) |
| `src/components/AccountPromptModal.tsx` | `features/auth/components/AccountPromptModal.tsx` |
| `src/components/AccountSwitchConfirmModal.tsx` | **DELETE** (consolidate with `AccountSwitchWarning` — see decision below) |
| `src/components/AccountSwitchWarning.tsx` | `features/auth/components/AccountSwitchWarning.tsx` (the survivor) |
| `src/components/CredentialCollisionModal.tsx` | `features/auth/components/CredentialCollisionModal.tsx` |
| Inline Google SVG in `login.tsx` (~16 lines of SVG XML) | `features/auth/assets/googleIcon.ts` (exported XML string) |
| Delete-account flow inlined in `features/settings/screens/SettingsScreen.tsx` | `features/auth/hooks/useAccountDeletion.ts` (extract; settings imports via auth's public index) |

**Public API (`features/auth/index.ts`):**
- `LoginScreen` (consumed by `/login` route)
- `AccountSecurityScreen` (consumed by `/account-security` route)
- `AccountPromptModal` (consumed by `PaywallModal` in `src/components/` until subscription migrates next)
- `useAccountDeletion` (consumed by settings)
- `useStartupRoute` (consumed by `/index` route)
- `manifest`

**Manifest stub** (confirm with user):
- `id: 'auth'`, `label: 'Account'`, `icon: 'person-circle-outline'`, `color: '#7DAFB4'`, `route: '/login'` (primary entry), `category: 'account'`, `requiresAuth: false` (it IS the auth flow), `requiresSubscription: false`, `searchKeywords: ['sign in', 'login', 'account', 'apple', 'google', 'email', 'password']`

**Decisions to surface:**
1. **AccountSwitchConfirmModal vs AccountSwitchWarning** — pick the survivor. `AccountSwitchWarning` is used by `AccountPromptModal` (link flow); `AccountSwitchConfirmModal` is used by `app/login.tsx` (final-confirm in collision handler). Both warn about losing data on account switch. Recommend keeping `AccountSwitchWarning` (the simpler one) and pointing login's call site at it; verify the prop shapes match or adapt.
2. **`useAccountDeletion` extraction now** — extract it during this migration (settings now consumes via `import { useAccountDeletion } from '../../auth'`). Removes the TODO in settings. Recommended.
3. **`PaywallModal`'s `AccountPromptModal` import** — `PaywallModal` lives in `src/components/` until subscription migrates next (step 8). Just update its one-line import path from `'./AccountPromptModal'` to `'../features/auth'`. The full coupling break (callback-style) is Phase 6d, not now.
4. **Google SVG asset shape** — `features/auth/assets/googleIcon.ts` exports the XML string as a named constant (e.g. `export const googleIconSvg = '<svg>...</svg>'`). The screen still uses `SvgXml` from `react-native-svg`. Don't try to convert to a React component — extra work, no payoff in this phase.

**Gotcha:** `app/index.tsx`'s bootstrap currently checks the onboarding `AsyncStorage` flag + auth state and routes to `/onboarding | /(tabs)/home | /login`. Extract this as `useStartupRoute()` returning `{ done: boolean }` or just navigating internally via the router. Keep the imperative `router.replace` + `navigatedRef` guard — important not to break the no-rerender invariant. The route file becomes ~25 LOC.

**Commit cadence suggestion** (auth is big, split it):
- `Migrate auth modals to features/auth/components/`
- `Consolidate AccountSwitch modals (keep AccountSwitchWarning)`
- `Migrate auth screens to features/auth/screens/`
- `Extract useStartupRoute and thin app/index.tsx`
- `Extract useAccountDeletion from settings to features/auth/hooks/`
- `Mark auth complete in audit doc`

---

##### 8. subscription (medium-big — 2 modals + no top-level route)

**Files in flight:**
| Current | Target |
|---|---|
| `src/components/PaywallModal.tsx` (~825 LOC) | `features/subscription/components/PaywallModal.tsx` |
| `src/components/RecoveryWizard.tsx` (~867 LOC) | `features/subscription/components/RecoveryWizard.tsx` |
| `PaywallModal` import sites across `app/*` (~12-15 screens) | sed sweep |

**Public API (`features/subscription/index.ts`):**
- `PaywallModal`
- `RecoveryWizard`
- `manifest`

**Manifest stub** (confirm with user):
- `id: 'subscription'`, `label: 'Premium'`, `icon: 'sparkles-outline'` or `'star-outline'`, `color: '#C4A77D'`, **`route: '/settings'`** (the screen where users manage subscription — feature has no dedicated entry route), `category: 'account'`, `requiresAuth: false`, `requiresSubscription: false` (the feature *is* subscription gating, doesn't gate itself), `searchKeywords: ['premium', 'subscription', 'upgrade', 'paywall', 'restore', 'refund']`

**Decisions to surface:**
1. **`PaywallModal → AccountPromptModal` coupling** — `PaywallModal` opens `AccountPromptModal` after purchase to prompt anonymous users to link an account. For Phase 6c, **just update the import path** (`from '../features/auth'`). The full callback-style coupling break is **Phase 6d**. Don't do it now.
2. **`RecoveryWizard → useAuth signIn methods`** — same: keep the existing direct calls, **just update the import path**. Phase 6d inverts via injected callbacks.
3. **Manifest route** — `/settings` is pragmatic since that's where subscription is managed. Alternative: omit route (manifest contract would need to allow optional route). Recommend `/settings` for now.

**Gotcha:** Subscription state itself lives in `core/subscription/SubscriptionContext.tsx` (moved in Phase 1). That stays in `core/` — only the UI surface (the modals) moves here. The context-feature split is intentional.

**Commit cadence:**
- `Migrate subscription components to features/subscription/`
- `Mark subscription complete in audit doc`

---

##### 9. onboarding (large single screen)

**Files in flight:**
| Current | Target |
|---|---|
| `app/onboarding.tsx` (~869 LOC) | `features/onboarding/screens/OnboardingScreen.tsx` |
| Hardcoded `freeFeatures` + `premiumFeatures` arrays + UI step components inline | `features/onboarding/data/featureCatalogues.ts` |
| `formatTrial`, `formatPerMonth` utility functions inline | `features/onboarding/utils/pricing.ts` (or keep inline — judgment call) |

**Public API (`features/onboarding/index.ts`):**
- `OnboardingScreen` (consumed by `/onboarding` route)
- `manifest`

**Manifest stub:**
- `id: 'onboarding'`, `label: 'Welcome'`, `icon: 'sparkles-outline'`, `color: '#B4A7C7'`, `route: '/onboarding'`, `category: 'account'`, `requiresAuth: false`, `requiresSubscription: false`, `searchKeywords: ['welcome', 'onboarding', 'tour', 'getting started']`. Onboarding probably doesn't surface in Discover (`enabled: false`) — it runs once on first launch.

**Decisions to surface:**
1. **`enabled: false` for Discover** — should onboarding show in the Discover tab? Probably not (first-launch-only flow). Recommend `enabled: false`.
2. **Step components** (`WelcomeStep`, `FeatureListStep`, etc.) — these are file-local helper components. Keep them inline in `OnboardingScreen.tsx` or extract to `features/onboarding/components/`? Recommend keeping inline (they're not reused).
3. **Feature catalogues to data file** — clean win. Recommended.

**Gotcha:** Onboarding imports `PurchasesPackage` directly from `react-native-purchases` (fixed in the Phase 0a TS pass). That stays unchanged — it's an external type, not a feature dep.

**Commit cadence:**
- `Migrate onboarding feature to features/onboarding/`
- `Mark onboarding complete in audit doc`

---

##### 10. meditation (large — 5 routes + hooks + data)

**Files in flight:**
| Current | Target |
|---|---|
| `app/(tabs)/meditate.tsx` (~525 LOC) | `features/meditation/screens/MeditateHomeScreen.tsx` |
| `app/meditation/[id].tsx` (~191 LOC) | `features/meditation/screens/MeditationPlayerScreen.tsx` |
| `app/meditations/index.tsx` (~498 LOC) | `features/meditation/screens/AllMeditationsScreen.tsx` (apply `AudioListScreen` template) |
| `app/meditations/techniques.tsx` (~487 LOC) | `features/meditation/screens/TechniquesScreen.tsx` (apply `AudioListScreen` template) |
| `app/meditations/therapies.tsx` (~516 LOC) | `features/meditation/screens/TherapiesScreen.tsx` (KEEP custom — it filters courses by code prefix, doesn't fit the audio-list shape) |
| `src/hooks/useMeditation.ts` | `features/meditation/hooks/useMeditation.ts` |
| `src/hooks/queries/useMeditateQueries.ts` | `features/meditation/hooks/queries.ts` |
| `themeCategories` / `therapyCategories` / `techniqueCategories` (duplicated in `meditate.tsx` + `meditations/*.tsx`) | `features/meditation/data/categories.ts` (canonical 6-entry lists; browser screens prepend their own "all" pivot + extras locally — see Chunk 3 deferral notes) |

**Public API (`features/meditation/index.ts`):**
- `MeditateHomeScreen`, `MeditationPlayerScreen`, `AllMeditationsScreen`, `TechniquesScreen`, `TherapiesScreen`
- `useMeditation`, `useGuidedMeditations`, `useCourses`, `useMeditationsByTheme`, `useMeditationsByTechnique` (the queries hook re-exports)
- `manifest`

**Manifest stub:**
- `id: 'meditation'`, `label: 'Meditate'`, `icon: 'leaf-outline'`, `color: '#8B9F82'`, `route: '/(tabs)/meditate'`, `category: 'library'`, `requiresAuth: true`, `requiresSubscription: false`, `searchKeywords: ['meditation', 'mindfulness', 'cbt', 'act', 'dbt', 'mbct', 'breathing', 'body scan', 'visualization', 'loving kindness', 'grounding']`

**Decisions to surface:**
1. **Category data reconciliation** — tab version (6 entries, no "all") vs browser version (7-8 entries with "all" + extras like loving-kindness/progressive-relaxation, plus `description` field for techniques). Recommend: canonical 6-entry lists with all fields (`description` included for techniques); browser screens prepend `{ id: 'all', ... }` locally.
2. **`therapies.tsx` template application** — *don't*. It filters courses by code prefix (CBT/ACT/DBT/MBCT/IFS/Somatic), not the same shape as the audio-list pattern. Move it as a custom screen.
3. **`getCategoryIcon` deferred from Chunk 3** — meditation has param-taking versions in tab + browser screens. Reconcile and put a single function in `features/meditation/utils/categoryIcons.ts` (NOT `features/library/contentIcons.ts` — those are library-level content-type icons; this is meditation-specific theme icons). Or fold into `data/categories.ts` if the icon is on each category entry already.
4. **`GuidedMeditation` + `MeditationTechnique` types** (currently in `src/types/index.ts`) — move to `features/meditation/types.ts`.

**Commit cadence (split the screens):**
- `Migrate meditation hooks + data + types to features/meditation/`
- `Migrate meditate tab screen and meditation player screen`
- `Apply AudioListScreen template to meditations browser screens (index + techniques)`
- `Migrate therapies screen (custom — no template)`
- `Mark meditation complete in audit doc`

---

##### 11. sleep (large — 5 routes + hooks)

**Files in flight:**
| Current | Target |
|---|---|
| `app/(tabs)/sleep.tsx` (~369 LOC) | `features/sleep/screens/SleepHomeScreen.tsx` |
| `app/sleep/[id].tsx` (~195 LOC) | `features/sleep/screens/BedtimeStoryPlayerScreen.tsx` |
| `app/sleep/meditation/[id].tsx` (~174 LOC) | `features/sleep/screens/SleepMeditationPlayerScreen.tsx` |
| `app/sleep/bedtime-stories.tsx` (~432 LOC) | `features/sleep/screens/BedtimeStoriesScreen.tsx` (apply `AudioListScreen` template) |
| `app/sleep/sleep-meditations.tsx` (~294 LOC) | `features/sleep/screens/SleepMeditationsScreen.tsx` (apply `AudioListScreen` template) |
| `src/hooks/queries/useSleepQueries.ts` | `features/sleep/hooks/queries.ts` |

**Public API (`features/sleep/index.ts`):**
- `SleepHomeScreen`, `BedtimeStoryPlayerScreen`, `SleepMeditationPlayerScreen`, `BedtimeStoriesScreen`, `SleepMeditationsScreen`
- `useBedtimeStories`, `useSleepMeditations`, `useSeries` (queries re-exports)
- `manifest`

**Manifest stub:**
- `id: 'sleep'`, `label: 'Sleep'`, `icon: 'moon-outline'`, `color: '#7B8FA1'`, `route: '/(tabs)/sleep'`, `category: 'library'`, `requiresAuth: true`, `requiresSubscription: false`, `searchKeywords: ['sleep', 'bedtime', 'stories', 'rest', 'night', 'meditation', 'series']`

**Decisions to surface:**
1. **`BedtimeStory` type + sleep-specific `category` enum** — move from `src/types/index.ts` to `features/sleep/types.ts`.
2. **`bedtime-stories.tsx` has category filter chips** (rain/water/etc.) — `AudioListScreen` template should support a filter slot, OR the screen renders its own filter header above an `AudioListScreen` instance. Pick one; the template-growth notes in 6b's carry-forward already flag this.
3. **Category icon function** — same pattern as meditation: move to `features/sleep/utils/categoryIcons.ts` or fold into a categories data file.

**Commit cadence:**
- `Migrate sleep hooks + types to features/sleep/`
- `Migrate sleep tab and single-item player screens`
- `Apply AudioListScreen template to bedtime-stories + sleep-meditations`
- `Mark sleep complete in audit doc`

---

##### 12. music (large — 4 list screens + `SoundPlayer` + single-item player rewrite)

**Files in flight:**
| Current | Target |
|---|---|
| `app/(tabs)/music.tsx` (~377 LOC) | `features/music/screens/MusicHomeScreen.tsx` |
| `app/music/[id].tsx` (~458 LOC) | `features/music/screens/SoundPlayerScreen.tsx` (uses the local `SoundPlayer` component) |
| `app/music/music.tsx` (~238 LOC) | `features/music/screens/MusicListScreen.tsx` (apply `AudioListScreen` template) |
| `app/music/white-noise.tsx` (~247 LOC) | `features/music/screens/WhiteNoiseListScreen.tsx` (template) |
| `app/music/nature-sounds.tsx` (~302 LOC) | `features/music/screens/NatureSoundsListScreen.tsx` (template; has category filter like bedtime-stories) |
| `app/music/asmr.tsx` (25 LOC — already migrated in 6b) | Move the 6b-migrated wrapper's body to `features/music/screens/AsmrListScreen.tsx`; route file becomes a thin wrapper around that |
| `src/components/SoundPlayer.tsx` | `features/music/components/SoundPlayer.tsx` (per Phase 0b naming decision: `LoopingSoundScreen` — but rename is optional, locked decisions allow either) |
| `src/hooks/queries/useMusicQueries.ts` | `features/music/hooks/queries.ts` |

**Public API (`features/music/index.ts`):**
- Screens above
- Queries re-exports
- `manifest`

**Manifest stub:**
- `id: 'music'`, `label: 'Music'`, `icon: 'musical-notes-outline'`, `color: '#A8B4C4'`, `route: '/(tabs)/music'`, `category: 'library'`, `requiresAuth: true`, `requiresSubscription: false`, `searchKeywords: ['music', 'sounds', 'ambient', 'asmr', 'white noise', 'nature', 'rain', 'ocean', 'forest']`

**Decisions to surface:**
1. **`music/[id].tsx` rewrite** — current screen fetches all 4 sources (sleep sounds, white noise, music, ASMR) and JS-filters to find the item; uses local rating/report flow instead of `usePlayerBehavior`. Audit recommends a `getSoundById` Firestore helper + adopting `usePlayerBehavior`. **Recommendation: move as-is in 6c, defer the rewrite** — adding `getSoundById` is a Phase 3-style data layer change, and `usePlayerBehavior` is the god-hook scheduled for Phase 6d decomposition. Move clean; refactor in 6d.
2. **`SoundPlayer` rename to `LoopingSoundScreen`** — locked decision. Apply during the move (export rename), or defer to a follow-up commit.
3. **`asmr.tsx` rewrite** — already migrated in 6b but lives at the route layer. Move the migrated body into `features/music/screens/` so all music screens share a home.
4. **Music sleep timer** — `music/[id].tsx` uses its own local timer (not the `PlaybackTimerContext`). Per Chunk 1 audit, this is parallel to the shared timer. Leave alone in 6c; Phase 6d's `usePlayerBehavior` decomposition is a good time to unify.

**Commit cadence:**
- `Migrate music hooks + types to features/music/`
- `Migrate music tab + single-item player + SoundPlayer component`
- `Move 6b-migrated asmr screen into features/music/screens/`
- `Apply AudioListScreen template to music.tsx + white-noise.tsx + nature-sounds.tsx`
- `Mark music complete in audit doc`

---

##### 13. home (LAST — most cross-feature-coupled)

**Files in flight:**
| Current | Target |
|---|---|
| `app/(tabs)/home.tsx` (~752 LOC after Phase 5's `navigateToContent` extraction) | `features/home/screens/HomeScreen.tsx` |
| `useTodayQuote` + `useFavorites` in `src/hooks/queries/useHomeQueries.ts` | **`features/library/hooks/queries.ts`** (NOT home — these are content queries; library owns them. Same pattern as `useUserStats`/`useListeningHistory` → progress.) |
| `src/hooks/queries/useHomeQueries.ts` (will be empty after the drain) | **DELETE** |

**Public API (`features/home/index.ts`):**
- `HomeScreen` (consumed by `/(tabs)/home` route)
- `manifest`

**Manifest stub:**
- `id: 'home'`, `label: 'Home'`, `icon: 'home-outline'`, `color: '#7DAFB4'`, `route: '/(tabs)/home'`, `category: 'library'` (it surfaces library content) or you could argue a custom `'home'` category — recommend `library`, doesn't justify its own bucket, `requiresAuth: true`, `requiresSubscription: false`, `searchKeywords: ['home', 'today', 'recently played', 'favorites', 'quote']`

**Decisions to surface:**
1. **Where do `useTodayQuote` + `useFavorites` go?** — Library, per audit's §3 inventory mapping (`getTodayQuote` and `getFavoritesWithDetails` already live in `features/library/api/` after Phase 3). Add them to `features/library/hooks/queries.ts` and re-export from `features/library/index.ts`. Home consumes via `import { useTodayQuote, useFavorites } from '../../library'`.
2. **Once both hooks drain, delete `src/hooks/queries/useHomeQueries.ts`.** Confirm grep returns no other consumers.
3. **`useEmergencyMeditations` import in home** — still routed through `useMeditateQueries`? Should already be in `features/emergency/api/` per Phase 3. Confirm and update the import if needed.
4. **Home's `navigateToContent` consumer** — already imports from `features/library/navigation.ts` since Phase 5. Just an import-path verify, no migration work.

**Gotcha:** Home is the most-imported feature on the way down (it composes data from many features) but the *least* importable by others. After this migration, no other feature should ever import from `features/home/`. If you find one, it's a smell — flag it.

**Commit cadence:**
- `Drain useTodayQuote + useFavorites from useHomeQueries to features/library/hooks/`
- `Delete empty src/hooks/queries/useHomeQueries.ts`
- `Migrate home feature to features/home/`
- `Mark home complete in audit doc + Phase 6c — complete`

---

##### Phase 6c — features 7-13 running tally

| # | Feature | Migration commit | Notes |
|---|---|---|---|
| 7 | `auth` ✅ | `31c5b13` | 2 screens + 4 modals + googleIcon asset + useStartupRoute + useAccountDeletion. AccountSwitch consolidation → 6d (props differ). Done as one commit (tight coupling). |
| 8 | `subscription` ✅ | `acd4037` | PaywallModal + RecoveryWizard + 15-site sweep. Couplings path-only (6d inverts). Documented shared→feature edge from AudioListScreen (PaywallModal can't go to shared/). |
| 9 | `onboarding` ✅ | `1b8dd73` | Screen + feature catalogues → data/. manifest enabled: false. |
| 10 | `meditation` ✅ | `2616fad` | 5 screens + hooks relocated as-is. Template/category/type work deferred. |
| 11 | `sleep` ✅ | `bc3c211` | 5 screens + useSleepQueries relocated as-is. |
| 12 | `music` ✅ | `0844012` | 6 screens + SoundPlayer + useMusicQueries(+barrel). src/components/ now empty. |
| 13 | `home` ✅ | `8bd0861`+`644a31f` | HomeScreen + drained library queries + deleted useHomeQueries. |

**13 of 13 — Phase 6c COMPLETE.**

### Phase 6c — completion criteria

When all 7 above are done, the audit doc should have a "Phase 6c — complete (13 of 13)" sub-section, and:

- `src/components/` should be empty (all 7 holdouts migrated)
- `src/hooks/` should be empty or near-empty (queries folder gone, `useMeditation` moved)
- `src/services/` keeps `firestoreService.ts` + `downloadService.ts` (both barrels — deleted in Phase 6e)
- `src/types/index.ts` keeps only cross-feature discriminators (`SessionType`, `RatingType`, `ReportCategory`, `User`, `UserPreferences`) — these later move to `shared/types/`
- 7 of 7 new manifests live under `features/<name>/manifest.ts`; Phase 7 wires them into `src/registry.ts`

Push at completion (or earlier if the session is paused part-way).

#### Phase 6c — complete (13 of 13)

All 13 features migrated. `src/` now holds `core/`, `shared/`, `features/` (15 modules: the 13 + breathing/library from Phases 2/5), `registry.ts`, `test-setup.ts`, plus the transitional leftovers below. tsc at 0 errors after every commit.

**Migration commits (this session, features 7–13):**
`31c5b13` auth · `acd4037` subscription · `1b8dd73` onboarding · `2616fad` meditation · `bc3c211` sleep · `0844012` music · `8bd0861`+`644a31f` home (+ per-feature doc commits).

**Completion criteria — status:**
- ✅ `src/components/` empty of components (only `__tests__/ProtectedRoute.test.tsx`, a core-auth test, remains — move to `core/auth/__tests__` in a later tidy).
- ✅ `src/hooks/` near-empty: only `queries/useMusicQueries.ts` (a transitional **barrel** re-exporting `features/music/hooks/queries` for the shared BackgroundAudioPicker consumer; removed when 6d inverts that coupling). `useHomeQueries.ts` deleted; `useStats`/`useMeditation`/`useMeditate/Sleep/MusicQueries` all moved.
- ✅ `src/services/` keeps `firestoreService.ts` (28 consumers) + `downloadService.ts` (14 consumers) — both barrels, deleted in Phase 6e.
- ⚠️ `src/types/index.ts` still holds `GuidedMeditation`/`MeditationTechnique`/`BedtimeStory` etc. in addition to the cross-feature discriminators. The per-feature type moves were **deferred** (entangled with `MeditationTheme`/`MeditationCategory`); a focused follow-up trims `src/types` and the discriminators move to `shared/types/`.
- ✅ 15 manifests under `features/<name>/manifest.ts`; Phase 7 wires them into `registry.ts`.

**Deferred to follow-ups / Phase 6d (flagged during 6c, not done here):**
- AudioListScreen **template application** to the meditation/sleep/music list screens + the **filter-slot** template-growth + **category-array reconciliation** + `getCategoryIcon` consolidation (the screens were relocated as-is).
- Per-feature **type extraction** from `src/types/index.ts`.
- `SoundPlayer → LoopingSoundScreen` rename; `music/[id]` `getSoundById` + `usePlayerBehavior` adoption.
- `AccountSwitchConfirmModal`/`AccountSwitchWarning` **consolidation** (props differ — a real merge).
- **Documented shared→feature edge**: `shared/lists/AudioListScreen → features/subscription` (PaywallModal). And the barrel-masked couplings: shared/core → `services/{firestoreService,downloadService}`, shared BackgroundAudioPicker → `hooks/queries/useMusicQueries`. All are 6d/6e items.
- `useEmergencyMeditations` lives in `features/meditation` queries (relocated as-is); really belongs to emergency.

**Phase 6c is COMPLETE.** Next: 6d (coupling cleanups — owners now exist) and 6e (delete the two service barrels once their consumers migrate). Both need fresh planning.

### Phase 6d — Cross-feature coupling cleanups (do after 6c so feature owners exist)

| Coupling | Current shape | Resolution |
|---|---|---|
| `PaywallModal` (subscription) → `AccountPromptModal` (auth) | direct import | Pass auth modal via render prop / callback. Or introduce `core/billing-flows` orchestrator that owns the post-purchase auth prompt. Subscription stops depending on auth. |
| `RecoveryWizard` (subscription) → auth `signInWith*` methods | direct calls | Same pattern — invert. Recovery wizard consumes injected callbacks from auth. |
| `BackgroundAudioPicker` (shared/media-player) → `useSleepSounds` (music feature) | direct import | Pass sound list as prop, or move ambient-sound source to `core/data/ambient-sounds`. |
| `SleepTimerContext` (now `PlaybackTimerContext`) → `MediaPlayer.registerAudioPlayer` side-channel | callback registration | Invert: player accepts a `fadeOutController` prop. Owned by the screen that wants the fade. |
| `usePlayerBehavior` god-hook | imports library + progress + subscription + core/audio | Decompose: `useFavoriteToggle` (library), `usePlaybackTracking` (progress), `useContentRating` (library), `useContentReport` (library) — each owned by its rightful feature, the media-player screen composes them. |
| `OfflineNavigator` (core/nav) → hardcoded route literals | hardcoded `/downloads` and `/(tabs)/home` | Extract route constants alongside `core/storage/keys.ts` pattern. |
| `AccountSwitchConfirmModal` vs `AccountSwitchWarning` | 95% duplicates | Consolidate per locked decision (Chunk 1 audit). |
| `MediaPlayer.tsx` 1,461 LOC | mixed view + orchestration | Extract `useMediaPlayerOrchestration` hook; view becomes thinner. Locked decision. |

Estimate: 2-3 days for the whole 6d sweep, one commit per coupling.

#### Phase 6d — batching plan (canonical for the continuing sessions)

The original Phase 6d had 8 couplings. Phase 6c's "deferred to follow-ups" list adds ~7 more carry-forward items. Together that's 15+ items — too large for one session. Batched into 4 sub-phases by area and risk:

##### 6d-1 — Subscription/auth couplings + small fixes (low-risk, fast)

Goal: break the subscription→auth direct imports and clean up the smallest 6d items. ~1 session.

| Item | Current shape | Resolution |
|---|---|---|
| `PaywallModal → AccountPromptModal` | `features/subscription/components/PaywallModal.tsx` imports `AccountPromptModal` from `features/auth` directly (just an import-path update from 6c) | Invert: `PaywallModal` accepts an `onPromptAccountLink?: () => void` callback; the screen rendering both decides whether to open the auth modal after purchase. Subscription stops depending on auth. |
| `RecoveryWizard → auth signIn methods` | Direct `useAuth().signInWith*()` calls inside `features/subscription/components/RecoveryWizard.tsx` | Same pattern: `RecoveryWizard` takes injected sign-in callbacks (`onSignInWithGoogle`, `onSignInWithApple`, `onSignInWithEmail`). The screen that owns the recovery flow wires auth's `useAuth` to those callbacks. |
| `AccountSwitchConfirmModal` vs `AccountSwitchWarning` consolidation | 95% duplicates; both currently moved as-is in 6c (props differ — not a swap) | Reconcile prop shapes, pick the cleaner survivor, delete the other. Verify both call sites (login screen + AccountPromptModal) accept the unified shape. |
| `OfflineNavigator` route constants | Hardcoded `/downloads` and `/(tabs)/home` in `core/nav/OfflineNavigator.tsx` | Extract to `core/nav/routes.ts` (or `core/storage/keys.ts` pattern) — typed route constants. Same one-source-of-truth as the storage keys. |

**Open decisions to surface:**
1. `PaywallModal` callback shape — `onPromptAccountLink?: () => void` (void; screen owns the modal state) vs `onPromptAccountLink?: () => Promise<boolean>` (subscription awaits the link result). Recommendation: void — keep PaywallModal stateless about the modal it triggers.
2. Recovery wizard injection shape — three discrete `onSignInWith*` callbacks vs one `signInProvider: (provider) => Promise<void>` switch. Recommendation: three discrete callbacks — clearer, fewer string-typed enums.
3. AccountSwitch survivor — which of `AccountSwitchConfirmModal` / `AccountSwitchWarning`? Read both end-to-end and surface with user before deleting.

Commit cadence: 4 commits (one per item). TS clean after each.

###### 6d-1 — complete

Done in one session, smallest-risk-first (item 4 → 3 → 1; item 2 was a no-op). `tsc --noEmit` clean after every commit. Locked decisions recorded inline below.

| Item | Status | Commit | Resolution as built |
|---|---|---|---|
| `OfflineNavigator` route constants (item 4) | ✅ DONE | `62ec2cf` | New `core/nav/routes.ts` registry mirroring `core/storage/keys.ts`. `ROUTE_DOWNLOADS`/`ROUTE_HOME` as per-identifier `as const` literals (locked decision 5) — usable both as expo-router `Href` and in `===` pathname checks. The `/downloads/` sub-route prefix derives from `ROUTE_DOWNLOADS` via template literal (one source of truth). |
| `AccountSwitch` consolidation (item 3) | ✅ DONE | `da6c25b` | Kept `AccountSwitchWarning` (2 of 3 call sites already used it → fewest edits — locked decision 3), `git rm`'d `AccountSwitchConfirmModal`. Warning gains optional `email?`/`providerType?`: when present (LoginScreen credential-collision flow) it renders the personalized "Sign in to {account}?" copy + subscription-won't-transfer caveat; when omitted (AccountPromptModal, AccountSecurityScreen) it keeps the generic data-loss warning. Only LoginScreen needed editing (`onConfirm/onCancel` → `onConfirmSwitch/onClose`). Behavior note: the survivor auto-closes after `onConfirmSwitch` resolves, so a *failed* switch now returns to the collision modal instead of leaving the dialog open — edge-case-only; success paths unchanged. |
| `RecoveryWizard → auth signIn` (item 2) | ✅ NO-OP | — | **The flagged coupling never existed.** `RecoveryWizard` imports `useAuth` from `core/auth/AuthContext`, not `features/auth` — verified: its only non-library imports are `core/theme`, `core/auth`, `core/subscription`. Consuming core hooks is allowed under `features → shared → core`. The 6d-1 row above (and the original 6d table) framed this as a subscription→auth back-edge to invert; that was **overcautious** — it conflated `core/auth` (the context) with `features/auth` (the feature). No code change made (locked decision 2). Open-decision 2 (callback injection shape) is therefore moot. |
| `PaywallModal → AccountPromptModal` (item 1) | ✅ DONE | `685850b` | Callback inversion (locked decision 1, void shape — open-decision 1): `PaywallModal` drops the `features/auth` import + `showAccountPrompt` state + render, and instead fires an optional `onAccountLinkPrompt?: () => void` after an anonymous purchase. Subscription no longer depends on auth. All 15 PaywallModal render sites wired: each of 14 host feature screens owns its own `AccountPromptModal` (3-part pattern: state + callback + sibling modal). `shared/lists/AudioListScreen` can't import auth (shared ⊅ features), so it threads the callback through to PaywallModal; `AsmrListScreen` (its sole consumer) owns the modal. 17 files, +153/−35. |

**Net coupling result:** subscription→auth direct imports eliminated (item 1); the RecoveryWizard "coupling" was a false flag (item 2); auth's two near-duplicate switch modals collapsed to one (item 3); `core/nav` route literals centralized (item 4). The documented shared→feature edge (`AudioListScreen → features/subscription` for PaywallModal) **persists by design** — PaywallModal depends on core/auth and core/subscription, so it can't move to `shared/`; the inversion just makes the auth-prompt decision the host screen's, not PaywallModal's.

##### 6d-2 — Ambient-sound + player-timer couplings (medium)

Goal: eliminate the two shared→feature back-edges around audio. ~1 session.

| Item | Current shape | Resolution |
|---|---|---|
| `BackgroundAudioPicker (shared/media-player) → useSleepSounds (music)` via `src/hooks/queries/useMusicQueries.ts` barrel | The picker imports the music-feature data through a transitional barrel in `src/hooks/queries/` | Either: (a) pass the sound list in as a prop to BackgroundAudioPicker (the screen that mounts it fetches and provides the data) — preferred, or (b) move the ambient-sound data source to `core/data/ambient-sounds/`. After: delete the `useMusicQueries.ts` barrel. |
| `PlaybackTimerContext → MediaPlayer.registerAudioPlayer` side-channel callback | The timer calls a callback the player has registered, which is wired up via a context method | Invert: the player takes a `fadeOutController` prop owned by the screen mounting both. The timer publishes `isActive`, `remainingSeconds`, `isFadingOut` via context (unchanged); the player owns whether to apply the fade. |

**Open decisions:**
1. (a) vs (b) for the ambient-sound coupling — recommendation: (a). Less moving, no new core/ module, and it makes the screens that compose `BackgroundAudioPicker` declare what sounds they offer.
2. After the timer inversion: rename `PlaybackTimerContext` to keep "timer" but drop the implicit player-control role? Optional polish, not required.

Commit cadence: 2-3 commits.

###### 6d-2 — complete

Both shared→feature audio back-edges eliminated in 3 code commits. `tsc --noEmit` clean after every commit. Locked decisions recorded inline below.

| Item | Status | Commit | Resolution as built |
|---|---|---|---|
| `BackgroundAudioPicker → useSleepSounds` (item 1) | ✅ DONE | `3f0c037` + `166b3f5` | Decision (a), prop injection: the picker drops `useSleepSounds` + the `src/hooks/queries/useMusicQueries.ts` barrel import and instead takes `sounds: FirestoreSleepSound[]` + `soundsLoading: boolean` props — now purely presentational. `TrackPlayerScreen` (the sole composer) owns the `useSleepSounds()` fetch and threads both props in. Barrel `git rm`'d; `src/hooks/queries/` and `src/hooks/` emptied off disk. The `FirestoreSleepSound` *type* import from the service barrel stays (6e-neutral). Net: picker no longer reaches into music; the remaining `TrackPlayerScreen → features/music` edge is a host-screen import through music's public `index.ts` — **persists by design** per the 6d-1 pattern (shared can't own the fetch; the composer declares what it offers). |
| `PlaybackTimerContext → registerAudioPlayer` side-channel (item 2) | ✅ DONE | `a5b7357` | Decision 2A, publish-and-observe: removed `registerAudioPlayer`/`unregisterAudioPlayer` from the context surface, deleted `audioPlayerRef` + `originalVolumeRef`. The context now publishes `fadeVolume` (1 normally; ramps 1→0 over the 10s/100-step fade) and **never touches the player**. `TrackPlayerScreen` observes it: effect 8a mirrors `fadeVolume` onto `player.volume`, effect 8b pauses + finalizes via the existing `cancelTimer()` when `fadeVolume===0`. Race-free because `performFadeOut` *holds* the terminal state (isFadingOut true, fadeVolume 0) until the observer finalizes, rather than self-resetting. Behavior preserved — no user-facing main-volume control existed, so mirroring `: 1` when not fading is a no-op. Net −28 LOC in the context. |

**Net coupling result:** both audio shared→feature back-edges are gone at the leaf level — `BackgroundAudioPicker` and `PlaybackTimerContext` are now feature-agnostic (a presentational picker and a state-publishing timer). The one surviving edge (`TrackPlayerScreen → features/music`) sits at the composing host screen and flows through music's public `index.ts`, mirroring the 6d-1 PaywallModal resolution. Open-decision 2 (rename `PlaybackTimerContext`) deferred as optional polish — the published surface is now `isActive`, `remainingSeconds`, `selectedDuration`, `isFadingOut`, `fadeVolume`, `startTimer`, `cancelTimer`, `extendTimer`.

##### 6d-3 — Player + MediaPlayer decomposition (the big architectural lift)

Goal: decompose the two god-shapes that block clean per-feature ownership of playback concerns. ~2 sessions.

| Item | Current shape | Resolution |
|---|---|---|
| `usePlayerBehavior` god-hook | Owns favorites + ratings + reports + history + paywall + player-state, ~600 LOC | Decompose into: `useFavoriteToggle` (library), `usePlaybackTracking` (progress), `useContentRating` (library), `useContentReport` (library), `useContentPaywallGate` (subscription). Each owned by its rightful feature; `TrackPlayerScreen` composes them. |
| `TrackPlayerScreen` (was `MediaPlayer.tsx`) 1,461 LOC | Mixed view + orchestration; pulls in 14 dependencies | Extract `useMediaPlayerOrchestration` hook (or several) for the non-view logic (auto-play state, progress save scheduling, narrator/sound fetches, download checks). View becomes a thinner presentation component. |

**Open decisions:**
1. Order — decompose `usePlayerBehavior` first (input to the orchestration hook) or `TrackPlayerScreen` first? Recommend: `usePlayerBehavior` first; reveals which orchestration concerns are actually behavior vs view.
2. Where the decomposed hooks live: each in its owning feature's `hooks/` (recommended) vs all in `shared/media-player/hooks/` (cohesive but couples shared to many features).
3. Should `useFavoriteToggle` etc. be exposed by their feature's `index.ts`, or stay internal and the orchestration glue lives in `shared/media-player/`? Recommend: expose through public index — `TrackPlayerScreen` composes them via cross-feature imports through public APIs.

Commit cadence: split into ≥4 commits, one per decomposed hook + one per orchestration extraction.

###### 6d-3 — complete

Both god-shapes decomposed in 11 code commits. `tsc --noEmit` clean after every commit. (No live UI verification: `npm run ios` is out of scope and the vitest suite is unrunnable here — correctness rests on `tsc` + identical-prop/effect-preservation.)

**Part 1 — `usePlayerBehavior` god-hook → 4 feature-owned hooks (5 commits).** The 382-line shared hook was split by concern, each hook owned by its rightful feature and exposed via the public index:

| Decomposed hook | Owner | Commit |
|---|---|---|
| `useFavoriteToggle` (favorite status + optimistic toggle + anon-account gate) | library | `d4fe41f` |
| `useContentRating` (rating state + optimistic radio-toggle) | library | `2e215e4` |
| `useContentReport` (report handler) | library | `199b63b` |
| `usePlaybackTracking` (play/pause + first-play history + 80% session observer) | progress | `637ec83` |
| Compose in 5 screens; delete `usePlayerBehavior` | — | `8437972` |

Each hook sources from its feature's own `api/` (not the legacy barrel). The five player consumers (meditation, bedtime-story, sleep-meditation, emergency, library collection-item player) now compose the hooks via feature public indexes and pass the same props into `TrackPlayerScreen`.

**Decision (open-decision 3, ratified with user as "Option A"):** composition lives in the **feature player screens**, NOT in `TrackPlayerScreen`. The audit recommended `TrackPlayerScreen` compose them, but that component is in `shared/`; importing feature hooks there would reintroduce the `shared → feature` back-edges removed in 6d-1/6d-2. The screens are feature code, so `feature → library`/`feature → progress` (via public index) is allowed and keeps the graph acyclic (verified: no library/progress → meditation/sleep/emergency edges). The 5th spec hook (`useContentPaywallGate`) had no source in `usePlayerBehavior` — the only gate there was the anon-account prompt (folded into `useFavoriteToggle`); real paywall gating was never in this hook.

**Part 2 — `TrackPlayerScreen` god-component → 6 orchestration hooks (6 commits).** The 1,475-line component's 15 lifecycle effects + 3 handlers were extracted by concern into `shared/media-player/hooks/` (all staying in shared):

| Orchestration hook | Concern | Commit |
|---|---|---|
| `useAutoPlay` | auto-play preference (AsyncStorage) + next-track-on-completion | `f64fceb` |
| `useNarratorPhoto` | instructor photo lookup | `cd8db87` |
| `useTrackDownload` | offline download state/check/handler | `737e856` |
| `useBackgroundSoundController` | ambient-sound engine + list + metadata + selection | `4b2c3c0` |
| `useSleepTimerFade` | apply the timer's published fade-out to the owned audio | `69c9a43` |
| `usePlaybackProgressSync` | restore/save/clear Firestore playback position | `8dd84cc` |

Result: the component owns **no `useEffect`/`useRef`** and no longer reads auth or the progress barrel — its only local state is view-level (modal visibility, responsive breakpoints). It shrank from 1,475 → ~1,060 lines (remainder is JSX + StyleSheet). Effect ordering was preserved by keeping intra-concern effects together and calling the hooks in the original order. **Side benefit:** the media-player layer's one accepted `shared → feature` edge (`useSleepSounds` from features/music) is now isolated inside `useBackgroundSoundController`; `TrackPlayerScreen.tsx` itself imports no feature. The orchestration hooks still source narrator/sound/progress data from the legacy `firestoreService` barrel exactly as the component did — barrel migration remains Phase 6e, so no new feature edges were introduced.

**Net:** Phase 6d-3 is the architectural payoff — playback concerns are now owned by the features that should own them (library/progress) and the shared player is a thin presentational shell composing single-concern orchestration hooks.

##### 6d-4 — 6c carry-forward tidy (parallel to 6d, opportunistic)

These items don't have to wait for 6d to finish. They can land any time post-6c. ~1 session if done as a single sweep.

| Item | Action |
|---|---|
| Per-feature type extraction from `src/types/index.ts` | Move `GuidedMeditation`/`MeditationTechnique`/`MeditationTheme`/`MeditationCategory` → `features/meditation/types.ts`. Move `BedtimeStory`/`NatureSound`/`SleepStory` → `features/sleep/types.ts`. Move `DailyQuote`/`UserFavorite`/`ListeningHistoryItem`/`UserStats`/`ContentRating`/`ContentReport` → `features/library/types.ts` (these are content-layer types). Move `MeditationSession` → `features/progress/types.ts`. **Leave the cross-feature discriminators** (`SessionType`, `RatingType`, `ReportCategory`, `User`, `UserPreferences`) in `src/types/index.ts` for now — eventually `shared/types/` (do as part of the move). |
| `useEmergencyMeditations` relocation | Currently lives in `features/meditation/hooks/queries.ts` (relocated as-is from old useMeditateQueries). Move to `features/emergency/hooks/queries.ts`. Re-export from `features/emergency/index.ts`. Update home's import path. |
| Test files relocation | `src/components/__tests__/ProtectedRoute.test.tsx` → `src/core/auth/__tests__/`. `src/contexts/__tests__/AuthContext.test.tsx` → `src/core/auth/__tests__/`. |
| `SoundPlayer → LoopingSoundScreen` rename | Locked decision. Export rename in `features/music/components/`, update consumers (just the music sub-screens). |
| `music/[id]` rewrite | Add `getSoundById` Firestore helper to `features/music/api/`; adopt `usePlayerBehavior` (or the decomposed hooks if 6d-3 has landed) instead of the local rating/report flow. **Coordinate with 6d-3** — if `usePlayerBehavior` is being decomposed in parallel, do this rewrite after 6d-3 lands. |
| AudioListScreen template application to remaining list screens | The 8 list screens that the doc's 6c plan called out (meditations index/techniques, music music/white-noise/nature-sounds, sleep bedtime-stories/sleep-meditations) — relocate uses to `AudioListScreen` with category-filter slot. **Coordinate with 6d-2** — the BackgroundAudioPicker fix changes how sound lists flow; revisit after 6d-2 lands. |
| `getCategoryIcon` consolidation per-feature | Each feature owns its own category icon mapping. Bedtime-stories, music sub-screens, sleep tab → one helper per feature. Hand-fold into the AudioListScreen template application above. |

**Recommended order to do 6d:** 6d-1 → 6d-2 → 6d-4 (types + emergency + tests + rename — opportunistic) → 6d-3 (the big decomposition). 6d-3 last because it's the architectural payoff that benefits from everything else being clean first.

###### 6d-4 — complete

6c carry-forward tidy landed in 7 commits. `tsc --noEmit` clean after every commit. The two larger structural items (AudioListScreen template application, `music/[id]` rewrite) were assessed and **deferred** — see below.

| Item | Status | Commit | Resolution as built |
|---|---|---|---|
| Test files relocation | ✅ DONE | `9eb4aa7` | `ProtectedRoute.test.tsx` + `AuthContext.test.tsx` moved to `src/core/auth/__tests__/`; stale pre-migration import/mock paths in ProtectedRoute repointed to the real `../ProtectedRoute` / `../AuthContext`. (Tests still unrunnable in this env — `jsdom` missing — verified via `tsc` + import resolution.) |
| `SoundPlayer → LoopingSoundScreen` rename | ✅ DONE | `a8a307c` | Component export + props interface + JSDoc renamed in `features/music/components/`; the one consumer (`SoundPlayerScreen`) updated. Screen keeps its own name; rename is music-internal. |
| `useEmergencyMeditations` relocation | ✅ DONE | `7fa5ffb` | Moved from `features/meditation/hooks/queries.ts` to `features/emergency/hooks/queries.ts`, re-exported from emergency's public index, home's import repointed. Kept the firestoreService barrel import (barrel migration is 6e). |
| Per-feature type extraction — meditation | ✅ DONE | `358243d` | `GuidedMeditation`/`MeditationTheme`/`MeditationTechnique`/`MeditationCategory` → `features/meditation/types.ts`; 5 internal consumers repointed. **Deviation A:** `UserStats.most_used_category` widened `MeditationCategory → string` so the still-shared `UserStats` need not import a feature type (shared ✗→ feature). Field is dead; precision loss harmless. |
| Per-feature type extraction — sleep | ✅ DONE | `66a4b24` | `NatureSound`/`BedtimeStory`/`SleepStory` → `features/sleep/types.ts`; 4 `BedtimeStory` consumers repointed. `NatureSound`/`SleepStory` have no type consumers (relocated as-is). |
| Per-feature type extraction — progress | ✅ DONE | `2ae33fc` | `MeditationSession` + `ListeningHistoryItem` → `features/progress/types.ts`. **Deviation B:** the 6d-4 spec placed `ListeningHistoryItem` in *library*, but progress owns its api+hook and Home (its only cross-feature consumer) already depends on progress — library ownership would add a `progress → library` edge for zero library consumers. Routed to progress instead; keeps the graph acyclic. Cross-feature type imports (`meditation→progress`, `home→progress`) use `import type` through the public index. `MeditationSession` still references shared `SessionType` (features→shared, allowed). |
| Per-feature type extraction — library | ✅ DONE | `b0f6d6b` | `DailyQuote`/`UserFavorite`/`UserStats`/`ContentRating`/`ContentReport` → `features/library/types.ts`. `RatingType`/`ReportCategory` **kept in `src/types`** (per spec) because the shared media-player layer consumes them and shared ✗→ feature; `ContentRating`/`ContentReport` reference them via `import type` from src/types. `src/types/index.ts` is now just `User`/`UserPreferences`/`SessionType`/`RatingType`/`ReportCategory` — the eventual `shared/types/`. |
| AudioListScreen template application (8 list screens) | ⏸️ DEFERRED | — | Large structural refactor across 8 list screens; the spec says to "coordinate with 6d-2" and to fold `getCategoryIcon` into it. Better as its own focused batch than tacked onto the 6d-4 tidy. Does not block 6d-3. |
| `getCategoryIcon` consolidation per-feature | ⏸️ DEFERRED | — | The spec explicitly says "hand-fold into the AudioListScreen template application above," so it moves with that deferred batch. Current state: one impl in `features/library/contentIcons.ts` (re-exported via library index), consumed cross-feature by music + sleep, plus a separate local arg-less helper in `BedtimeStoryPlayerScreen`. Consolidation needs a deliberate own/shared decision — not a tail-end change. |
| `music/[id]` rewrite | ⏸️ DEFERRED | — | Depends on the `usePlayerBehavior` decomposition in 6d-3; spec says do it after 6d-3 lands. Untouched. |

**Two deviations flagged for ratification (Deviation A: `UserStats.most_used_category` → `string`; Deviation B: `ListeningHistoryItem` → progress, not library).** Both were taken to keep the feature dependency graph acyclic and are trivially reversible; recorded here per the 6d-1 "make + document, ratify at gate" pattern.

**Net result:** `src/types/index.ts` shrank from a 13-type shared registry to the 5 cross-cutting discriminators. Each feature now owns its domain types under `features/<x>/types.ts`. The only new cross-feature edge is `meditation → progress` (real, via `MeditationSession`); all other type imports are either feature-internal, feature→shared (allowed), or ride pre-existing edges (`home → progress`). The three deferred items are the structural list-screen work, left for a dedicated batch.

### Phase 6e — Delete the two service barrels

Both `src/services/` barrels (`downloadService.ts`, `firestoreService.ts`) are transitional re-export shims. 6e deletes them. Split into two sub-batches: **6e-A** (downloads — the clean one) and **6e-B** (firestore — needs a content-types extraction + a documented shared→feature exception).

###### 6e-A — complete

The `downloadService` barrel is deleted; its implementation was **promoted to `core/`**. The download manager is pure infrastructure (`expo-file-system` + `AsyncStorage`, no Firestore or feature-domain logic), so `core/` is its correct home — not a feature.

| Step | Resolution | Commit |
|---|---|---|
| Move impl | `git mv features/downloads/api/downloadService.ts → core/downloads/downloadService.ts`; empty `features/downloads/api/` removed | `5f010e4` |
| Repoint consumers | All 16 importers (13 external feature/shared/core + 3 downloads-internal hooks/screens) → `core/downloads/downloadService` | `5f010e4` |
| Delete barrel | `git rm src/services/downloadService.ts` | `5f010e4` |

**Back-edge dissolved:** `core/auth → features/downloads` (`AuthContext.deleteAllDownloads`) is gone — core now imports from core. No shared→feature or core→feature edges remain for downloads. `grep "from.*services/downloadService"` → empty. `tsc --noEmit` clean.

###### 6e-B — complete

The `firestoreService` barrel is deleted. It wasn't a clean delete (two structural blockers), resolved in 4 commits. `tsc --noEmit` clean after every commit.

| Step | Resolution | Commit |
|---|---|---|
| Extract content shapes | 13 cross-cutting Firestore content shapes (`FirestoreAlbum/AlbumTrack`, `FirestoreSeries/SeriesChapter`, `FirestoreCourse/CourseSession`, `FirestoreSleepMeditation`, `FirestoreSleepSound`, `FirestoreBackgroundSound`, `FirestoreMusicItem`, `FirestoreEmergencyMeditation`, `FirestoreNarrator`, `ResolvedContent`) → neutral `src/shared/types/content.ts`; functions stay feature-owned and import their shapes from shared | `543285b` |
| Expose fns via indexes | progress: `createSession`/`addToListeningHistory`/`markContentCompleted`/`getCompletedContentIds`/`save`+`get`+`clearPlaybackProgress`; library: `getUserRating`/`setContentRating`/`reportContent`/`getNarratorByName`; music: `getSleepSoundById`; (later) meditation: `getCourseById` | `84eaa61`, `341a93e` |
| Widen media-player | the 3 hooks reading feature data (`useNarratorPhoto`→library, `usePlaybackProgressSync`→progress, `useBackgroundSoundController`→music) repoint off the barrel onto feature public indexes | `34948d3` |
| Repoint + delete | intra-feature → `../api/<module>`; cross-feature → feature index; `AuthContext.deleteUserAccount` → `core/auth/cleanup`; then `git rm src/services/firestoreService.ts` | `341a93e` |

**Blocker 1 (cycle) resolved:** with the shapes in `shared/types/content.ts`, **library imports zero content-feature types**. The library content-resolver's pre-existing *runtime* edges (`content.ts` → `getAlbums`/`getSeries`/`getCourses`/`getEmergencyMeditationById`/`getSleepMeditationById`) remain — they terminate at leaf `api/` files that don't import back into library, so there is **no file-level import cycle**. The feature-level `library ↔ {music,…}` coupling those resolver calls represent is a content-aggregator reality (Phase 8 boundary policy will list it explicitly), not a 6e regression.

**Blocker 2 (shared→feature) resolved by the documented exception below** rather than promoting feature data-access into core (which would be wrong — these are feature Firestore reads, not infra) or prop-drilling across 5 player screens (fictional isolation for a player that by definition spans every content feature).

`src/services/` is now **gone** (empty after both barrels deleted). The cross-feature discriminators in `src/types/index.ts` (`SessionType`, `RatingType`, `ReportCategory`, `User`, `UserPreferences`) remain a **separate** follow-up — not migrated in 6e-B; `src/shared/types/` now exists as their eventual home.

###### Permitted `shared → feature` edges (Phase 8 allow-list)

`shared/` must not import from `features/` **except** the bounded set below. Two shared modules legitimately cross this line: the media player (it plays content owned by every content feature, so a documented dependency on their public APIs is honest rather than fictional isolation) and the shared list template (it renders the subscription `PaywallModal`, which depends on `core/auth` + `core/subscription` and therefore cannot live in `shared/`). Phase 8's ESLint boundary rule reads this list directly.

```
shared/media-player → features/music        (via public index: useSleepSounds, getSleepSoundById)
shared/media-player → features/library       (via public index: getNarratorByName)
shared/media-player → features/progress       (via public index: save/get/clearPlaybackProgress)
shared/lists        → features/subscription   (via public index: PaywallModal)
```

All four are through the feature's public `index.ts` only (never deep `api/` paths). The `TrackPlayerScreen → features/music` host-screen edge from 6d-2 is the same `media-player → music` edge, now joined by library + progress for the orchestration hooks extracted in 6d-3. The `shared/lists → features/subscription` edge is the `AudioListScreen → PaywallModal` dependency ratified "persists by design" in 6d-1 — added to this canonical list in Phase 8 (it had been documented in the 6c/6d narratives but omitted from this block).

### Phase 7 — Registry wiring + Discover + tab restructure

Five sub-batches: **7a** (registry wiring), **7b** (Discover screen), **7c** (tab restructure), **7d** (Library tab home), **7e** (Tools tab home).

###### Phase 7a — complete

Manifest audit + registry wiring landed in 3 commits. `tsc --noEmit` clean after each.

**Audit findings:** all 15 manifests carry every required field (type-enforced), no empty `searchKeywords`, no anemic descriptions, no placeholder sentinels, all `category` values valid. The only findings were *Discover-semantics* suspects — manifests that exist as features but aren't browsable destinations.

| Item | Resolution | Commit |
|---|---|---|
| Hide non-destinations | Flipped `enabled: false` on **home** + **profile** (permanent tabs), **subscription** (modal/paywall UI; route was a `/settings` dup), **emergency** (contextual `/emergency/[id]` param route — not navigable), **auth** (auth flow, not a destination). Onboarding was already `false`. No other manifest field touched. | `f013b15` |
| Wire registry | `featureRegistry` populated by explicit import + push from all 15 public indexes (no auto-discovery/side-effects); ordered by category (library, practice, progress, account, legal) then alphabetical. Helpers: `getById` (no `enabled` filter — deep links resolve for hidden features), `byCategory` / `search` / `allEnabled` (all `enabled`-filtered). `search` = case-insensitive substring over label + description + searchKeywords; empty query → `[]`. | `5d7fb8c` |

**Net:** registry holds all **15** manifests; **9 enabled** (downloads, meditation, breathing, music, progress, library, settings, legal, sleep) are Discover-visible; **6 disabled** (home, profile, subscription, emergency, auth, onboarding). The `manifest → registry` import stays type-only, so `registry ↔ feature` is acyclic at runtime.

###### Phase 7b — complete

Discover tab screen built at `app/(tabs)/discover.tsx` (`b53876b`). Registry-driven: empty query → `SectionList` grouped by category (library, practice, progress, account, legal; non-empty sections only) via `byCategory`; non-empty query → flat `search()` results with a "No features match" empty state. Tiles = color-tinted Ionicon + label + 2-line description + chevron, full-row tap → `router.push(route)`. Reuses `AnimatedView`/`AnimatedPressable` + theme; `ProtectedRoute`-wrapped; no new deps, no filter chips/toggle/fuzzy. Renders 9 enabled features (Library 5, Practice 1, Progress 1, Account 1, Legal 1). `router.push(route as any)` — manifest routes are strings, untyped for typedRoutes.

###### Phase 7c — complete

Tab bar restructured to **Home / Library / Tools / Profile / Discover** (`320d7eb`). Added `library.tsx` + `tools.tsx` placeholder routes (real homes in 7d/7e). New icons: Library `library`, Tools `construct`, Discover `compass` (all glyphs exist — no substitutions). `music`/`meditate`/`sleep` became orphan routes via `<Tabs.Screen options={{ href: null }} />` — removed from the bar but kept in the `(tabs)` group, so the bar persists when viewing them and every deep link + `library/navigation.ts`'s `router.push('/(tabs)/meditate|sleep|music')` still resolves. No route file deleted.

###### Phase 7d — complete

Library tab home built (`05cffe9`), replacing the placeholder. Recently-played hero (horizontal carousel from `useListeningHistory(7)`, hidden entirely when history is empty) over a 2-column Browse grid of Meditation/Music/Sleep/Downloads tiles. Browse tiles are registry-driven (`getById` → label/icon/color/description/route); hero cards route via library's `navigateToContent`. Consumes `features/progress` + `features/library` public indexes + the registry only; no new aggregation. Known limitation: `navigateToContent` gets an empty `emergencyMeditations` context (no extra fetch), so a recently-played emergency item falls back to the meditate tab rather than the emergency player.

###### Phase 7e — complete

Tools tab home built (`2b31928`), replacing the placeholder. Registry-driven breathing tile (active, → `/breathing`) above a single non-interactive "More tools coming soon" card (dashed border, muted ellipsis icon, no named features). Phase 9 practice tools slot in beside breathing.

###### Phase 7 — complete

All five sub-batches landed. Tab bar is **Home / Library / Tools / Profile / Discover**; `music`/`meditate`/`sleep` are href:null orphans (deep links preserved). The registry (`src/registry.ts`) drives Discover (full shelf, 9 enabled features, sectioned + search) and the Library/Tools browse tiles. `tsc --noEmit` clean after every commit. No simulator/runtime verification (per constraints) — type-level + JSX read-through only. Remaining: **Phase 8** (ESLint enforcement of `features → shared → core` + the documented `shared/media-player` allow-list) and **Phase 9** (new product features: Journal/CBT/Mood) — both fresh-session candidates.

### Phase 8 — complete

The architecture invariants Phases 0–7 maintained by hand are now **machine-enforced**. ESLint refuses to compile any code that violates the layering. 5 commits, `tsc --noEmit` at 0 errors throughout.

**Plugin chosen:** `eslint-plugin-boundaries@6.0.2` (purpose-built layer rules, declarative, maps 1:1 to the architecture), on `eslint@10.5.0` + `typescript-eslint@8.61.1` (parser only — no `@typescript-eslint` rules). Flat config at `eslint.config.mjs`. devDependencies only; installed with `--legacy-peer-deps` to match the repo's existing react/test-renderer peer resolution.

**Config shape** (`eslint.config.mjs`, the v6 unified `boundaries/dependencies` rule — it enforces BOTH the layer direction and the public-index entry point in one rule):

*Elements* (by path):

| Element | Pattern | Capture |
|---|---|---|
| `registry` | `src/registry.ts` | — |
| `core` | `src/core/*` | `subsystem` |
| `shared` | `src/shared/*` | `module` |
| `feature` | `src/features/*` | `feature` |
| `root` | `src/{types,utils,constants}`, `src/test-setup.ts` | — (pure leaf utils) |
| `route` | `app/**` | — |

*Rules* (`default: disallow`; every other edge is an error):

| From | May import |
|---|---|
| `core` | `core`, `root` |
| `shared` | `core`, `shared`, `root` + allow-list |
| `feature` | `core`, `shared`, `root`, `registry`, and **other features via `index.ts` only** |
| `registry` | `core`, `shared`, `root`, and **features via `index.ts`** |
| `route` | `core`, `shared`, `root`, `registry`, `route`, and **features via `index.ts` only** |

- **Routes** get the entry-point rule (no reaching into feature internals) but not the layer direction — they are the composition layer above features (decision 2).
- **Tests** (`**/__tests__/**`) are exempt from the boundary rule — they legitimately import internals (decision 3).
- CI integration is out of scope (decision 5): Phase 8 adds only the `"lint": "eslint ."` npm script. No husky/CI infra.

**Final allow-list** (the only sanctioned `shared → feature` edges — mirrors the block above, all via public `index.ts`):

```
shared/media-player → features/{music, library, progress}
shared/lists        → features/subscription
```

**Violations found (first full run): 6, in 2 classes — all class (i) genuine fixes, no allow-list expansion for fixes:**

| # | Class | Violation | Resolution | Commit |
|---|---|---|---|---|
| A | (i) genuine back-edge | `core/auth/ProtectedRoute` → `shared/loading/LoadingScreen` (core → shared) | Moved `LoadingScreen` to `core/ui` (it depends only on `core/theme`; sole consumer is `core/auth`). `shared/loading/` removed. | `56abd9e` |
| C | (i) feature → feature via deep path | `library/api/content.ts` → 5 getters from `{emergency,sleep,meditation,music}/api/*` | Surfaced each getter on its feature's public `index.ts`; `content.ts` imports via `../../<feature>`. Now ordinary feature → feature edges through public indexes. | `8944115` |
| B | (ii) documented exception | `shared/lists/AudioListScreen` → `features/subscription` (PaywallModal) | **Confirmed with user** as the 4th canonical allow-list edge (PaywallModal depends on `core/auth`+`core/subscription`, can't move to `shared/`; ratified "persists by design" in 6d-1). Added to the allow-list block + ESLint config. | `c67386f` |

No class (iii) false positives. The 3 pre-existing media-player allow-list edges passed unchanged.

**How to run lint locally:**

```
npm run lint        # eslint . — 0 errors = architecture conformant
```

A boundary violation prints e.g. `Architecture boundary violated: 'core' may not import 'feature'. … See docs/architecture-audit.md (Phase 8)` and exits non-zero.

**Notes / known limitations (none blocking):**
- *Directive shims:* the config registers `react-hooks/exhaustive-deps` and `@typescript-eslint/no-var-requires` as inert no-ops (with `reportUnusedDisableDirectives: 'off'`) so the source's pre-existing intentional inline `eslint-disable` comments for those rules resolve cleanly. Those rules are **not** enforced (boundary-only scope). If a later phase adds the real react-hooks / typescript-eslint plugins, delete the shim block (documented inline in the config).
- *Resolver:* `import/resolver` node `extensions` extended with `.ts/.tsx/.json` so relative TS imports map to element files (the default resolver only knew `.js`).
- *Unmatched files:* a file placed directly under `src/core|shared|features/` (not inside a subsystem/module/feature folder) is an unrecognized element and is not checked. None exist today; `boundaries/no-unknown-files` could harden this later if desired (left off to keep scope to the specified boundaries).

**Status of the architecture invariants: machine-enforced as of `c67386f`.** `features → shared → core` (one-way), public-index feature isolation, and route composition are now CI-gateable. Phase 9 (Journal/CBT/Mood) builds on an enforced floor.

### Phase 9 — v1 complete (Journal + Mood + CBT + Tools)

The first round of real product work on the enforced floor. Three new feature modules and the Tools-tab integration shipped across four sub-batches with a pause gate between each. **TS 0 / lint 0 after every commit.** No ESLint allow-list changes — every new feature lives entirely within `core` + `shared` + its own internals (the floor held without exceptions).

All three features write to per-user Firestore subcollections (`users/{uid}/{journalEntries,moodEntries,cbtEntries}`); created append-only (mood replaces per-day). **Firestore security rules for these three paths are a separate config concern** — flagged to the user; `read, write: if request.auth.uid == userId`.

| Sub-batch | Feature | Commits | LOC | Notes |
|---|---|---|---|---|
| 9a ✅ | `features/journal/` | 7 (`8a55acc`→`4ea2ad3`) | ~990 | Free-form entries + 12 optional prompts; new-entry pageSheet modal, home list, full-screen detail (`/journal/[id]`). |
| 9b ✅ | `features/mood/` | 3 (`ddd0e5b`→`fa61b04`) | ~755 | Daily 5-point check-in, **replace-per-day** (date-key doc id); 14-day dot history with tap-to-see-note. Confirmed emoji+color palette. |
| 9c ✅ | `features/cbt/` | 9 (`3aee217`→`33cfcbd`) | ~1,870 | 5 methods in one feature. 4 guided flows (A-B-C, Socratic, Core Beliefs, Decatastrophizing) share one `StepFlow` harness; Gratitude is standalone. Method picker + last-10 history + read-only entry detail. |
| 9d ✅ | Tools tab | 2 (`5940ce7` + this doc) | — | `app/(tabs)/tools.tsx` placeholder → registry-driven 2-column grid of the four practice tools; "coming soon" card removed. |

**Registry / Discover:** the practice category now holds 5 enabled features — Breathing (pre-existing), CBT Tools, Emergency*, Journal, Mood (*emergency is `enabled: false`, so Discover shows Breathing/CBT/Journal/Mood under Practice). Total enabled Discover features: 12.

**Design notes (deviations worth recording):**
- **`StepFlow`** (cbt) is the one new abstraction — a generic guided-flow harness (text/slider/distortion steps, progress dots, back preserves entered text, save only on the final step). It stays inside `features/cbt/`; no pressure on `shared/`.
- **`cbtFlows`** (in `data/methods.ts`) is the single source of truth for step definitions, consumed by both the exercise screens and the detail screen (via `cbtStepTitle`) so step labels can't drift.
- **`createdAt: number`** (client `Date.now()`) across all three features, honoring the locked data shapes rather than the older `serverTimestamp()`+conversion pattern (v1 accepts minor clock skew).
- The four guided cbt exercise screens are near-identical `StepFlow` wrappers, landed in one commit (9 commits for 9c vs. the ~10–14 sketch) for cleaner history.

**Total: 21 commits** across Phase 9 (7 + 3 + 9 + 2).

**Explicitly deferred to v2 (not built):**
- [ ] Edit / delete entries (all three are append-only; mood replaces same-day only)
- [ ] Gamification — levels, points, badges, achievements
- [ ] Streak tracking
- [ ] Progress-tab integration (mood charts / journal-cbt counts in stats)
- [ ] Search, tags, filtering
- [ ] Calendar view
- [ ] Sharing / export
- [ ] Reminders / notifications

### Open decisions worth raising before starting Phase 6

These deserve the user's input before the fresh session commits to a direction:

1. **`MediaPlayer` decomposition timing.** Do it inside 6a (one big move + extraction) or split: 6a moves the file, 6d extracts the hook? Recommendation: 6a relocates, 6d extracts — keeps 6a a pure mechanical move with low risk.
2. **Auth feature scope.** Does `features/auth/` own the bootstrap routing logic in `app/index.tsx` (the route file that decides where unauthenticated/onboarded users go)? Recommendation: yes — extract to `features/auth/bootstrap/useStartupRoute.ts`, route file imports it.
3. **`features/legal/`** as a feature module — or just move the two static screens into a `shared/legal/` shelf? Recommendation: feature module, because Phase 7 will list it in Discover; a `shared/legal/` shelf doesn't get a manifest. Cost: 5 minutes for the manifest + index.
4. **`courseCodeParser` ownership** — `features/library/utils/` (because library owns course detail screens, per Phase 5) or `features/meditation/utils/` (because courses are a meditation content type)? Recommendation: `features/library/utils/` — keeps the course parsing alongside the rest of the course content rendering that library now owns.
5. **`guestNickname` ownership** — `features/auth/utils/`, `features/profile/utils/`, or stay in `src/utils/`? Used by home + profile. Recommendation: leave in `src/utils/` for now since it's used cross-feature; revisit if a clear owner emerges.

### Recommended cadence for the fresh session

Start with **Phase 6a (shared/ extraction) only.** It's a coherent unit, low-risk (no behavior change), and unblocks the rest. ~1-2 days. After 6a lands, come back to plan 6b–6e based on what was learned. Don't attempt 6c–6e in the same session as 6a.

---

**Original Phase 5 checklist below (kept for reference).** This section is the canonical checklist for a fresh session.

**Goal:** Collapse the three near-identical content-collection screen pairs (album, series, course) into one parameterized `CollectionDetailScreen` + `CollectionItemPlayerScreen` owned by `features/library/`. Extract the polymorphic content router (`navigateToContent`) and the category-icon mapping out of `app/(tabs)/home.tsx` into the same feature. Expected LOC reduction: ~3,000 across the three triplets.

### What's in vs out of scope

**In Phase 5:**
- `CollectionDetailScreen.tsx` + `useCollectionDetail.ts` (unifies `album/[id]`, `series/[id]`, `course/[id]`)
- `CollectionItemPlayerScreen.tsx` + `useCollectionItemPlayer.ts` (unifies `album/track/[id]`, `series/chapter/[id]`, `course/session/[id]`)
- A `CollectionConfig` type registry that captures the album/series/course differences (parent vs child Firestore types, content-type strings, route shapes, code parsing for courses)
- `features/library/navigation.ts` — extracted `navigateToContent(contentId, contentType, ctx)` (8 content types; currently inline in `home.tsx`)
- `features/library/contentIcons.ts` — extracted category icon mapping (currently duplicated across music tab, sleep tab, bedtime-stories, music/asmr)
- The 6 affected route files in `/app/{album,series,course}/...` collapse to ~10-line wrappers around `<CollectionDetailScreen contentType="album" id={id} />` / `<CollectionItemPlayerScreen ... />`
- `features/library/manifest.ts` + `index.ts` so the feature is registry-ready

**Explicitly NOT in Phase 5 (defer to noted phases):**
- **Tab restructure** (Home/Library/Tools/Profile/Discover) → Phase 7, alongside Discover build. The current 5 tabs (Home/Music/Meditate/Sleep/Profile) stay.
- **`LibraryHomeScreen.tsx`** (the tab home that composes meditation library + music + sleep library + albums/series/courses) → Phase 7.
- **List-screen template** (the 9 list screens in `meditations/*`, `music/*`, `sleep/*`) → Phase 6, when individual features migrate. The Chunk 3 audit deferred `getCategoryIcon` cleanup here, but the list-screen template stays out.
- **Migrating consumers off the `firestoreService` barrel** → Phase 6. Library's hooks here continue importing from the barrel, same as Phase 3 invariant.
- **Album / series / course route URL changes.** Keep `/album/[id]`, `/series/[id]`, `/course/[id]` (and the player sub-routes) as the canonical routes — they become thin wrappers around the unified screens. Don't rewrite to `/library/album/...`; deep links and saved-content references depend on the current paths.

### Strategy

Same playbook as Phases 1–3, applied incrementally:
1. **One commit per logical step** (8 steps below). TypeScript at 0 errors after every commit (forcing function).
2. **Existing behavior preserved at each step** — the unified screens render identically to the originals for each content type before the original screen is deleted.
3. **Route URLs unchanged.** Only the screen *implementations* move; route paths and deep links stay stable.

### Step-by-step plan

#### Step 1 — Scaffold `features/library/` + the config contract ✅ DONE

Establish the feature directory shape and the type contract for content-type configs. No screens yet; this commit just creates files and types.

**Done:** Created `features/library/types.ts` (`CollectionContentType`, `CollectionItemContentType`, lean `CollectionConfig<TParent, TChild>` — **no `parseChildCode`**, per the locked decision to keep course quirks in the screen), `features/library/data/contentTypes.ts` (`COLLECTION_CONFIGS` with album/series/course configs wired to `getAlbumById`/`getSeriesById`/`getCourseById` + the six Firestore types, all imported through the `firestoreService` barrel to avoid cross-feature imports), `features/library/manifest.ts` (`id: 'library'`, `category: 'library'`, `requiresAuth: true`, `route: '/library'` reserved for the Phase 7 tab), and `features/library/index.ts` (exports `manifest`; screens/navigation/icons added in later steps). `components/`/`hooks/`/`screens/` dirs are materialized as their files land in Steps 3–8. tsc 0 errors.

- Create `features/library/{components,hooks,screens,data}/` directories.
- Create `features/library/types.ts`:
  ```ts
  export type CollectionContentType = 'album' | 'series' | 'course';
  export type CollectionItemContentType =
    | 'album_track' | 'series_chapter' | 'course_session';

  export interface CollectionConfig<TParent, TChild> {
    parentContentType: CollectionContentType;
    childContentType: CollectionItemContentType;
    // Fetching
    fetchParentById: (id: string) => Promise<TParent | null>;
    getChildren: (parent: TParent) => TChild[];
    getChildId: (child: TChild) => string;
    getChildAudioPath: (child: TChild) => string;
    getChildTitle: (child: TChild) => string;
    // Display
    parentLabel: string;            // 'Album', 'Series', 'Course'
    childLabelPlural: string;        // 'Tracks', 'Chapters', 'Sessions'
    // Routing
    playerRoute: (childId: string) => `/${string}`;
    // Optional course-specific: code parsing (CBT101M1L style)
    parseChildCode?: (child: TChild) => { module?: string; lesson?: string };
  }
  ```
  The exact field set will become clearer as Step 3 starts; treat this as a starting point.
- Create `features/library/data/contentTypes.ts` populating `COLLECTION_CONFIGS: Record<CollectionContentType, CollectionConfig<any, any>>` with three configs (album/series/course). Wire up the data callbacks to existing functions in `features/library/api/content.ts` (`getAlbumById`, `getSeriesById`, etc., already moved in Phase 3 Group H).
- Create `features/library/manifest.ts` (use breathing's manifest as the template). The library feature has `requiresAuth: true`, `category: 'library'`, color/icon chosen to match the existing UI.
- Create `features/library/index.ts` with no exports yet (placeholder; populated in later steps).

**Verify:** `npx tsc --noEmit` clean. No screen behavior changed yet.

#### Step 2 — Inventory the current screens (read-only, no code changes) ✅ DONE

**Done:** Wrote `docs/library-screen-inventory.md` (delete after Phase 5). Key finding: album and series are ~95% identical (dark-only, `sleepyNight` gradient); **course is the outlier** — light/dark-aware theming, course-code badge, subtitle, difficulty, per-session code meta (`buildSessionMetaInfo`), `dayNumber` badge, `course.color` play tint. Also flagged: `downloadedIds` state is set but never read in render (DownloadButton self-manages via `refreshKey`), and course imports `getLocalAudioPath` unused. The doc captures shared state/effects/handlers, the per-type differences table, and the player-route param shapes for Steps 5–6.

Before writing the unified screen, read all three detail-screen files (`app/album/[id].tsx`, `app/series/[id].tsx`, `app/course/[id].tsx`) end-to-end and produce a short notes file: `docs/library-screen-inventory.md` (delete after Phase 5) listing:

- The exact state each screen tracks (`completedIds`, `downloadedIds`, `audioUrls`, `refreshKey`, `autoOpenItemId`).
- The exact effect bodies (audio-URL prefetch loop, downloaded-IDs refresh on focus).
- The differences between the three (course code badge, course session lock-by-day, series chapter-number badge, album track-number indicator).
- The shared visual scaffolding (gradient header, title block, child list, paywall gate).

This file is the design input for Step 3 — saves the fresh session from re-reading the screens repeatedly.

**No commit** (or commit as a docs-only commit, your call).

#### Step 3 — Build `useCollectionDetail` ✅ DONE

**Done:** `features/library/hooks/useCollectionDetail.ts` encapsulates the shared state machine (parent load, completed-ids on focus, downloaded-ids + refreshKey bump on focus, per-child audio-URL resolution, auto-open-once) and `handleChildPress` (paywall gate → navigate). Behavior mirrors the originals exactly. Refined `CollectionConfig` as the hook needed (anticipated by the doc): added `getChildIsFree`, replaced the placeholder `playerRoute` with `playerPathname` + `buildPlayerParams` (type-specific param assembly — album `artist`/`tracksJson`, series `narrator`/`chaptersJson`, course `courseCode`/`sessionCode`/`color`/`instructor`/`sessionsJson`). Hook not yet wired into any screen. tsc 0 errors.

A single hook that encapsulates the state machine the three screens share: fetch parent, list children, prefetch audio URLs, track download + completion state, handle autoOpen-on-mount, expose paywall gate.

- File: `features/library/hooks/useCollectionDetail.ts`
- Signature: `function useCollectionDetail<TParent, TChild>(config: CollectionConfig<TParent, TChild>, parentId: string, opts?: { autoOpenItemId?: string }): UseCollectionDetailResult<TParent, TChild>`
- Pulls in `useAudioUrlsForList`-style logic (or whatever was extracted in Chunk 3 — currently `useAudioUrlQueries` in `core/audio`).

**Verify:** `npx tsc --noEmit` clean. Hook exists but isn't yet wired into any screen.

#### Step 4 — Build `CollectionDetailScreen` + migrate three detail routes ✅ DONE (pending user simulator parity check)

**Done:** `features/library/screens/CollectionDetailScreen.tsx` (~595 LOC) unifies all three detail screens, driven by `useCollectionDetail`. Album/series render the dark-only path; course quirks (light/dark palette, code badge, subtitle, difficulty meta, `dayNumber` badge, session-code line via `buildSessionMetaInfo`, `course.color` play tint, `school` icon) live behind `contentType === 'course'` conditionals. The three route files (`app/{album,series,course}/[id].tsx`) are now ~23-line `ProtectedRoute` wrappers — detail side dropped from 1,633 LOC to 69 (routes) + ~595 (shared screen). Parity nuance preserved: course loading/not-found render bare (no gradient), unlike album/series which wrap in `sleepyNight`. Exported `CollectionDetailScreen` from `features/library/index.ts`. tsc 0 errors. **Next: user loads `/album/[id]`, `/series/[id]`, `/course/[id]` in the simulator to confirm parity (paywall gates, completed/downloaded badges, autoOpen deep links, light/dark course theming).**

- File: `features/library/screens/CollectionDetailScreen.tsx`
- Props: `{ contentType: CollectionContentType; id: string; autoOpenItemId?: string }`
- Internally looks up `COLLECTION_CONFIGS[contentType]`, calls `useCollectionDetail`, renders the shared layout.
- Course-specific rendering (code badge, day number) lives behind a `if (contentType === 'course')` block — keep it small and clearly demarcated; over-engineering the config to abstract every difference is a smell.

Migrate route files:
- `app/album/[id].tsx` → 10 lines: `<CollectionDetailScreen contentType="album" id={id} autoOpenItemId={autoOpenItemId} />` wrapped in `ProtectedRoute`.
- `app/series/[id].tsx` → same pattern, `contentType="series"`.
- `app/course/[id].tsx` → same pattern, `contentType="course"`.

**Verify after each route migration:**
- `npx tsc --noEmit` clean.
- The user manually loads each detail route in the simulator and confirms parity: paywall gates fire correctly, completed/downloaded badges show, autoOpen works for deep links.
- Commit per route file (3 commits) OR one combined commit for all three — judgment call based on confidence.

Original route bodies are deleted in the same commit they're replaced.

#### Step 5 — Build `useCollectionItemPlayer` ✅ DONE

**Done:** `features/library/hooks/useCollectionItemPlayer.ts` encapsulates the shared player mechanics (audio load with downloaded-first fallback, autoplay-on-nav, 80% completion marking, prev/next within the sibling list with paywall gate + audio cleanup + `router.replace`) and owns the `usePlayerBehavior` wiring. Type-specific presentation and the sibling-param shape stay with the screen via a passed-in `buildSiblingParams` (parent-level fields like `albumTitle`/`artist`/`narrator`/course codes/`color` live in the route params, not the sibling). MediaPlayer stays at `src/components/MediaPlayer.tsx` per the locked decision. Additive only — not wired into any screen yet. tsc 0 errors.

Mirror of Step 3 for the player. The three player screens share: receive child from route params (often passed as JSON), prev/next within the collection, completion tracking, paywall gating, integration with `MediaPlayer` (shared component, still in `src/components/MediaPlayer.tsx` — Phase 6 territory) and `usePlayerBehavior`.

- File: `features/library/hooks/useCollectionItemPlayer.ts`
- Signature: `function useCollectionItemPlayer<TParent, TChild>(config: CollectionConfig<TParent, TChild>, childId: string, siblingsJson?: string): UseCollectionItemPlayerResult<TChild>`

**Verify:** TS clean.

#### Step 6 — Build `CollectionItemPlayerScreen` + migrate three player routes ✅ DONE (pending user simulator parity check)

**Done:** `features/library/screens/CollectionItemPlayerScreen.tsx` (~239 LOC) unifies all three player screens, driven by `useCollectionItemPlayer`. The screen reads its own route params (the union across the three routes) — so the prop surface is just `{ contentType }` rather than the doc's sketched `{ contentType, id, siblingsJson }` (the player has ~13 params; self-reading keeps the wrappers thin). Type-specific bits handled in the screen: `usePlayerBehavior` title (course raw vs album/series prefixed), MediaPlayer presentation (category/instructor/gradient/artworkIcon/loadingText/metaInfo/parentTitle), and `buildSiblingParams` for prev/next. The three player routes (`app/{album/track,series/chapter,course/session}/[id].tsx`) are now ~19-line wrappers. Player side dropped from 780 LOC to 57 (routes) + ~239 (shared). Exported from `index.ts`. tsc 0 errors. **Next: user verifies the three players in the simulator — playback, prev/next (incl. paywall on locked siblings + autoplay on next), favorite/rate/report, 80% completion, course color gradient + session-code meta.**

> Note: the runtime `permission-denied` on `clearPlaybackProgress` and the expo-audio `pause`/`NativeSharedObjectNotFound` teardown warnings seen in the simulator originate in the player/MediaPlayer + Firestore-rules path, not in this refactor — they predate Phase 5 and are flagged for the Phase 6 media-player work.

- File: `features/library/screens/CollectionItemPlayerScreen.tsx`
- Props: `{ contentType: CollectionContentType; id: string; siblingsJson?: string }`
- Migrates `app/album/track/[id].tsx`, `app/series/chapter/[id].tsx`, `app/course/session/[id].tsx` to thin wrappers.

**Verify** same as Step 4: TS clean, simulator parity, commit per route or batched.

#### Step 7 — Extract `navigateToContent` to `features/library/navigation.ts` ✅ DONE

**Done:** Moved the polymorphic `navigateToContent` (the `emergency_` prefix handling + 8-type switch) out of `app/(tabs)/home.tsx` into `features/library/navigation.ts`. Chose option (a): the caller passes its loaded `emergencyMeditations` list in via a `NavigateToContentContext` (Home keeps owning the fetch); the `find*` lookups are called directly from `./api/content` (same module). `router` is typed as expo-router's `Router`. home.tsx now keeps a 4-line `useCallback` that delegates to the extracted function (same `[emergencyMeditations, router]` deps), and dropped the now-unused `find*` imports — 831 → 752 LOC. Exported `navigateToContent` from `index.ts`. tsc 0 errors. **User verifies Home still routes all 8 content types (recently-played / favorites taps) correctly in the simulator.**

`navigateToContent(contentId, contentType, router, ctx)` currently lives inline in `app/(tabs)/home.tsx` with hardcoded knowledge of all 8 content types. It needs to move to the library feature so home (and downloads, and future Discover) can share it.

Wrinkles:
- The `emergency` case needs the full meditation params object (title, description, audioPath, etc.), not just the id. Currently home.tsx grabs them from a loaded `emergencyMeditations` list. Options:
  - (a) Accept the list as a parameter: `navigateToContent(id, type, router, { emergencyMeditations })`. Pragmatic; home keeps owning the fetch.
  - (b) Fetch inside `navigateToContent` via `getEmergencyMeditationById` — extra round-trip but cleaner.
  - Recommendation: (a) for Phase 5. (b) is a Phase 7+ optimization.
- `findSeriesIdByChapterId` / `findAlbumIdByTrackId` / `findCourseIdBySessionId` are already in `features/library/api/content.ts` (Phase 3 Group H), so the routing function can call them directly.

Migrate `app/(tabs)/home.tsx` to import `navigateToContent` instead of defining it inline. **Don't extract the rest of home.tsx in Phase 5** — that's a Phase 6 concern. Just pull out this one function.

**Verify:** TS clean, home screen still navigates correctly to all 8 content types in the simulator.

#### Step 8 — Extract `contentIcons` to `features/library/contentIcons.ts` ✅ DONE

**Done:** `features/library/contentIcons.ts` exports `getCategoryIcon(category, fallback = 'disc')`. Reality differed from the audit's "same mapping, different default": the music copy (ambient/piano/classical/lofi) and the sleep/story copy (fantasy/travel/thriller/fiction) were two **domain-disjoint** mappings overlapping only on `nature → leaf`. Merged them into one switch (no real call-site result changes since the category sets don't overlap) and preserved the differing defaults via the `fallback` param: music keeps `getCategoryIcon(cat)` (→ `disc`), sleep/series/story call sites pass `'book'`. Removed the three duplicated local copies (`app/(tabs)/music.tsx`, `app/(tabs)/sleep.tsx`, `app/sleep/bedtime-stories.tsx`) and also folded in the two inline helpers `CollectionDetailScreen` had carried since Step 4. Exported from `index.ts`. The no-param inline switch in `app/sleep/[id].tsx` (sleep-meditation detail — a different feature) is intentionally left for Phase 6. tsc 0 errors. **User confirms category fallback icons are unchanged on the Music tab, Sleep tab (series + stories), and the Bedtime Stories list.**

The category-icon mapping has 3 param-taking copies in `app/(tabs)/music.tsx`, `app/(tabs)/sleep.tsx`, `app/sleep/bedtime-stories.tsx` (Chunk 3 deferred this here). Plus there are 3 no-param inline switches in detail screens (`album/[id]`, `series/[id]`, `sleep/[id]`) — but those are inside the screens that just got collapsed, so they may have already vanished by Step 6.

- File: `features/library/contentIcons.ts`
- Signature: `export function getCategoryIcon(category: string): keyof typeof Ionicons.glyphMap`
- Reconcile the three implementations (audit said: "Same icon mapping, slightly different default"). Pick a default that doesn't change visible behavior in any of the consuming screens; default-different cases should be handled at the call site if necessary.

Migrate the call sites. Confirm icons unchanged in simulator.

**Verify:** TS clean, no visual diff.

### Final state expectations

After all 8 steps land:
- `src/features/library/` is a complete feature module (components, hooks, screens, data, api from Phase 3, navigation, contentIcons, types, manifest, index).
- The three detail screens + three player screens are unified — total LOC for `app/{album,series,course}/**.tsx` drops from ~2,400 to ~120 (each route ≤10 LOC).
- `navigateToContent` and `getCategoryIcon` are no longer duplicated; library owns them.
- `features/library/index.ts` re-exports `CollectionDetailScreen`, `CollectionItemPlayerScreen`, `navigateToContent`, `getCategoryIcon`, `manifest` — the public surface that home, downloads, future Discover use.
- Route URLs unchanged: `/album/[id]`, `/series/[id]`, `/course/[id]` and their player sub-routes still work.

### Commit cadence

8 steps → 8 commits (or fewer if Steps 4/6 are batched). Use commit message style consistent with prior commits:
- `Add CollectionConfig contract for library feature`
- `Add useCollectionDetail hook (library, Phase 5 Step 3)`
- `Unify album/series/course detail screens (library, Phase 5 Step 4)`
- etc.

Always include the `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer.

### Open decisions worth raising before coding

These are real choices the fresh session shouldn't make unilaterally. Ask the user before committing to a direction:

1. **Course-specific behavior layering.** The `CollectionConfig` proposal above uses a `parseChildCode` hook for course code parsing (CBT101M1L). Is that the right abstraction, or should course rendering quirks live inside `CollectionDetailScreen` behind a `contentType === 'course'` conditional? Both work; the choice affects how clean the config stays.
2. **`MediaPlayer` integration.** The three player screens all use `<MediaPlayer>` from `src/components/MediaPlayer.tsx` (still in pre-refactor location). Phase 5 keeps it there; Phase 6 moves it to `shared/media-player/`. Confirm we're OK with this temporary state.
3. **Library tab home screen.** Confirm we're deferring it to Phase 7 — Phase 5 only delivers the feature *module*, not the tab.

## Phase 2 — complete

The feature module pattern is now established with `breathing` as the canonical template. Every subsequent feature follows this shape:

```
src/features/<name>/
  components/    private React components used only inside the feature
  hooks/         private React hooks used only inside the feature
  screens/       screen implementations imported by /app/<route>.tsx
  data/          static catalogues, seed content (kept here so the feature works offline)
  api/           Firestore + network calls (added in Phase 3 when firestoreService is split)
  types.ts       feature-local domain types
  manifest.ts    declaration matching FeatureManifest from src/registry.ts
  index.ts       public API — the only file other features may import from
```

Established in this phase:
- `src/registry.ts` — the `FeatureManifest` type contract (id, label, description, icon, color, route, category, requiresAuth, requiresSubscription, searchKeywords, enabled) plus a placeholder `featureRegistry: FeatureManifest[]` array. Phase 7 fills the array with a builder.
- `FeatureCategory` taxonomy: `practice | library | progress | account | legal`
- The convention that `index.ts` is the only externally-visible surface (enforced by ESLint in Phase 8)
- The convention that route files in `/app/<route>.tsx` import the screen from `features/<name>` (via index.ts) and apply route-level concerns (`ProtectedRoute`, etc.)

Breathing-specific moves:
- `src/components/BreathingGuide.tsx` → `src/features/breathing/components/BreathingGuide.tsx`
- `src/hooks/useBreathing.ts` → `src/features/breathing/hooks/useBreathing.ts`
- Created `src/features/breathing/screens/BreathingScreen.tsx` from the body of `app/breathing.tsx`
- Created `src/features/breathing/data/techniques.ts` with the 4 hardcoded techniques (Box, 4-7-8, Belly, Coherent)
- Created `src/features/breathing/types.ts` (moved `BreathingPattern` + `BreathingExercise` from `src/types`, plus the local `BreathingTechnique` UI catalogue type)
- Created `src/features/breathing/manifest.ts` (the canonical example manifest)
- Created `src/features/breathing/index.ts` (re-exports `BreathingScreen` + `manifest`)
- `app/breathing.tsx` reduced to a 13-line wrapper that just imports the screen and wraps it in `ProtectedRoute`
- `src/types/index.ts` now re-exports `BreathingPattern` and `BreathingExercise` from the feature (legacy compat for `firestoreService` until Phase 3 splits it)

TypeScript: still 0 errors.

## Phase 1 — complete

All 11 subsystems landed in `src/core/`. 12 if you count `core/env/` which we added during execution (not in the original target arch — env access deserved its own folder rather than getting bundled under storage).

Final layout under `src/core/`:
```
src/core/
  ui/          AnimatedPressable, AnimatedView, Skeleton, ProgressRing, TabBarButton, scale
  theme/       ThemeContext, index (tokens), useFonts
  firebase/    index (Firebase init + auth/db/storage exports)
  env/         index (requireEnv, getEnv, getEnvList helpers)
  storage/     keys (ONBOARDING_KEY, THEME_MODE_KEY)
  query/       QueryProvider (TanStack + persistence)
  network/     NetworkContext
  notifications/  notificationService (no consumers; here for when wired up)
  audio/       useAudioPlayer, useBackgroundAudio, useAudioUrlQueries, audioFiles
  auth/        AuthContext, ProtectedRoute, useProviderManagement
  subscription/  SubscriptionContext, AuthSubscriptionManager
  nav/         OfflineNavigator
```

What's still left in `src/` (to be addressed in later phases):
- `src/components/` — shared UI like ContentCard, MediaPlayer, LoadingScreen, PaywallModal, etc. (Phase 2 destinations: `shared/`, `features/auth`, `features/subscription`, etc.)
- `src/contexts/SleepTimerContext.tsx` — going to `shared/media-player/` in Phase 5
- `src/hooks/` — feature-specific hooks (useBreathing, useMeditation, usePlayerBehavior, useStats) plus `hooks/queries/` (will split into per-feature data modules)
- `src/services/firestoreService.ts` — the 2,604-line mega-repository, slated for splitting per feature in Phase 3
- `src/services/downloadService.ts` — going to `features/downloads/` in Phase 6
- `src/constants/imageFiles.ts`, `src/types/index.ts`, `src/utils/{courseCodeParser, guestNickname}.ts` — various Phase 5/6 destinations
- `src/components/__tests__/` — stays put, test files

Dead code removed during Phase 1:
- `src/services/audioService.ts` (146 LOC — `configureAudioMode` + dead `audioService` shim)
- `src/components/PreloadGate.tsx`
- `src/contexts/ContentPreloadContext.tsx` (was already slated for Phase 4 deletion; pulled forward because zero consumers)
- `src/managers/` directory (emptied after `AuthSubscriptionManager` moved)
- `src/providers/` directory (emptied after `QueryProvider` moved)

TypeScript: still 0 errors throughout. Five Phase 1 commits on `main`:
- `ef5bd9e` core/ui
- `fe11302` core/theme
- `e87bb61` core/{firebase, env, storage, query, network, notifications}
- `8c8e5d2` core/audio
- (this commit) core/{auth, subscription, nav}

---

## 1. Headline findings (the things that change the plan)

1. **`src/services/firestoreService.ts` is 2,604 lines and is imported by every feature.** It is *the* universal coupling point. Splitting it by feature is the single highest-leverage move in the refactor and must come early.
2. **`album` + `series` + `course` are one feature, not three.** Detail screens are ~510 LOC each and structurally identical; player screens are ~250 LOC each and identical. Unifying them as a `library` feature with three content-type configs drops ~3,000 LOC and removes the worst duplication in the app.
3. **There is ~5,000 LOC of dead or duplicated code that should be deleted, not migrated.** Five orphaned components (~1,400 LOC), `seedContent.ts` shipping in the bundle with no consumers (~1,300 LOC), a duplicate sleep-sounds screen, a dead nested `_layout.tsx`, and overlapping helpers. Deleting first means less to refactor.
4. **`ContentPreloadContext` duplicates React Query.** It reimplements stale-while-revalidate caching that `QueryProvider` already provides via TanStack + AsyncStorage persistence. Should be deleted in favor of `useQuery` consumers, not migrated.
5. **`MediaPlayer.tsx` is 1,461 LOC and the central cross-feature surface.** Used by 8 routes across meditation, music, sleep, library content, emergency, and downloads. Needs a dedicated `shared/media-player/` module with an orchestration hook extracted from the view.
6. **Live debug telemetry posting to `http://127.0.0.1:7242/...` is still in production code** — in `AuthContext.tsx` lines 363-388 and `AccountPromptModal.tsx` lines 107/114/123. Strip before any refactor work begins.
7. **Hardcoded secrets in client code**: RevenueCat API keys, Google OAuth client IDs, Firebase config, admin UID allowlist. Should move to env config during cleanup.
8. **`usePlayerBehavior` and `ContentPreloadContext` are "screen-shaped" abstractions** — they bundle favorites + ratings + history + paywall + content-fetch into one hook each. Both should be decomposed so each piece can live with its rightful feature.

---

## 2. Refined target architecture

```
/app                                  ← routing layer only; route files become 5–20 line wrappers
  (tabs)/                             ← Home / Music / Meditate / Sleep / Profile  (or Home/Discover/Practice/Library/Profile — see decisions)
  meditation/, meditations/           ← thin wrappers, screen impls live in src/features/meditation
  music/, sleep/, breathing.tsx       ← idem
  album/, series/, course/            ← thin wrappers around features/library
  downloads/, emergency/              ← idem
  account-security, login, settings, onboarding, privacy, terms, stats, index, _layout

/src
  core/                               ← shared infrastructure — features depend on these
    ui/                               ← AnimatedPressable, AnimatedView, Skeleton, ProgressRing, TabBarButton, scale
    theme/                            ← ThemeContext, theme tokens, useFonts (single source of truth)
    auth/                             ← AuthContext, ProtectedRoute, useProviderManagement, cleanup-registry
    network/                          ← NetworkContext
    firebase/                         ← firebase.ts + generic Firestore helpers
    query/                            ← QueryProvider (TanStack + AsyncStorage persistence)
    subscription/                     ← SubscriptionContext, AuthSubscriptionManager
    audio/                            ← useAudioPlayer, useBackgroundAudio, useAudioUrlQueries, audio URL helpers
    notifications/                    ← notificationService
    nav/                              ← OfflineNavigator, PreloadGate, route constants
    storage/                          ← AsyncStorage facade
    analytics/                        ← (placeholder; replaces the localhost-fetch debug telemetry)

  shared/                             ← cross-feature reusable code that's not a primitive
    types/                            ← cross-feature discriminators: SessionType, RatingType, ReportCategory
    cards/                            ← ContentCard (used by 4 tabs)
    loading/                          ← LoadingScreen (branded)
    modals/                           ← ReportModal (if kept generic)
    media-player/                     ← MediaPlayer (view), AudioControls (was AudioPlayer), BackgroundAudioPicker, SleepTimerPicker, useMediaPlayerOrchestration
    player-behavior/                  ← decomposed usePlayerBehavior pieces (or absorbed into media-player)

  features/                           ← self-contained modules; one folder per feature
    auth/                             ← LoginScreen, AccountSecurityScreen, AccountPromptModal, AccountSwitchWarning, CredentialCollisionModal
    subscription/                     ← PaywallModal, RecoveryWizard, PremiumGate(?), onboarding paywall
    onboarding/                       ← OnboardingScreen, feature catalogues, onboarding state
    home/                             ← HomeScreen (assembles cards from other features' hooks)
    meditation/                       ← MeditateHomeScreen, MeditationPlayerScreen, AllMeditationsScreen, TechniquesScreen, TherapiesScreen, useMeditation, useMeditateQueries, meditation Firestore data
    music/                            ← MusicHomeScreen, SoundListScreen (parameterized), SoundPlayerScreen, useMusicQueries, useMusicSleepTimer, music Firestore data
    sleep/                            ← SleepHomeScreen, BedtimeStoriesScreen, SleepMeditationsScreen, single-item players, useSleepQueries, sleep Firestore data, SleepTimerContext (if confirmed sleep-only)
    library/                          ← CollectionDetailScreen, CollectionItemPlayerScreen (handle album/series/course via contentType config), navigateToContent, contentIcons, collection lookups, getContentById, favorites/ratings/reports/quotes, narrators
    breathing/                        ← BreathingScreen, BreathingGuide, useBreathing, breathing techniques data
    emergency/                        ← EmergencyPlayerScreen, emergency meditation data
    downloads/                        ← DownloadsScreen, OfflinePlayerScreen, DownloadButton, downloadService
    progress/                         ← StatsScreen, useStats, StatsCard, milestones, sessions/history/playback-progress/completed-content data
    profile/                          ← ProfileScreen
    settings/                         ← SettingsScreen (theme/notifications)
    legal/                            ← PrivacyScreen, TermsScreen

  registry.ts                         ← imports every features/*/manifest.ts → powers Discover, search, deep links
  test-setup.ts                       ← unchanged
```

### Three invariants this design enforces

1. **Dependency direction is one-way:** `features → shared → core`. Never `feature → feature`. Enforced by ESLint `no-restricted-imports` in Phase 5.
2. **Every feature has a `manifest.ts`** declaring id, display name, icon, route, category, requires-auth, requires-subscription, search keywords. Source of truth for Discover, search, and personalization.
3. **`core/ui/` is the only place atomic styles live.** Features compose primitives.

---

## 3. Inventory by target bucket

### `core/ui/` — atomic primitives
| Current location | Notes |
|---|---|
| `src/components/AnimatedPressable.tsx` | clean |
| `src/components/AnimatedView.tsx` | clean |
| `src/components/Skeleton.tsx` | clean |
| `src/components/ProgressRing.tsx` | currently unused — keep as primitive for stats/timer to compose |
| `src/components/TabBarButton.tsx` | clean |
| `src/utils/scale.ts` | used by theme |

### `core/theme/`
| Current location | Notes |
|---|---|
| `src/contexts/ThemeContext.tsx` | fix storage-key inconsistency (`@calmdemy_theme_mode` vs `@theme_mode` used in AuthContext preserve list) |
| `src/theme/index.ts` | dedupe `fonts` (currently also in `useFonts.ts`) |
| `src/hooks/useFonts.ts` | merge `fonts` source of truth |

### `core/auth/`
| Current location | Notes |
|---|---|
| `src/contexts/AuthContext.tsx` | strip localhost debug fetches; move OAuth client IDs to env; introduce cleanup-registry instead of direct calls to `downloadService.deleteAllDownloads` and `firestoreService.deleteUserAccount` |
| `src/components/ProtectedRoute.tsx` | clean |
| `src/hooks/useProviderManagement.ts` | clean |

### `core/network/`
| Current location | Notes |
|---|---|
| `src/contexts/NetworkContext.tsx` | clean |

### `core/firebase/`
| Current location | Notes |
|---|---|
| `src/firebase.ts` | move config to env |
| Generic helpers extracted from `firestoreService.ts` | timestamp conversion, base CRUD helpers |

### `core/query/`
| Current location | Notes |
|---|---|
| `src/providers/QueryProvider.tsx` | fix stale comment about staleTime |

### `core/subscription/`
| Current location | Notes |
|---|---|
| `src/contexts/SubscriptionContext.tsx` | move RevenueCat keys + admin UIDs to env; fix missing `user?.uid` dep in observer effect; dedupe `PREMIUM_ENTITLEMENT_ID` |
| `src/managers/AuthSubscriptionManager.ts` | document the deliberate `core/subscription → core/auth` dependency |

### `core/audio/`
| Current location | Notes |
|---|---|
| `src/hooks/useAudioPlayer.ts` | clean primitive used by every player |
| `src/hooks/useBackgroundAudio.ts` | clean |
| `src/hooks/queries/useAudioUrlQueries.ts` | clean |
| `src/constants/audioFiles.ts` — helpers half | `getAudioUrl`, `getAudioUrlFromPath`, `preloadAudioUrls`, URL cache → here. `storagePaths` asset registry can stay centralized as an asset manifest (or split per feature later) |
| `src/services/audioService.ts` | delete the `audioService` shim (dead, self-deprecated); keep only `configureAudioMode` in bootstrap |

### `core/notifications/`
| Current location | Notes |
|---|---|
| `src/services/notificationService.ts` | clean |

### `core/nav/`
| Current location | Notes |
|---|---|
| `src/components/OfflineNavigator.tsx` | extract `/downloads` + `/(tabs)/home` literals to a route constants module |
| `src/components/PreloadGate.tsx` | clean (or move alongside the React Query refactor — see Decisions) |

### `shared/types/`
| Current location | Notes |
|---|---|
| `src/types/index.ts` — cross-feature parts | keep `SessionType`, `RatingType`, `ReportCategory`, `User`/`UserPreferences` here |
| `src/types/index.ts` — feature-specific parts | move `BreathingPattern` → `features/breathing/types`, `BedtimeStory` → `features/sleep/types`, `GuidedMeditation` → `features/meditation/types`, `MeditationProgram` → `features/meditation/types` (if revived) |
| Firestore-specific types (currently re-exported from `firestoreService.ts`) | move into respective feature/types — consistent location |

### `shared/cards/`, `shared/loading/`, `shared/modals/`
| Current location | Notes |
|---|---|
| `src/components/ContentCard.tsx` | used by 4 tab screens; allowed to read `core/subscription` for the lock badge |
| `src/components/LoadingScreen.tsx` | hardcodes Calmdemy branding — shared, not atomic |
| `src/components/ReportModal.tsx` | currently only used by `MediaPlayer`; could live next to it instead of in shared |

### `shared/media-player/`
| Current location | Notes |
|---|---|
| `src/components/MediaPlayer.tsx` | 1,461 LOC — extract `useMediaPlayerOrchestration` hook + thinner view |
| `src/components/AudioPlayer.tsx` | rename → `AudioControls` (it's the inner control surface) |
| `src/components/BackgroundAudioPicker.tsx` | currently imports `useSleepSounds` from music feature — break by accepting sounds via prop or via a shared sounds source |
| `src/components/SleepTimerPicker.tsx` | reads `SleepTimerContext` — see Decisions on ownership |

### `shared/player-behavior/`
| Current location | Notes |
|---|---|
| `src/hooks/usePlayerBehavior.ts` | screen-shaped god-hook; decompose into `useFavoriteToggle` (library), `usePlaybackTracking` (progress), `useContentRating` (library), `useContentReport` (library) — composed by the media-player screen |

### `features/auth/`
| Current location | Notes |
|---|---|
| `app/login.tsx` | move screen body to `LoginScreen.tsx`; inline Google SVG → `assets/google.svg.ts` |
| `app/account-security.tsx` | move to `AccountSecurityScreen.tsx` |
| `src/components/AccountPromptModal.tsx` | strip localhost debug fetches |
| `src/components/AccountSwitchWarning.tsx` | keep (the one actually wired in) |
| `src/components/CredentialCollisionModal.tsx` | clean |
| `app/index.tsx` (bootstrap routing) | extract decision into `features/auth/bootstrap/useStartupRoute.ts` |

### `features/subscription/`
| Current location | Notes |
|---|---|
| `src/components/PaywallModal.tsx` | currently imports `AccountPromptModal` (auth) — invert via callback so auth modal is passed in or invoked via core/flows orchestrator |
| `src/components/RecoveryWizard.tsx` | currently calls auth `signInWith*` — same pattern: invert |
| `src/components/PremiumGate.tsx` | DECIDE: adopt or delete (currently has no callers) |

### `features/onboarding/`
| Current location | Notes |
|---|---|
| `app/onboarding.tsx` | move to `OnboardingScreen.tsx`; feature catalogues → `data/`; share `@calmdemy_onboarding` AsyncStorage key with `app/index.tsx` via a constant |

### `features/home/`
| Current location | Notes |
|---|---|
| `app/(tabs)/home.tsx` | 848 LOC. Move body to `HomeScreen.tsx`. Cross-feature `navigateToContent` and lookup helpers move to `features/library/navigation.ts`. `generateGuestNickname` duplicate → `src/utils/guestNickname.ts` |

### `features/meditation/`
| Current location | Notes |
|---|---|
| `app/(tabs)/meditate.tsx` | → `MeditateHomeScreen.tsx`; dedupe `themeCategories`/`therapyCategories`/`techniqueCategories` constants |
| `app/meditation/[id].tsx` | → `MeditationPlayerScreen.tsx` (singleton-fetch player template) |
| `app/meditations/index.tsx` | → `AllMeditationsScreen.tsx` |
| `app/meditations/techniques.tsx` | → `TechniquesScreen.tsx` |
| `app/meditations/therapies.tsx` | → `CoursesByTherapyScreen.tsx` (it's actually filtering courses, not therapies) |
| `src/hooks/useMeditation.ts` | clean |
| `src/hooks/queries/useMeditateQueries.ts` | clean (but `getEmergencyMeditations` reference moves to `features/emergency`) |
| `src/components/MeditationTimer.tsx`, `src/components/MeditationCard.tsx` | DECIDE: dead today; revive or delete |
| Meditation data from `firestoreService.ts` | `getMeditations`, `getMeditationsByTheme`, `getMeditationsByTechnique`, `getMeditationById`, `getCourses`, `getCourseById`, `getCourseSessionsByCourseId`, `findCourseIdBySessionId`, course/Firestore types |

### `features/music/`
| Current location | Notes |
|---|---|
| `app/(tabs)/music.tsx` | → `MusicHomeScreen.tsx` |
| `app/music/[id].tsx` | needs `getSoundById` (currently fetches all 4 sources and searches in JS); adopt `usePlayerBehavior`; sleep timer logic to `useMusicSleepTimer.ts` |
| `app/music/asmr.tsx`, `music/white-noise.tsx`, `music/music.tsx`, `music/nature-sounds.tsx` | collapse into one `SoundListScreen.tsx` parameterized by category |
| `src/components/SoundPlayer.tsx` | rename → `LoopingSoundScreen` for clarity |
| `src/hooks/queries/useMusicQueries.ts` | clean |
| Music data from `firestoreService.ts` | `getSleepSounds`, `getBackgroundSounds`, `getWhiteNoise`, `getMusic`, `getAsmr`, `getAlbums` (the album→library boundary is fine; this just lists them) |

### `features/sleep/`
| Current location | Notes |
|---|---|
| `app/(tabs)/sleep.tsx` | → `SleepHomeScreen.tsx` |
| `app/sleep/[id].tsx`, `app/sleep/meditation/[id].tsx` | adopt singleton-fetch player template |
| `app/sleep/bedtime-stories.tsx`, `app/sleep/sleep-meditations.tsx` | adopt shared list-screen template |
| `src/contexts/SleepTimerContext.tsx` | DECIDE: ownership (sleep-only or shared?) |
| `src/hooks/queries/useSleepQueries.ts` | clean |
| Sleep data from `firestoreService.ts` | `getBedtimeStories`, `getBedtimeStoryById`, `getSleepMeditations`, `getSleepMeditationById`, `getSeries` (series goes to library), `getSeriesById` (→ library) |

### `features/library/` — NEW (the biggest extraction win)
| Current location | Notes |
|---|---|
| `app/album/[id].tsx`, `app/series/[id].tsx`, `app/course/[id].tsx` | collapse into `CollectionDetailScreen.tsx` parameterized by content type |
| `app/album/track/[id].tsx`, `app/series/chapter/[id].tsx`, `app/course/session/[id].tsx` | collapse into `CollectionItemPlayerScreen.tsx` parameterized by content type |
| Library data from `firestoreService.ts` | `getContentById` + `ResolvedContent` (polymorphic resolver), `getAlbumById`, `getSeriesById`, `findAlbumIdByTrackId`, `findSeriesIdByChapterId`, `findCourseIdBySessionId`, `getNarrators`, `getNarratorByName`, `getNarratorProfileUrl`, `getUserFavorites`, `toggleFavorite`, `isFavorite`, `getUserRating`, `setContentRating`, `reportContent`, `getTodayQuote` |
| `src/utils/courseCodeParser.ts` | utility for course content type |
| `navigation.ts` | `navigateToContent(id, type, router)` — used by home, downloads, search, future features |
| `contentIcons.ts` | dedupe `getCategoryIcon` from 5 places |

### `features/breathing/`
| Current location | Notes |
|---|---|
| `app/breathing.tsx` | → `BreathingScreen.tsx`; hardcoded technique catalogue → `data/techniques.ts` |
| `src/components/BreathingGuide.tsx` | clean |
| `src/hooks/useBreathing.ts` | clean |
| `getBreathingExercises` from `firestoreService.ts` | move here |

### `features/emergency/`
| Current location | Notes |
|---|---|
| `app/emergency/[id].tsx` | → `EmergencyPlayerScreen.tsx`; local `adjustColor` → `src/utils/color.ts` |
| Emergency data from `firestoreService.ts` | `getEmergencyMeditations`, `getEmergencyMeditationById`, `FirestoreEmergencyMeditation` |

### `features/downloads/`
| Current location | Notes |
|---|---|
| `app/downloads/index.tsx` | → `DownloadsScreen.tsx`; uses shared `navigateToContent` |
| `app/downloads/player.tsx` | → `OfflinePlayerScreen.tsx`; decide whether to adopt `usePlayerBehavior` |
| `src/components/DownloadButton.tsx` | clean |
| `src/services/downloadService.ts` | clean; `deleteAllDownloads` should be invoked via core/auth cleanup-registry, not imported by AuthContext |

### `features/progress/`
| Current location | Notes |
|---|---|
| `app/stats.tsx` | → `StatsScreen.tsx`; extract time-range math to `utils/timeRange.ts` |
| `src/hooks/useStats.ts` | clean |
| `src/components/StatsCard.tsx` | move here |
| Progress data from `firestoreService.ts` | `createSession`, `getUserSessions`, `getUserStats`, `updateUserStats`, `calculateStreak`, `addToListeningHistory`, `getListeningHistory`, `savePlaybackProgress`, `getPlaybackProgress`, `clearPlaybackProgress`, `markContentCompleted`, `getCompletedContentIds`, `isContentCompleted` |
| Milestones array + `getNextMilestone` (currently in profile.tsx) | move here |

### `features/profile/`
| Current location | Notes |
|---|---|
| `app/(tabs)/profile.tsx` | → `ProfileScreen.tsx`; stats summary fragment can compose `features/progress` |

### `features/settings/`
| Current location | Notes |
|---|---|
| `app/settings.tsx` | → `SettingsScreen.tsx`; delete-account flow → `features/auth/hooks/useAccountDeletion.ts` |

### `features/legal/`
| Current location | Notes |
|---|---|
| `app/privacy.tsx`, `app/terms.tsx` | move screen bodies; consider Markdown assets for the policy text |

### `app/` — routing layer (thin)
All route files reduce to 5–20 line wrappers that import a screen from `features/<name>/screens/`. The two real routing files stay:
- `app/_layout.tsx` (provider tree → moves to `src/app/AppProviders.tsx`; Stack.Screen list regenerated after feature moves)
- `app/(tabs)/_layout.tsx` (tab bar config)

---

## 4. Files to delete (~5,000 LOC, do this first)

### Dead components (no callers in repo)
- `src/components/MeditationCard.tsx` (301 LOC)
- `src/components/MeditationTimer.tsx` (297 LOC) — if revived, must compose `ProgressRing` instead of reimplementing SVG arc math
- `src/components/AccountSwitchConfirmModal.tsx` (293 LOC) — `AccountSwitchWarning.tsx` is the one actually wired in
- `src/components/PremiumGate.tsx` (355 LOC) — premium gating currently done ad-hoc via `useSubscription` + `PaywallModal`. Decide adopt-or-delete.
- `src/components/ProgressRing.tsx` — KEEP as `core/ui` primitive (architecturally pure, even if unused today)

### Dead routes
- `app/meditations/technique/_layout.tsx` — registers a `[id]` screen that doesn't exist
- `app/sleep-sounds.tsx` — older duplicate of `app/music/nature-sounds.tsx` using direct Firestore + local audio player instead of React Query

### Dev-only files shipping in bundle
- `src/data/seedContent.ts` (1,314 LOC) — no runtime consumers; move to `scripts/seed/`

### Architecture-level deletion
- `src/contexts/ContentPreloadContext.tsx` (and `src/components/PreloadGate.tsx` if appropriate) — duplicates React Query. Migrate consumers to `useQuery` + `refetch`, then delete.
- `src/services/audioService.ts` — the exported `audioService` is self-documented dead code. Keep only `configureAudioMode` (inlined into bootstrap).

### Hygiene: pre-refactor cleanup
- Strip `fetch('http://127.0.0.1:7242/ingest/...')` calls from `AuthContext.tsx` (lines 363-388) and `AccountPromptModal.tsx` (lines 107/114/123)
- Move secrets to env config: RevenueCat keys (`SubscriptionContext.tsx`), Google OAuth client IDs (`AuthContext.tsx`), Firebase config (`firebase.ts`), admin UID allowlist (`SubscriptionContext.tsx`)
- Fix theme storage-key inconsistency (`@calmdemy_theme_mode` vs `@theme_mode`)
- Dedupe `PREMIUM_ENTITLEMENT_ID` (in `SubscriptionContext.tsx` and `AuthSubscriptionManager.ts`)
- Dedupe `fonts` (in `useFonts.ts` and `theme/index.ts`)
- Dedupe `generateGuestNickname` (in `home.tsx` and `profile.tsx`)
- Dedupe `getCategoryIcon` (in `music.tsx`, `sleep.tsx`, `bedtime-stories.tsx`, `music/asmr.tsx` and siblings)
- Dedupe `themeCategories`, `therapyCategories`, `techniqueCategories` (each in 2-3 files)
- Constant for `@calmdemy_onboarding` AsyncStorage key (used as string literal in 2 files)

---

## 5. Cross-feature couplings to break

Prioritized by blast radius:

1. **`firestoreService.ts` → every feature** (severity: blocker). Split per the bucket map in §3. Keep a barrel re-export at the old path during transition so nothing breaks.
2. **`ContentPreloadContext` → every feature**. Delete and replace with React Query consumers.
3. **`(tabs)/home.tsx` → 8 content types via a switch + 3 cross-feature lookup helpers**. Extract to `features/library/navigation.ts`; home composes feature data via `useQuery` hooks.
4. **`AuthContext.deleteAccount` → `downloadService.deleteAllDownloads` + multi-feature Firestore cleanup**. Solution: `core/auth/cleanup-registry`, features register teardown hooks at boot.
5. **`PaywallModal` (subscription) → `AccountPromptModal` (auth)**. Pass auth modal via callback or via a `core/billing-flows` orchestrator.
6. **`RecoveryWizard` (subscription) → auth `signInWith*` methods**. Same pattern — invert.
7. **`BackgroundAudioPicker` (in shared media-player) → `useSleepSounds` (music feature data)**. Solution: sound list is passed in as a prop, or a `core/data/ambient-sounds` source serves both.
8. **`SleepTimerContext` → `MediaPlayer.registerAudioPlayer` (side-channel callback)**. Invert: player accepts a `fadeOutController` prop owned by sleep.
9. **`usePlayerBehavior` → library (favorites/ratings) + progress (history) + subscription (paywall) + core/audio**. Decompose into smaller hooks owned by their features; the media-player screen composes them.
10. **`OfflineNavigator` hardcodes `/downloads` and `/(tabs)/home`**. Extract to route constants.

---

## 6. Things that must be split

- **`src/services/firestoreService.ts` (2,604 LOC)** — split per the bucket map in §3.
- **`src/hooks/queries/useHomeQueries.ts`** — split: `useTodayQuote` → library, `useListeningHistory` → progress (or library), `useFavorites` → library, `useDownloadedContent` → downloads, `useUserStats` → progress.
- **`src/types/index.ts`** — keep cross-feature discriminators in `shared/types`; move per-feature shapes to features.
- **`src/constants/audioFiles.ts`** — split: keep helpers (`getAudioUrl`, `getAudioUrlFromPath`, `preloadAudioUrls`, URL cache) in `core/audio`; asset registry `storagePaths` can stay central or be split per feature.
- **`src/components/MediaPlayer.tsx` (1,461 LOC)** — extract `useMediaPlayerOrchestration` hook; thinner view component.

---

## 7. Refined migration plan

**Phase 0a — Cleanup & hygiene (1–2 days)**
- Strip debug telemetry fetches
- Move secrets to env config
- Delete 5,000+ LOC of dead/duplicate code (per §4)
- Dedupe constants and helpers
- Fix theme storage-key bug
- No architectural moves yet — just deletions and small fixes; ship and verify before refactoring

**Phase 0b — Commit on ambiguous ownership (½ day)**
- SleepTimerContext: sleep-only or shared?
- PremiumGate: adopt or delete?
- MeditationTimer / MeditationCard: revive or delete?
- ReportModal: shared or media-player-local?
- Tab structure: keep current 5 or switch to a Discover-style layout?

**Phase 1 — Extract `core/` (2 days)**
- Move all infra (`auth`, `theme`, `network`, `firebase`, `query`, `subscription`, `audio`, `notifications`, `nav`, `storage`) to `src/core/`
- Update imports across the repo
- Establish `core/auth/cleanup-registry` and switch `deleteAccount` to use it
- App keeps working throughout; this is mechanical refactor

**Phase 2 — Establish the feature module pattern with `breathing` (½–1 day)**
- Migrate `breathing` into `src/features/breathing/{api,components,hooks,screens,data,manifest,index}` as the canonical template
- Validate the pattern (public API via `index.ts`, manifest shape, screen extraction from route)
- Document the template for the remaining features

**Phase 3 — Split `firestoreService.ts` (1–2 days)**
- Carve into per-feature data modules (per §3 mapping)
- Keep a barrel re-export at the old path so nothing breaks during transition
- Migrate consumers off the barrel; remove old path

**Phase 4 — Delete `ContentPreloadContext` (½ day)**
- Replace consumers with React Query `useQuery`/`refetch`
- Remove `ContentPreloadContext` and `PreloadGate`

**Phase 5 — Build `library` feature (2 days; biggest LOC win)**
- Create `features/library/` with `CollectionDetailScreen` + `CollectionItemPlayerScreen` parameterized by content-type config
- Migrate `album/*`, `series/*`, `course/*` route files to thin wrappers around the unified screens
- Add `navigateToContent`, `contentIcons`, collection lookups
- ~3,000 LOC reduction

**Phase 6 — Migrate remaining existing features (1 day each)**
- Order: `meditation` → `music` → `sleep` → `progress` → `profile` → `settings` → `legal` → `auth` → `subscription` → `onboarding` → `home` → `emergency` → `downloads`
- Each migration includes: screen extraction from route, data extraction from feature, manifest creation, hook decomposition where applicable
- For `music`/`sleep`/`meditation`: also apply the shared list-screen template
- For media-player: extract orchestration hook, rename for clarity (`AudioPlayer` → `AudioControls`, etc.)

**Phase 7 — Build the registry + Discover screen (½–1 day)**
- Wire `features/*/manifest.ts` into `src/registry.ts`
- Build the Discover screen that lists every feature by category, with search

**Phase 8 — Enforce boundaries (½ day)**
- ESLint `no-restricted-imports` rules: `features/X` can't import from `features/Y`, only from `core/*` and `shared/*`
- Type-check passes
- CI enforcement

**Phase 9 — New features (Journal/CBT, Mood, etc.)**
Now each new feature is just a `src/features/<name>/` folder + a thin route in `app/`. Same template as breathing.

**Total: ~3 weeks of focused refactor work.** App ships throughout; each phase is a self-contained PR.

---

## 8. Decisions needed before code moves

1. **Tab structure** — keep Home/Music/Meditate/Sleep/Profile, or rebalance to Home/Discover/Practice/Library/Profile (more super-app, enables the registry-driven Discover tab)?
2. **`SleepTimerContext` ownership** — sleep-only feature, or shared timer used by music/meditation too?
3. **`PremiumGate`** — adopt the abstraction (and refactor ad-hoc paywall checks to use it) or delete?
4. **`MeditationTimer` / `MeditationCard`** — revive or delete?
5. **`ReportModal`** — live in `shared/modals/` or next to `MediaPlayer` in `shared/media-player/`?
6. **`storagePaths` audio registry** — keep centralized as an asset manifest, or split per feature?
7. **Music single-item player rewrite** — `app/music/[id].tsx` currently fetches all 4 sources and searches in JS; OK to add a `getSoundById` Firestore helper as part of the music feature migration?
8. **List-screen template location** — `src/shared/AudioListScreen.tsx` (one shared template) or a per-feature `SoundListScreen.tsx` (parameterized within the feature)?
9. **Hold-the-line strictness** — ESLint boundary violations as errors (refuses to compile) or warnings?
10. **Naming** — rename `AudioPlayer` → `AudioControls`, `MediaPlayer` → `TrackPlayerScreen`, `SoundPlayer` → `LoopingSoundScreen` (current names are confusing) — agree?
