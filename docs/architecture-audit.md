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
| 1 | `legal` | `app/privacy.tsx`, `app/terms.tsx` | Static content, trivial — proves the template |
| 2 | `emergency` | `app/emergency/[id].tsx` + `_layout.tsx` | Single small player, params-based (no fetch) |
| 3 | `settings` | `app/settings.tsx` | Delete-account flow → `features/auth/hooks/useAccountDeletion.ts` |
| 4 | `profile` | `app/(tabs)/profile.tsx` | Milestones array + `getNextMilestone` → `features/progress`; stats summary composes from `features/progress` |
| 5 | `progress` | `app/stats.tsx` | Time-range math → `features/progress/utils/timeRange.ts`; `StatsCard` moves here |
| 6 | `downloads` | `app/downloads/{index,player}.tsx` | `downloadService.ts` → `features/downloads/api/`; `DownloadButton` moves here; offline player has its own quirks |
| 7 | `auth` | `app/login.tsx`, `app/account-security.tsx` | 5 auth-modal components (`AccountPromptModal`, `AccountSwitchWarning`, `CredentialCollisionModal`, plus `AccountSwitchConfirmModal` consolidation per locked decision); inline Google SVG → `features/auth/assets/`; bootstrap routing in `app/index.tsx` extracts to `features/auth/bootstrap/useStartupRoute.ts` |
| 8 | `subscription` | (no routes; modal-based) | `PaywallModal`, `RecoveryWizard` move here. Phase 6d breaks the `PaywallModal → AccountPromptModal` (subscription → auth) coupling. |
| 9 | `onboarding` | `app/onboarding.tsx` (869 LOC) | Hardcoded free/premium feature catalogues → `data/`; `@calmdemy_onboarding` AsyncStorage key already centralised in `core/storage/keys`. |
| 10 | `home` | `app/(tabs)/home.tsx` (752 LOC after Phase 5) | Most cross-feature-coupled screen. Composes from many features via the registry-style pattern. `generateGuestNickname` already in `src/utils/`. |
| 11 | `meditation` | `app/(tabs)/meditate.tsx`, `app/meditation/[id].tsx`, `app/meditations/{index,techniques,therapies}.tsx` | Themecategories/therapyCategories/techniqueCategories arrays — Chunk 3 deferred dedupe here. Use the 6b list-screen template for index/techniques/therapies. `useMeditation` and `useMeditateQueries` move here. |
| 12 | `sleep` | `app/(tabs)/sleep.tsx`, `app/sleep/[id].tsx`, `app/sleep/meditation/[id].tsx`, `app/sleep/bedtime-stories.tsx`, `app/sleep/sleep-meditations.tsx` | The remaining inline `getCategoryIcon` (sleep-meditation detail) consolidates with `library/contentIcons`. Use the 6b list-screen template. `useSleepQueries` moves here. |
| 13 | `music` | `app/(tabs)/music.tsx`, `app/music/[id].tsx`, `app/music/{asmr,white-noise,music,nature-sounds}.tsx` | `SoundPlayer` renames to `LoopingSoundScreen` per locked decision and moves to `features/music/screens/`. `useMusicQueries` moves here. Music single-item player gets `getSoundById` per locked decision (Chunk 4 audit). Use the 6b list-screen template — 4 of music's list screens are near-byte-identical. |

`features/breathing/` already exists from Phase 2 — no migration needed, but check that nothing in `app/(tabs)/meditate.tsx` or anywhere expects to find breathing in `core/`.

After Phase 6c lands, `src/components/`, `src/hooks/`, `src/services/downloadService.ts`, and `src/types/index.ts` should be empty (or near-empty — `src/types/index.ts` keeps the cross-feature discriminators `SessionType`, `RatingType`, `ReportCategory`, `User`, `UserPreferences` — those move to `shared/types/` as the last step of 6c).

`src/hooks/queries/useHomeQueries.ts` splits during the home migration (step 10): `useTodayQuote` → library, `useListeningHistory` → progress (or library), `useFavorites` → library, `useDownloadedContent` → downloads, `useUserStats` → progress. Per the original audit §6.

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

### Phase 6e — Delete `firestoreService.ts` barrel

When every consumer has migrated to feature-local imports (during their 6c migration), the barrel has no remaining importers. Confirm with `grep -r "from.*services/firestoreService"` returning empty, then `git rm src/services/firestoreService.ts`. Final cleanup.

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
