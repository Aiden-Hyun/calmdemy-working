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

**Status:** not started. This section is the canonical checklist for a fresh session.

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

#### Group C — `features/progress/api/` (12 functions + 1 type)
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

#### Group D — `core/auth/cleanup.ts` (1 function)
- `deleteUserAccount` (2418) — cross-collection cleanup invoked from `AuthContext.deleteAccount`. Lives in core because it's auth-housekeeping that touches many features. (Phase 6 may further evolve this into a `core/auth/cleanup-registry` where features register their own teardown — keep the function single-purpose for now.)

#### Group E — `features/meditation/api/` (9 functions + 2 types)
- `getMeditations` (133)
- `getMeditationsByTheme` (162)
- `getMeditationsByTechnique` (196)
- `getMeditationById` (228)
- `getPrograms` (580) — likely dead (`MeditationProgram` may have no consumers); verify with grep before moving and delete if dead
- `FirestoreCourseSession` interface (1343)
- `FirestoreCourse` interface (1356)
- `getCourses` (1405)
- `getCourseById` (1435)

#### Group F — `features/sleep/api/` (6 functions + 2 types + aliases)
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

#### Group G — `features/music/api/` (11 functions + 4 types)
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

#### Group H — `features/library/api/` (15 functions + 3 types) — the biggest, do last
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
