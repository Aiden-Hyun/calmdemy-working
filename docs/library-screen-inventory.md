# Library screen inventory (Phase 5 Step 2 — design input)

> Temporary working notes for unifying `app/{album,series,course}/[id].tsx` into
> `CollectionDetailScreen`. **Delete after Phase 5.**
> Sources: `app/album/[id].tsx` (504 LOC), `app/series/[id].tsx` (513 LOC),
> `app/course/[id].tsx` (616 LOC).

## TL;DR

Album and series are ~95% identical (dark-only, `sleepyNight` gradient, `sleep*`
color tokens). **Course is the outlier**: it is light/dark-aware, adds a course-code
badge, subtitle, difficulty, per-session code meta, and a `dayNumber` badge, and
tints the play button with `course.color`. The unified screen should model
album/series as the default path and gate every course difference behind
`contentType === 'course'` (the locked decision).

## Shared state (all three)

| State | Type | Notes |
|---|---|---|
| `album` / `series` / `course` | `FirestoreAlbum/Series/Course \| null` | the fetched parent; rename to `parent` in the hook |
| `loading` | `boolean` | gates the spinner |
| `completedIds` | `Set<string>` | completed child ids for this child content type |
| `downloadedIds` | `Set<string>` | **set but never read in render** — `DownloadButton` self-manages via `refreshKey`. Keep the fetch (it warms nothing visible) only if parity demands; safe to drop from the hook's public surface. |
| `audioUrls` | `Map<string, string>` | child id → resolved download URL; gates whether `DownloadButton` renders |
| `refreshKey` | `number` | bumped on focus to force `DownloadButton` re-check |
| `showPaywall` | `boolean` | paywall modal visibility |
| `hasAutoOpened` | `useRef(false)` | guards the auto-open-once effect |

## Shared effects (all three)

1. **Load parent** — `useEffect([id])`: `setLoading(true)` → `fetchParentById(id)` → `setParent` → `setLoading(false)`.
2. **Completed ids on focus** — `useFocusEffect(useCallback([user]))`: if `user`, `getCompletedContentIds(user.uid, childContentType)` → `setCompletedIds`.
3. **Downloaded ids on focus + refreshKey bump** — `useFocusEffect(useCallback([]))`: `getDownloadedContentIds(childContentType)` → `setDownloadedIds`; then `setRefreshKey(k => k+1)`.
4. **Audio URLs** — `useEffect([parent])`: loop children, `getAudioUrlFromPath(child.audioPath)`, build `Map<childId, url>` → `setAudioUrls`. (Sequential `for…of await`; preserve behavior.)
5. **Auto-open** — `useEffect([parent, autoOpenItemId])`: if `parent && autoOpenItemId && !hasAutoOpened.current`, find child index; if found, set guard and `router.push(playerRoute params…)`.

## Shared handler

`handleChildPress(child, index)`: if `!child.isFree && !hasSubscription` → `setShowPaywall(true)`; else `router.push({ pathname: <player route>, params: {...} })`.

## Shared imports / dependencies

`ProtectedRoute` (route wrapper), `AnimatedView`, `AnimatedPressable`, `useTheme`,
`useAuth`, `useNetwork` (`isOffline`), `useSubscription` (`isPremium`),
`DownloadButton`, `getAudioUrlFromPath` (core/audio), `getDownloadedContentIds`
(downloadService), `getCompletedContentIds` + `fetchParentById` (firestoreService
barrel), `PaywallModal`, `LinearGradient`, `Ionicons`, expo `Image`.

## Shared visual scaffolding

`<View container><LinearGradient><SafeAreaView edges=['top']><ScrollView>`:
- **Hero** (`AnimatedView delay=0`): thumbnail image OR colored fallback icon circle; title; meta row (3 items); description.
- **Child list** (`AnimatedView delay=100` section title + mapped `AnimatedView delay=150+i*Δ`): each row = `AnimatedPressable` card → thumbnail-or-number badge, info block (title, [desc], meta row with duration + completed pill), conditional `DownloadButton` (when `!isOffline && audioUrls.get(childId)`), play/lock button.
- **Floating back button** (absolute `SafeAreaView`).
- **`PaywallModal`**.

## Per-type differences

| Aspect | album | series | course |
|---|---|---|---|
| Theming | dark only | dark only | **light/dark via `isDark`** (gradient + every color token switches) |
| Gradient | `sleepyNight` | `sleepyNight` | `isDark ? sleepyNight : [color30, color10, background]` |
| Hero fallback icon | `getCategoryIcon()` switch on `album.category` (ambient/piano/nature/classical/lofi → default `disc`) | `getCategoryIcon()` switch on `series.category` (fantasy/nature/travel/thriller/fiction → default `book`) | fixed `school` icon (no switch) |
| Code badge | — | — | `course.code` badge above title |
| Subtitle | — | — | `course.subtitle` (optional) |
| Meta row | `trackCount` tracks · `totalDuration` min · `artist` | `chapterCount` chapters · `totalDuration` min · `narrator` | `sessionCount` sessions · `totalDuration` min total · `difficulty` |
| Number badge | `track.trackNumber` | `chapter.chapterNumber` | `session.dayNumber` |
| Child description line | none | `chapter.description` (numberOfLines 1) | `session.description` (numberOfLines 1) + `buildSessionMetaInfo(session.code, course.code)` line when both codes present |
| Section title | "Tracks" | "Chapters" | "Sessions" |
| Play button tint | `sleepAccent` | `sleepAccent` | `course.color` |
| Lock icon color | `sleepTextMuted` | `sleepTextMuted` | `isDark ? sleepTextMuted : textMuted` |
| Child animation Δ | `i*40` | `i*50` | `i*50` |
| Hero padding-top | `xl` | `xl` | `xxl` |
| Extra imports | — | — | `buildSessionMetaInfo` (utils/courseCodeParser); `getLocalAudioPath` (downloadService) is **imported but unused** |

## Player-route params emitted by `router.push` (design input for Steps 5–6)

All pass `id`, `audioPath`, `title`, `duration` (String), `thumbnailUrl` (`|| ''`),
`<collection>Json` (JSON.stringify of the children array), `currentIndex` (String).
Type-specific extras:

- **album → `/album/track/[id]`**: `albumTitle`, `artist`, `tracksJson`.
- **series → `/series/chapter/[id]`**: `seriesTitle`, `narrator`, `chaptersJson`.
- **course → `/course/session/[id]`**: `courseTitle`, `courseCode`, `sessionCode`, `instructor`, `color`, `sessionsJson`.

## Implications for Step 3/4

- The hook (`useCollectionDetail`) covers all shared state + effects 1–5 + `handleChildPress` paywall logic, parameterized by `CollectionConfig`. `downloadedIds` need not be exposed (dead in render) — keep the focus fetch only if parity check flags a difference.
- The screen renders the album/series layout by default; a `contentType === 'course'` block supplies: light/dark gradient + tokens, code badge, subtitle, difficulty meta, `dayNumber` badge, session-code meta line, `school` icon, `course.color` play tint.
- Hero fallback icon: album/series keep their category switch (or move to `contentIcons` in Step 8); course is fixed `school`.
- Player-route param assembly belongs in the hook (or a config helper) since it's type-specific — encode it via the config rather than a screen conditional where possible.
