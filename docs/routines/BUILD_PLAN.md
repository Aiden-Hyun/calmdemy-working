# Calmdemy "Routines" — Build Plan & Tracking Document

## 1. Overview

**Routines** is a standalone, self-contained feature suite for Calmdemy that bundles 21 habit/routine-tracking capabilities (habits, repeats, rest days, difficulty, priority, goal tags, streaks & shields, a Green Light indicator, routine profiles, to-dos, a to-do calendar, numeric trackers with charts, a routine timer, statistics, heatmaps, weekly/monthly reports, image export, and keyed reminders) behind a **single feature module** at `src/features/routines/`. It follows every existing Calmdemy convention (mood/journal/cbt) and surfaces as **one** tile ("Routines") on the Tools tab, exactly like `cbt` fans out five methods behind one manifest.

This is **extra/additive** content. It is not wired into any existing content pipeline, does not modify existing features' data, and only *reads from* two existing features through their public surface: `src/features/mood` (feature 11) and `src/features/journal` (feature 12, optional deep-link). The only shared infrastructure it touches is: Firebase, React Query, the theme, `src/registry.ts`, `app/_layout.tsx`, `app/(tabs)/tools.tsx`, `firestore.rules`, and `src/core/notifications/notificationService.ts` (which gets a backward-compatible extension for keyed reminders).

---

## 2. How to Use This Document (read this first — you are a future AI session with zero prior context)

1. **Read this whole document before writing any code.** It is the authoritative spec. There is no other context.
2. **Follow §5 (Architecture & Conventions) exactly.** These are verified against the repo. Deviating breaks the `eslint-plugin-boundaries` rules and the house style.
3. **Treat §6 (Data Model) as authoritative.** Firestore paths, doc-id strategies, and TypeScript interfaces there are the single source of truth. If you must change the data model, update §6 *first*, note it in §10 (Decisions Log) and §12 (Changelog), then implement.
4. **Work milestone by milestone in dependency order** (§9). Do not start a feature whose `Depends on` cell (§4) is unchecked.
5. **After every work session, before you end:**
   - Update the **Status** cells in the §4 progress dashboard and tick the milestone checklist checkboxes for anything you completed.
   - Append a row to the **§11 Session Log** (Date · what you did · features touched · what's next).
   - Add a **§12 Changelog** entry if you changed the data model, conventions, or dependencies.
6. **Keep it DRY.** Derived values (streaks, Green Light, all stats/heatmaps/reports) are **never stored** — they are computed client-side from the completion log. Do not add a second source of truth.
7. **Verify before you claim done.** A feature is "Done" only when its acceptance criteria in §9 pass and `tsc` + eslint (boundaries) are clean.

---

## 3. Status Legend

| Symbol | Meaning |
|---|---|
| ⬜ | Not started |
| 🟨 | In progress |
| ✅ | Done (acceptance criteria met, `tsc` + eslint clean) |
| ⏭️ | Deferred / out of current scope |

---

## 4. Progress Dashboard

> Original feature numbers are preserved. "Depends on" refers to feature numbers or `M0` (foundation).

| # | Feature | Milestone | Depends on | Status |
|---|---------|-----------|-----------|--------|
| — | Foundation & scaffold (module, registry, route, utils, rules) | M0 | — | ✅ |
| 1 | Situation-based daily routines (habits + check-off + completions) | M1 | M0 | ✅ |
| 2 | Flexible repeat patterns | M1 | 1 | ✅ |
| 3 | Rest days | M1 | 1, 2 | ✅ |
| 4 | Difficulty levels (Mini / Plus / Max) | M2 | 1 | ⬜ |
| 5 | Habit priority (1–3) | M2 | 1 | ⬜ |
| 22 | Goal tags | M2 | 1 | ⬜ |
| 6 | Streaks & shields | M3 | 1, 2, 3 | ⬜ |
| 14 | Green Light system | M4 | 1, 5 (also 2, 3) | ⬜ |
| 7 | Routine profiles (≤10, Apply Today) | M5 | 1, 2, 4, 5, 22 | ⬜ |
| 8 | To-dos | M6 | M0 | ⬜ |
| 9 | To-do calendar | M6 | 8 | ⬜ |
| 10 | Numeric trackers with charts | M6 | M0 | ⬜ |
| 13 | Routine timer | M6 | M0 (opt. 1) | ⬜ |
| 11 | Mood tracker & diary (REUSE existing `src/features/mood`) | M7 | mood infra | ⬜ |
| 12 | Diary & notes (thin per-day notes + Journal deep-link) | M7 | M0 | ⬜ |
| 15 | Daily / weekly / monthly statistics | M8 | 1, 2, 3 | ⬜ |
| 16 | Monthly tracker (heatmap calendars) | M8 | 1, 3 | ⬜ |
| 17 | Weekly report (grid) | M8 | 15, 22, 5 | ⬜ |
| 18 | Monthly report + mood overview | M8 | 15, 16, 17, 11 | ⬜ |
| 24 | Reminders & notifications (keyed) | M9 | 1, 8 | ⬜ |
| 19 | Save / share stats as image | M10 | 18 (+ add `react-native-view-shot`) | ⬜ |

### Milestone checklists

**M0 — Foundation & scaffold** — ✅ done 2026-07-01
- [x] Create `src/features/routines/` + `types.ts`, `manifest.ts`, `index.ts`. (Subfolders `domain/` + `screens/` created; `api/ hooks/ components/ data/` are created lazily as their first file lands in M1+.)
- [x] Write `manifest.ts` (`id: "routines"`, `category: "practice"`, `route: "/routines"`, `requiresAuth: true`, `color: "#8FA98C"`, icon `repeat-outline`).
- [x] `index.ts` re-exports `manifest` + `RoutinesHomeScreen` (add more screens as built).
- [x] Register in `src/registry.ts`: import `routinesManifest` (alphabetical, after `progressManifest`) + push under `// --- practice ---` (after `moodManifest`).
- [x] Create route wrapper `app/routines.tsx` (thin, `ProtectedRoute`).
- [x] Add `<Stack.Screen name="routines" options={{ headerShown: false }} />` to `app/_layout.tsx`.
- [x] Add `'routines'` to `TOOL_IDS` in `app/(tabs)/tools.tsx`.
- [x] `domain/dateKeys.ts` — copied mood's `toDateKey` (pure) + added `todayKey`, `fromDateKey`, `addDaysToKey`, `monthBounds`.
- [x] `domain/repeat.ts` skeleton (`isDueOn(habit, date)`; `weekly`/`times-per-week` return `true` pending quota context — TODO tagged for M1/M3).
- [x] `firestore.rules`: added all 8 `routine*` blocks (incl. `routineReminders` mirror + nested `routineTrackers/entries`) **nested inside** `match /users/{userId}`, each null-guarded. ⚠️ Rules are edited but **not yet deployed** — run the Firebase deploy when M1 data writes land.
- [x] `tsc --noEmit` + `eslint` clean. ⏳ **Pending:** runtime smoke test of `/routines` on a simulator (not run this session).
- [x] BONUS: full authoritative `types.ts` (all §6 entities) laid down ahead of M1.

**M1 — Core loop** — ✅ done 2026-07-01 (`tsc` + `eslint` clean)
- [x] `types.ts`: all core types (done in M0 — `Habit`, `HabitCompletion`, `RepeatConfig`, `CompletionState`, `RoutineMoment`, …).
- [x] `api/habits.ts` (create/update/list/get/archive, `CreateHabitInput`/`UpdateHabitInput`, `DEFAULT_PROFILE_ID`) + `api/completions.ts`. **Note:** the doc's `toggleCompletion` was split into `setCompletion` (setDoc) + `clearCompletion` (deleteDoc) so un-checking deletes the doc (absence = not done) — the `useToggleCompletion` hook orchestrates. Also added `getCompletionsForRange` (all-habits `dateKey` range) for the weekly quota.
- [x] `hooks/useHabits.ts` (`useHabits`, `useHabit`, `useCreateHabit`, `useUpdateHabit`, `useArchiveHabit`) + `hooks/useHabitCompletions.ts` (`useTodayCompletions`, `useWeekCompletions`, `useCompletionsRange`, `useToggleCompletion`).
- [x] `screens/RoutinesHomeScreen.tsx` — today's due habits grouped by moment, tap-to-check, done/total counter, loading + empty states.
- [x] `screens/HabitEditorScreen.tsx` (create) + route `app/routines/habit/new.tsx` (+ `<Stack.Screen>` in `_layout`, + `index.ts` export). Editor: name, icon/color presets (`data/presets.ts`), moment picker, `RepeatPicker`.
- [x] Feature 2: `RepeatConfig` union + `RepeatPicker`; `isDueOn` (daily/weekdays exact) + `weeklyQuota` + `isDueToday` (pure) so `times-per-week`/`weekly` habits drop off Today once the week's quota is met.
- [x] Feature 3: `state: "rest"` via long-press menu (Done / Rest day / Clear) on `HabitRow`; rest counts as handled, not a miss.
- [x] `firestore.rules` for `routineHabits` + `routineCompletions` — done in M0. ⚠️ **Deploy needed** before first write. Firestore will also prompt to create the composite index `(habitId ASC, dateKey ASC)` on first `getCompletionsRange` call (used by streaks/heatmap in M3/M8).

**M2 — Habit attributes**
- [ ] Feature 4: add `difficulty` to `Habit`; `DifficultyPicker` + `data/difficulty.ts`.
- [ ] Feature 5: add `priority` to `Habit`; `PriorityPicker`; sort Today by priority.
- [ ] Feature 22: `api/goalTags.ts`, `hooks/useGoalTags.ts`, `data/goalTags.ts` (seed defaults), `GoalTagChips` multi-select, `goalTagIds` on `Habit`, filter by tag.

**M3 — Streaks & shields**
- [ ] `domain/streaks.ts` (`computeStreak`, `shieldsRemaining`) — pure.
- [ ] `state: "shielded"` completion + `shieldsMax` on `Habit`.
- [ ] `hooks/useHabitCompletions.ts`: `useSpendShield`.
- [ ] `StreakBadge` (flame + shield count, vectors only).

**M4 — Green Light**
- [ ] `domain/greenLight.ts` (`computeGreenLight` priority-weighted).
- [ ] `GreenLightIndicator` (three vector circles) on `RoutinesHomeScreen` header.
- [ ] Live-updates as habits are checked (derived in `select`/`queryFn`, no extra fetch).

**M5 — Profiles**
- [ ] `types.ts`: `RoutineProfile`; `api/profiles.ts` (CRUD + `applyToday`); `hooks/useProfiles.ts`.
- [ ] `screens/ProfilesScreen.tsx` + route; ≤10 cap enforced client-side; "Apply Today" toggles `isActive`.

**M6 — Standalone data islands**
- [ ] Feature 8: `types.ts` `Todo`; `api/todos.ts`; `hooks/useTodos.ts`; to-do list on home + `screens/TodosScreen.tsx` + route.
- [ ] Feature 9: `getTodosForMonth`; `screens/TodoCalendarScreen.tsx` (SVG month grid) + route.
- [ ] Feature 10: `types.ts` `NumericTracker` + `TrackerEntry`; `api/trackers.ts`; `hooks/useTrackers.ts`; `TrackerChart` (chart-kit LineChart); `screens/TrackersScreen.tsx` + `screens/TrackerDetailScreen.tsx` + routes.
- [ ] Feature 13: `domain/`/hook `useCountdownTimer`; `RoutineTimer` component (red + overtime); optional launch from a habit.

**M7 — Mood & diary (reuse)**
- [ ] Feature 11: consume `src/features/mood` via its `index.ts`; add to mood's `index.ts` (currently exports only `MoodHomeScreen` + `manifest`): `MoodEntry`/`MoodValue`, a date-range query (`getMoodEntriesInRange`) **or** a documented current-month filter over `getMoodHistory`, and a numeric ordinal (`MOOD_ORDER` / `moodToScore`); add a mood entry-point card on the Routines home.
- [ ] Feature 12: `types.ts` `RoutineDayNote`; `api/dayNotes.ts` (date-keyed get/set); `hooks/useDayNote.ts`; note field on day-detail; "Open in Journal" deep-link.

**M8 — Analytics**
- [ ] Feature 15: `domain/stats.ts` (`computeStats` → `RoutineStats`); `hooks/useRoutineStats.ts`; `screens/StatsScreen.tsx` (day/week/month toggle) + route.
- [ ] Feature 16: `HeatmapGrid` (react-native-svg); per-habit month grid on `screens/HabitDetailScreen.tsx` + route `app/routines/habit/[id].tsx`.
- [ ] Feature 17: `getWeeklyReport`; `WeekGrid` + goal-progress bars (uses goal tags + priority).
- [ ] Feature 18: `getMonthlyReport` combining `RoutineStats` + monthly mood series (fetch via mood's date-range export or current-month client filter, then map the `MoodValue` string union to 1..5 via the exported ordinal); `screens/MonthlyReportScreen.tsx` + route.

**M9 — Reminders**
- [ ] Extend `notificationService` with keyed API (`scheduleKeyedReminder`/`cancelKeyedReminder`/`getKeyedReminder`/`getAllReminders`), `ReminderLimitError`, `migrateLegacyReminders()`.
- [ ] `hooks/useHabitReminders.ts` wrapping the keyed API.
- [ ] `reminderKey?` on `Habit`/`Todo`; reminder pickers in editors; global morning/evening setting; `screens/RemindersScreen.tsx` + route.

**M10 — Sharing**
- [ ] `npx expo install react-native-view-shot expo-sharing`.
- [ ] `ShareableSummaryCard` wrapped in a capture ref; `captureRef` → temp URI → share/save.
- [ ] "Save/Share" action on `MonthlyReportScreen`.

---

## 5. Architecture & Conventions to Follow

> All verified against the repo. **[CORRECTION]** flags fix stale/incorrect assumptions.

### 5.1 Module shape

One module `src/features/routines/`. Never split into sibling `routines`/`todos`/`trackers` modules — cross-feature imports are only permitted through a feature's public `index.ts` (`eslint-plugin-boundaries`); importing feature internals is forbidden, and every feature's `types.ts` states "other features must not import these directly." (This is exactly what the feature-11 mood-reuse plan relies on: routines imports mood only via mood's `index.ts`.) Internal layout:

```
src/features/routines/
  index.ts        # ONLY public surface: re-export manifest + screens used by route files. Nothing else.
  manifest.ts     # single FeatureManifest, id "routines"
  types.ts        # ALL domain types for the suite
  data/           # static presets/seeds (goal tags, difficulty metadata, situations)
  api/            # Firestore CRUD, one file per collection
  hooks/          # React Query, one file per domain (multiple queries per file OK)
  domain/         # PURE functions, no I/O (repeat, streaks, greenLight, stats, dateKeys)
  components/      # presentational, no data fetching
  screens/        # screens consumed by app/ route wrappers
```

### 5.2 `types.ts`

Header comment declares ownership + all Firestore paths. `createdAt` and every timestamp is **epoch ms as a plain `number`** (`Date.now()`) — never a Firestore `Timestamp`. Optional fields use `?` and are **never written when empty**. Enums are string-literal unions. Icon fields: `import type { Ionicons } from "@expo/vector-icons"` then `keyof typeof Ionicons.glyphMap`.

### 5.3 `api/*.ts` (Firestore CRUD)

- Import `db` from `../../../core/firebase` (three levels up); named imports from `firebase/firestore`.
- Private user-scoped collection-ref helper + private defensive `mapEntry(id, data, userId)` (coerce every field: `typeof data.createdAt === "number" ? data.createdAt : 0`).
- **Return-shape rules:** create → `Promise<string>` (the id); list → `Promise<T[]>`, `[]` on error; single → `Promise<T | null>`, `null` on missing/error.
- **Reads are wrapped in try/catch → `[]`/`null`. Writes are NOT wrapped (they throw).**
- **Never write `undefined`** (Firestore rejects it) — build the data object conditionally.
- Lists always `orderBy("createdAt", "desc")` + `limit()`.

```ts
// CREATE (append-only) — addDoc, returns new id
export async function createHabit(userId: string, input: {...}): Promise<string> {
  const data: Record<string, unknown> = { userId, name: input.name, createdAt: Date.now() };
  if (input.time) data.time = input.time;            // never write undefined
  const docRef = await addDoc(habitsCollection(userId), data);
  return docRef.id;
}

// CREATE-OR-REPLACE (idempotent per-day) — setDoc with a deterministic id
export async function toggleCompletion(userId: string, habitId: string, dateKey: string, state: CompletionState): Promise<string> {
  const key = `${habitId}_${dateKey}`;               // deterministic id
  const data: Record<string, unknown> = { userId, habitId, dateKey, state, createdAt: Date.now() };
  await setDoc(doc(completionsCollection(userId), key), data);
  return key;
}

// READ list — try/catch → []
export async function getCompletionsForDate(userId: string, dateKey: string): Promise<HabitCompletion[]> {
  try {
    const q = query(completionsCollection(userId), where("dateKey", "==", dateKey));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapCompletion(d.id, d.data(), userId));
  } catch (error) { console.error("Error fetching completions:", error); return []; }
}
```

### 5.4 `hooks/*.ts` (React Query)

- `useAuth()` from `../../../core/auth/AuthContext` exposes `user?.uid`.
- **Query key convention:** `[camelCaseResource, user?.uid, ...extraArgs]`.
- `enabled: !!user?.uid` (and `&& !!extraRequiredParam`); `queryFn` non-null-asserts `user!.uid`.
- Mutation input is a **single named object**; `onSuccess` invalidates **every** affected list/detail key.
- Do **not** set `staleTime`/persistence per-hook — configured globally in `QueryProvider`.
- Derived values (streaks, Green Light, stats) are computed inside `queryFn`/`select` off the completion query — no separate fetch, so they invalidate automatically when a completion is toggled.

```ts
export function useToggleCompletion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { habitId: string; dateKey: string; state: CompletionState }) =>
      toggleCompletion(user!.uid, input.habitId, input.dateKey, input.state),
    onSuccess: (_id, input) => {
      queryClient.invalidateQueries({ queryKey: ["habitCompletions", user?.uid, input.dateKey] });
      queryClient.invalidateQueries({ queryKey: ["greenLightToday", user?.uid, input.dateKey] });
      queryClient.invalidateQueries({ queryKey: ["routineStats", user?.uid] });
    },
  });
}
```

Query keys in use: `["habits", uid, profileId]`, `["habitCompletions", uid, dateKey]`, `["habitCompletionsRange", uid, habitId, start, end]`, `["todos", uid]`, `["todosMonth", uid, monthKey]`, `["trackers", uid]`, `["trackerEntries", uid, trackerId, max]`, `["routineProfiles", uid]`, `["goalTags", uid]`, `["routineStats", uid, rangeStart, rangeEnd]`, `["greenLightToday", uid, dateKey]`, `["dayNote", uid, dateKey]`.

### 5.5 `manifest.ts` + registering

`FeatureManifest` has **no optional fields** — every field is required.

```ts
import type { FeatureManifest } from "../../registry";
export const manifest: FeatureManifest = {
  id: "routines",                 // unique slug == directory name
  label: "Routines",
  description: "Build daily habits and routines, track progress, and stay on course.",
  icon: "repeat-outline",         // keyof typeof Ionicons.glyphMap
  color: "#8FA98C",               // calm sage; distinct from mood #7DAFB4 / cbt #C4A77D
  route: "/routines",             // Expo Router path
  category: "practice",           // 'practice'|'library'|'progress'|'account'|'legal'
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ["routine","routines","habit","habits","streak","tracker","to-do","todo","goal","reminder"],
  enabled: true,
};
```

`index.ts`:
```ts
export { RoutinesHomeScreen } from "./screens/RoutinesHomeScreen";
export { manifest } from "./manifest";
// add each screen a route file consumes; nothing else
```

**Register in `src/registry.ts`:** **[CORRECTION]** the registry exports `getById`, **`byCategory`** (NOT `getByCategory`), `search`, `allEnabled`.
1. Add import (alphabetical): `import { manifest as routinesManifest } from './features/routines';`
2. Push `routinesManifest` under `// --- practice ---`, alphabetical (after `moodManifest`).
3. No other edits — all four helpers read from that array.
4. Surface on Tools tab: add `'routines'` to `TOOL_IDS` in `app/(tabs)/tools.tsx` (currently `['breathing', 'journal', 'mood', 'cbt']`). Discover tab works for free via `byCategory('practice')` + `search()`.

### 5.6 Routes in `app/`

Route files are **thin wrappers** — no UI logic. Import the screen from the feature `index.ts`, wrap in `ProtectedRoute` (required when `requiresAuth: true`), read params.

```tsx
// app/routines.tsx
import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { RoutinesHomeScreen } from '../src/features/routines';
export default function Routines() {
  return (<ProtectedRoute><RoutinesHomeScreen /></ProtectedRoute>);
}

// app/routines/habit/[id].tsx  — dynamic param via useLocalSearchParams, passed as prop
import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { HabitDetailScreen } from '../../../src/features/routines';
export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (<ProtectedRoute><HabitDetailScreen habitId={id} /></ProtectedRoute>);
}
```

**[CORRECTION] You must also register every route in `app/_layout.tsx`** as a `<Stack.Screen>` child with `options={{ headerShown: false }}`, including dynamic ones (`name="routines/habit/[id]"`). See §7 for the full list.

### 5.7 Screen component skeleton (from real `MoodHomeScreen.tsx`)

```tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";

export function RoutinesHomeScreen() {
  const { theme } = useTheme();                                   // [CORRECTION] destructure { theme }, then theme.colors.x
  const styles = useMemo(() => createStyles(theme), [theme]);     // memo on theme
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <BackButton />
        {/* ... */}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.xxl },
  title: { fontFamily: theme.fonts.display.semiBold, fontSize: 28, color: theme.colors.text },
  card: { padding: theme.spacing.lg, borderRadius: theme.borderRadius.xl,      // borderRadius.xl = 18
          backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
          gap: theme.spacing.md },
});
```

**Conventions (apply throughout):**
- `useTheme()` returns `{ theme, themeMode, isDark, setThemeMode }` — destructure `const { theme } = useTheme()`, then `theme.colors.x`. **[CORRECTION]** the header comment in `theme/index.ts` claiming `const { colors, spacing } = useTheme()` is stale — do not follow it.
- `createStyles(theme: Theme)` factory **outside** the component, via `useMemo(() => createStyles(theme), [theme])`.
- `SafeAreaView edges={["top"]}`; `BackButton` as the first child of the scroll content.
- Touchables → `AnimatedPressable`; animated containers → `AnimatedView`.
- Fonts always via `theme.fonts.{display|body|ui}.{regular|semiBold|...}`.
- Colors/spacing/borderRadius always via tokens. **[CORRECTION]** `borderRadius` goes up to `xxl: 24` and `full: 9999` (not just `xs..lg`); cards commonly use `theme.borderRadius.xl` (18). Only exception: a feature accent constant (e.g. `const ROUTINES_ACCENT = "#8FA98C"`).
- **No emoji anywhere** (current design direction). Icons are Ionicons/MaterialCommunityIcons vectors: traffic lights = three vector circles, streaks = flame icon, moods = mood feature's vector faces. (Note: `notificationService` still contains legacy emoji in *its* titles — new routines reminders must be plain text.)

### 5.8 `firestore.rules`

Add one `match` block per collection **inside** the existing `match /users/{userId} { ... }` node (alongside the existing `moodEntries`/`journalEntries`/`cbtEntries` blocks), using the repo's exact null-guarded condition form `if request.auth != null && request.auth.uid == userId;` on every block — including the nested `entries/{dateKey}` subcollection. Do **not** drop the `request.auth != null &&` guard; every existing rule carries it.

```
match /users/{userId} {
  // ... existing moodEntries / journalEntries / cbtEntries blocks stay as-is ...

  match /routineHabits/{habitId}       { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /routineCompletions/{docId}    { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /routineTodos/{todoId}         { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /routineProfiles/{profileId}   { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /routineGoalTags/{tagId}       { allow read, write: if request.auth != null && request.auth.uid == userId; }
  match /routineTrackers/{trackerId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
    match /entries/{dateKey}           { allow read, write: if request.auth != null && request.auth.uid == userId; }
  }
  match /routineDayNotes/{dateKey}     { allow read, write: if request.auth != null && request.auth.uid == userId; }
}
```

---

## 6. Data Model (AUTHORITATIVE)

All collections are user-scoped under `users/{uid}/…`. Timestamps are epoch ms `number`. Optional fields use `?`. Enums are string-literal unions. **Collection names are `routine*`-namespaced** (resolved decision — see §10) so `firestore.rules` scoping never collides with any future top-level habit feature.

### 6.1 Collection map

| # | Collection path | Doc-id strategy | Cardinality | Stored / Derived |
|---|---|---|---|---|
| A | `users/{uid}/routineProfiles/{profileId}` | `addDoc` auto-id | ≤ 10 | STORED |
| B | `users/{uid}/routineHabits/{habitId}` | `addDoc` auto-id | many | STORED (definition) |
| C | `users/{uid}/routineCompletions/{habitId_YYYY-MM-DD}` | **composite** `${habitId}_${dateKey}` | 1 per habit per day | STORED — **source of truth for everything derived** |
| D | `users/{uid}/routineTodos/{todoId}` | `addDoc` auto-id | many | STORED |
| E | `users/{uid}/routineGoalTags/{tagId}` | `addDoc` auto-id | small | STORED |
| F | `users/{uid}/routineTrackers/{trackerId}` | `addDoc` auto-id | small | STORED (definition) |
| G | `users/{uid}/routineTrackers/{trackerId}/entries/{YYYY-MM-DD}` | date-key subcollection | 1 per day per tracker | STORED |
| H | `users/{uid}/routineDayNotes/{YYYY-MM-DD}` | date-key | 1 per day | STORED |
| I | `users/{uid}/routineReminders/{reminderKey}` (optional mirror) | caller-supplied `reminderKey` | few | STORED (optional, see §8.1) |
| — | mood (feature 11) | **REUSE** `users/{uid}/moodEntries/{YYYY-MM-DD}` | — | existing |
| — | diary (feature 12, optional long-form) | **REUSE** `users/{uid}/journalEntries/{id}` | — | existing |

> **Streaks, shields balance, Green Light, weekly/monthly stats, heatmaps, and reports (features 6, 14, 15, 16, 17, 18) are DERIVED client-side from C (+ B, + mood/journal for 18). Nothing derived is ever stored.** (§6.8–§6.10)

### 6.2 `RoutineProfile` (feature 7) — collection A

```ts
/** Firestore path: users/{userId}/routineProfiles/{profileId} */
export interface RoutineProfile {
  id: string;
  userId: string;
  name: string;                 // "Weekday", "Vacation", "Recovery"
  icon: keyof typeof Ionicons.glyphMap;
  color: string;                // hex accent
  order: number;                // manual sort among the ≤10 profiles
  isActive: boolean;            // exactly one active at a time
  createdAt: number;            // epoch ms
}
```
A habit belongs to one profile via `Habit.profileId`. "Apply Today" = set `isActive: true` on the chosen profile and `false` on the previously-active one (two writes). The active profile's habits render on the day screen. The ≤10 cap is enforced client-side (count before create).

### 6.3 `Habit` (features 1–5, 22) — collection B

```ts
export type RoutineMoment =
  | "wake-up" | "morning" | "midday" | "afternoon" | "evening" | "before-bed" | "anytime"; // feat 1
export type RepeatType = "daily" | "weekly" | "weekdays" | "times-per-week";               // feat 2
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;                                            // 0 = Sunday (JS Date.getDay())
export type Difficulty = "mini" | "plus" | "max";                                          // feat 4
export type Priority = 1 | 2 | 3;                                                           // feat 5 (1 = low, 3 = high)

/** Firestore path: users/{userId}/routineHabits/{habitId} */
export interface Habit {
  id: string;
  userId: string;
  profileId: string;            // -> RoutineProfile.id (feat 7)
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  moment: RoutineMoment;        // feat 1 anchor ("when I wake up" etc.)
  scheduledTime?: string;       // "HH:MM" if time-anchored instead of moment-anchored
  repeat: RepeatConfig;         // feat 2
  difficulty: Difficulty;       // feat 4
  priority: Priority;           // feat 5
  goalTagIds: string[];         // feat 22 -> GoalTag.id[]
  shieldsMax: number;           // feat 6 shields granted per period (0 = none)
  order: number;                // manual sort within its moment group
  reminderKey?: string;         // feat 24 key into the reminders map
  archivedAt?: number;          // soft-delete: keeps completions intact for history
  createdAt: number;
}

/** Discriminated union: weekday/quota fields exist only when meaningful. */
export type RepeatConfig =
  | { type: "daily" }
  | { type: "weekly" }                            // once per calendar week, any day
  | { type: "weekdays"; days: Weekday[] }         // chosen weekdays
  | { type: "times-per-week"; target: number };   // X times/week, any days
```
`archivedAt` is a **soft delete** — never hard-delete a habit or its completions orphan and streak/stat math breaks. Day screen filters `!archivedAt`; history/stats keep archived habits.

### 6.4 `HabitCompletion` (features 3, 6) — collection C — the load-bearing table

```ts
/** Absence of a doc = not-yet-done (no "fail" is ever stored). */
export type CompletionState =
  | "done"       // checked off
  | "skipped"    // consciously skipped (counts against, unless rest/shield)
  | "rest"       // feat 3 rest day — does NOT count as a fail
  | "shielded";  // feat 6 a shield was spent to protect the streak this day

/**
 * Firestore path: users/{userId}/routineCompletions/{habitId_YYYY-MM-DD}
 * Composite doc id "ab12cd34_2026-07-01" → idempotent per habit per day.
 */
export interface HabitCompletion {
  id: string;               // "${habitId}_${dateKey}"
  userId: string;
  habitId: string;          // -> Habit.id (denormalized — needed as a real field to query)
  profileId: string;        // denormalized: cheap whole-profile day query
  dateKey: string;          // "YYYY-MM-DD" (denormalized from id for range queries)
  state: CompletionState;
  value?: number;           // optional: count-style habits ("drink 3 glasses")
  createdAt: number;        // epoch ms
}
```
Why the composite `${habitId}_${dateKey}` id:
- Toggling is an idempotent `setDoc` — re-checking overwrites (like `checkInMood`). No read-modify-write, no dupes.
- "Is this habit done today?" is a single `getDoc(id)` — **1 document read**, no query, no index.
- A whole day for the active profile is one query: `where("profileId","==",active), where("dateKey","==",today)`.
- A habit's history for streaks/heatmap: `where("habitId","==",id), where("dateKey",">=",start), where("dateKey","<=",end)`.

Both `dateKey` and `habitId` are denormalized onto the doc (not only in the id) because Firestore cannot query on doc-id substrings.

### 6.5 `Todo` (features 8, 9) — collection D

```ts
/** Firestore path: users/{userId}/routineTodos/{todoId} */
export interface Todo {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  dateKey?: string;         // "YYYY-MM-DD" placement (feat 9); omit = unscheduled backlog
  time?: string;            // "HH:MM" for appointments; omit = all-day (feat 8)
  kind: TodoKind;           // plain to-do vs. calendar appointment
  done: boolean;            // one-off completion (done-ness lives on the instance — NO occurrence collection)
  completedAt?: number;     // epoch ms, set when done flips true
  goalTagIds?: string[];
  reminderKey?: string;     // feat 24
  order: number;
  createdAt: number;
}
export type TodoKind = "task" | "appointment";
```
**To-dos vs. habits — deliberately different completion model.** A habit recurs → per-day doc (C). A to-do is a single instance → done-ness on the doc itself. No `TodoOccurrence` collection.

**Calendar (feature 9)** is a query, not a stored structure: month view = `where("dateKey",">=","2026-07-01"), where("dateKey","<=","2026-07-31")` over `routineTodos`, merged with derived per-day completion counts from C. Backlog = `routineTodos` with no `dateKey` (separate query — range-on-`dateKey` excludes missing fields).

### 6.6 `GoalTag` (feature 22) — collection E

```ts
/** Firestore path: users/{userId}/routineGoalTags/{tagId} */
export interface GoalTag {
  id: string;
  userId: string;
  label: string;            // "Tidy", "Growth", "Self-care"
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  order: number;
  createdAt: number;
}
```
Habits reference tags by id (`Habit.goalTagIds`), never embedded — renaming/recoloring is one write. Goal-progress % (feature 17) is DERIVED: per tag, gather its habits, compute their weekly completion rate from C. Seed defaults (Tidy, Growth, Self-care…) in `data/goalTags.ts`.

### 6.7 `NumericTracker` + `TrackerEntry` (feature 10) — collections F & G

```ts
/** Firestore path: users/{userId}/routineTrackers/{trackerId} */
export interface NumericTracker {
  id: string;
  userId: string;
  name: string;             // "Weight", "Push-ups", "Wake-up time"
  unit: string;             // "kg", "reps", "time"
  kind: TrackerKind;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  goalValue?: number;       // optional target line on the chart
  order: number;
  createdAt: number;
}
export type TrackerKind = "number" | "duration" | "time-of-day"; // time-of-day = minutes-since-midnight (0–1439)

/** Firestore path: users/{userId}/routineTrackers/{trackerId}/entries/{YYYY-MM-DD} */
export interface TrackerEntry {
  id: string;               // "YYYY-MM-DD"
  userId: string;
  trackerId: string;
  dateKey: string;          // denormalized for range queries
  value: number;            // interpreted per NumericTracker.kind
  createdAt: number;
}
```
Entries are a **subcollection of the tracker** so a chart is one scoped query: `orderBy("dateKey","desc"), limit(N)`. `react-native-chart-kit` (installed) consumes the returned array directly. `time-of-day` as minutes-since-midnight keeps `value: number` honest and charts monotonic.

### 6.8 DERIVED — Streaks & Shields (feature 6) → `domain/streaks.ts`

Not stored. Computed from a habit's completions, walking backwards from today:
- **Streak:** pull completions `orderBy("dateKey","desc")`. Walk **scheduled days only** (a day the `RepeatConfig` says the habit isn't due neither breaks nor extends). `done` and `shielded` extend; `rest` is neutral (skip, don't break); `skipped` or a missing doc on a scheduled day breaks it.
- **Shields balance** = `shieldsMax` (per period) − count of `state === "shielded"` docs in the current period. Spending a shield = writing a completion with `state: "shielded"`.

Pure helpers: `computeStreak(habit, completions): number`, `shieldsRemaining(habit, completions, period): number`.

### 6.9 DERIVED — Green Light (feature 14) → `domain/greenLight.ts`

Not stored. Priority-weighted completion of *today's due* habits from the active profile:
```
score = Σ(priority of done/rest/shielded due habits) / Σ(priority of all due habits today)
green ≥ 0.8   yellow 0.4–0.8   red < 0.4    (thresholds are tunable constants in the lib)
```
`computeGreenLight(dueHabits, todaysCompletions): "green"|"yellow"|"red"`. Inputs already in memory from the day-screen query — zero extra reads. Rest/shielded count as satisfied.

### 6.10 DERIVED — Statistics / heatmaps / reports (features 15–18) → `domain/stats.ts`

All from C (+ B, + mood for 18). Never precomputed/stored.
- **Completion rate (15):** range-query by `dateKey`, group by habit, `done / (scheduled − rest)`.
- **Monthly heatmap (16):** one `where("habitId","==",id), where("dateKey",">=",monthStart), where("dateKey","<=",monthEnd)` per habit → map each day to a `CompletionState` → color the square (`rest`/`shielded`/`skipped` get distinct colors).
- **Weekly report (17):** 7-day × habit matrix from one week-range query; goal-progress % rolls the same data up by `GoalTag`.
- **Monthly report + mood (18):** routines stats (from C) **+** existing `moodEntries` for the month, rendered together. Mood is fetched through mood's public `index.ts` (date-range export, or current-month client filter over `getMoodHistory`) and its string `MoodValue` mapped to a 1..5 ordinal via mood's exported `MOOD_ORDER`/`moodToScore` — the stored mood is **not** a stored number.

View-model types (never Firestore docs):
```ts
export interface HabitStat {
  habitId: string;
  scheduled: number; done: number; rested: number; shielded: number;
  rate: number;            // done / (scheduled - rested), 0..1
  currentStreak: number;
}
export interface RoutineStats {
  rangeStart: string;      // "YYYY-MM-DD"
  rangeEnd: string;
  perHabit: HabitStat[];
  overallRate: number;
  greenLightByDay: Record<string, "green" | "yellow" | "red">;
}
```

### 6.11 `RoutineDayNote` (feature 12) — collection H

```ts
/** Firestore path: users/{userId}/routineDayNotes/{YYYY-MM-DD} */
export interface RoutineDayNote {
  id: string;               // "YYYY-MM-DD"
  userId: string;
  dateKey: string;
  text: string;
  journalEntryId?: string;  // optional link out to a full journal entry for long-form
  createdAt: number;
  updatedAt: number;
}
```
One free-text note per day, date-keyed idempotent `setDoc`. See §10 for why this is thin-standalone rather than folded into `src/features/journal`.

### 6.12 Features 11 & 12 — REUSE existing mood & journal

- **Feature 11 (mood): reuse `src/features/mood`.** It already stores one daily mood at `users/{uid}/moodEntries/{YYYY-MM-DD}` with the same date-key idempotency. **The stored value is a string union, not a number:** `MoodValue = "terrible" | "bad" | "okay" | "good" | "great"`. Feature 18 consumes mood via mood's **public surface**. Two concrete gaps must be closed on mood's `index.ts` before feature 18 is buildable (mood currently exports only `MoodHomeScreen` + `manifest`):
  1. **Date-range window.** The existing `getMoodHistory(uid, days)` is `orderBy('createdAt','desc'), limit(days)` — it returns the most-recent N entries, **not** a specific month's entries, so it cannot fetch a past month. Surface **either** a new date-range query on mood's `index.ts` (e.g. `getMoodEntriesInRange(uid, startKey, endKey)`, valid because `moodEntries` doc ids are `YYYY-MM-DD` date keys) **or** document that feature 18 fetches a generous recent window via `getMoodHistory` and filters client-side by `dateKey` (only valid for the *current* month).
  2. **Numeric ordinal.** Charting a mood trend line needs an ordinal 1..5 mapping. The only ordering (`MOOD_ORDER`) lives in mood's **private** `data/moodVisuals.ts` and is **not** exported. Surface a numeric mapping from mood's `index.ts` — export `MOOD_ORDER`, or a `moodToScore(value: MoodValue): number` helper — so routines can map the string union to 1..5 for the chart. Then render alongside `RoutineStats`. **Do NOT create a `routineMoodEntries` collection.**
- **Feature 12 (diary): thin `routineDayNotes` (collection H) with a deep-link to `src/features/journal`** for long-form. `src/features/journal` is a titled, multi-entry-per-day model; a "one note attached to a day" doesn't fit it. The deep-link is **navigation only** (feature 12 does not read journal data). Note that journal's `index.ts` currently exports only screens (`JournalHomeScreen`, `EntryDetailScreen`) + `manifest` — no api/hooks — so no journal *data* read is possible through it today; if a journal data read is ever intended, journal would need new public exports (as called out for mood above).

### 6.13 Required composite indexes

1. `routineCompletions`: `(profileId ASC, dateKey ASC)` — active-profile day view.
2. `routineCompletions`: `(habitId ASC, dateKey ASC)` — streaks/heatmap range.
3. `routineTodos`: `(dateKey ASC)` — calendar month range (single-field, auto).
4. `routineTrackers/{id}/entries`: `(dateKey DESC)` — charts (single-field, auto).

Single-field `orderBy("createdAt","desc")` (profiles, tags, habits list) use auto indexes, like mood/journal.

### 6.14 Read-cost notes

- **"Is habit X done today?"** → `getDoc("${habitId}_${dateKey}")` = **1 read**, no query/index.
- **Whole active-profile day** → one query on `(profileId, dateKey)`; reads = habits actually toggled today (docs exist only once touched). Untouched habits render from the habit list with **zero** completion reads.
- **Streak / heatmap for one habit** → `(habitId, dateKey)` range, bounded (a month ≈ ≤31 reads). Never a full-history scan.
- **Never** read *all* completions for stats — always bound by `dateKey` range for the report period.

---

## 7. Module Structure & Files to Create

### 7.1 Feature directory tree

```
src/features/routines/
  index.ts                      # PUBLIC: re-export manifest + every screen a route file uses
  manifest.ts                   # id "routines", category "practice"
  types.ts                      # ALL domain types (§6)

  data/
    goalTags.ts                 # feat 22 seed tags (Tidy, Growth, Self-care…) — Ionicons + hex, no emoji
    difficulty.ts               # feat 4 Mini/Plus/Max metadata
    situations.ts               # feat 1 moment/anchor presets

  api/
    profiles.ts                 # feat 7 CRUD + applyToday
    habits.ts                   # feat 1 create/update/list/get/archive
    completions.ts              # feat 1/3/6 toggleCompletion, getCompletionsForDate, getCompletionsRange
    todos.ts                    # feat 8/9
    goalTags.ts                 # feat 22 CRUD
    trackers.ts                 # feat 10 tracker defs + entries
    dayNotes.ts                 # feat 12 get/set date-keyed note

  hooks/
    useProfiles.ts              # useProfiles(), useApplyProfile()
    useHabits.ts                # useHabits(), useHabit(id), useCreateHabit(), useUpdateHabit()
    useHabitCompletions.ts      # useTodayCompletions, useCompletionsRange, useToggleCompletion, useSpendShield
    useTodos.ts                 # useTodos, useTodosForMonth, useCreateTodo, useToggleTodo
    useGoalTags.ts              # useGoalTags, mutations
    useTrackers.ts              # useTrackers, useTrackerEntries, useLogTrackerValue
    useRoutineStats.ts          # derived: useRoutineStats, useGreenLight (feats 14,15,17,18)
    useDayNote.ts               # feat 12 useDayNote, useSaveDayNote
    useHabitReminders.ts        # feat 24 wraps notificationService keyed API

  domain/                       # PURE — no I/O
    dateKeys.ts                 # local YYYY-MM-DD helpers; re-implement (copy) toDateKey from src/features/mood/api/moodEntries.ts (NOT exported from mood's index.ts)
    repeat.ts                   # feat 2 isDueOn(habit, date)
    streaks.ts                  # feat 6 computeStreak / shieldsRemaining
    greenLight.ts               # feat 14 computeGreenLight
    stats.ts                    # feats 15/16/17/18 aggregation -> RoutineStats / HabitStat

  components/
    HabitRow.tsx                # today's checklist row (check, priority dots, difficulty chip)
    RepeatPicker.tsx            # feat 2
    DifficultyPicker.tsx        # feat 4 (Mini/Plus/Max segmented)
    PriorityPicker.tsx          # feat 5 (1–3)
    GoalTagChips.tsx            # feat 22
    StreakBadge.tsx             # feat 6 (flame + shield count, vectors only)
    GreenLightIndicator.tsx     # feat 14 (three vector circles)
    RoutineTimer.tsx            # feat 13 countdown -> red + overtime
    HeatmapGrid.tsx             # feat 16 (react-native-svg month grid)
    TrackerChart.tsx            # feat 10 (chart-kit LineChart)
    WeekGrid.tsx                # feat 17 week grid + goal %
    StatCard.tsx                # feat 15 completion-rate card
    ShareableSummaryCard.tsx    # feat 19 (captured by react-native-view-shot)

  screens/
    RoutinesHomeScreen.tsx      # feats 1,3,14 — today's checklist + Green Light + rest toggle (route "/routines")
    HabitEditorScreen.tsx       # feats 2,4,5,22,24 — create/edit
    HabitDetailScreen.tsx       # feats 6,16 — streak, shields, monthly heatmap
    TodosScreen.tsx             # feat 8
    TodoCalendarScreen.tsx      # feat 9
    TrackersScreen.tsx          # feat 10 list
    TrackerDetailScreen.tsx     # feat 10 trend chart
    ProfilesScreen.tsx          # feat 7
    StatsScreen.tsx             # feats 15,16,17
    MonthlyReportScreen.tsx     # feats 18,19
    RemindersScreen.tsx         # feat 24
```

### 7.2 Route files under `app/` (all thin, `ProtectedRoute`, screen from `routines/index.ts`)

```
app/routines.tsx                    → RoutinesHomeScreen      (manifest route "/routines")
app/routines/habit/new.tsx          → HabitEditorScreen       (create)
app/routines/habit/[id].tsx         → HabitDetailScreen       (useLocalSearchParams id → prop)
app/routines/habit/[id]/edit.tsx    → HabitEditorScreen       (edit)
app/routines/todos.tsx              → TodosScreen
app/routines/calendar.tsx           → TodoCalendarScreen
app/routines/trackers.tsx           → TrackersScreen
app/routines/tracker/[id].tsx       → TrackerDetailScreen
app/routines/profiles.tsx           → ProfilesScreen
app/routines/stats.tsx              → StatsScreen
app/routines/report.tsx             → MonthlyReportScreen
app/routines/reminders.tsx          → RemindersScreen
```
The home screen navigates internally with `router.push` (like `cbt.tsx` fanning to `/cbt/[method]`). No dispatcher route needed — screens differ structurally; use explicit files. `RoutinesHomeScreen` acts as a mini-hub (segmented control / section links: Today · To-dos · Trackers · Stats · Profiles · Reminders) so all 21 features live behind the single Tools tile. **Do not add a sixth bottom tab** (bar is Home/Library/Tools/Profile/Discover).

### 7.3 Register every route in `app/_layout.tsx`

Add one `<Stack.Screen>` child per route file, all `options={{ headerShown: false }}`:
```tsx
<Stack.Screen name="routines" options={{ headerShown: false }} />
<Stack.Screen name="routines/habit/new" options={{ headerShown: false }} />
<Stack.Screen name="routines/habit/[id]" options={{ headerShown: false }} />
<Stack.Screen name="routines/habit/[id]/edit" options={{ headerShown: false }} />
<Stack.Screen name="routines/todos" options={{ headerShown: false }} />
<Stack.Screen name="routines/calendar" options={{ headerShown: false }} />
<Stack.Screen name="routines/trackers" options={{ headerShown: false }} />
<Stack.Screen name="routines/tracker/[id]" options={{ headerShown: false }} />
<Stack.Screen name="routines/profiles" options={{ headerShown: false }} />
<Stack.Screen name="routines/stats" options={{ headerShown: false }} />
<Stack.Screen name="routines/report" options={{ headerShown: false }} />
<Stack.Screen name="routines/reminders" options={{ headerShown: false }} />
```

### 7.4 Registry + Tools tab

- `src/registry.ts`: import `routinesManifest` (alphabetical), push under `// --- practice ---` after `moodManifest`.
- `app/(tabs)/tools.tsx`: `TOOL_IDS` → `['breathing', 'journal', 'mood', 'cbt', 'routines']`.
- Discover tab picks it up automatically via `byCategory('practice')` + `search()`.

---

## 8. Infrastructure Reuse & Refactors

### 8.1 `notificationService` — generalize to keyed reminders (feature 24)

`src/core/notifications/notificationService.ts` today supports **exactly one** daily reminder: all persistence is hardcoded to the two AsyncStorage keys `'daily_reminder_id'` / `'daily_reminder_time'`, so a second `scheduleDailyReminder` overwrites the first. **Do NOT remove existing methods** — meditation still calls `scheduleDailyReminder`/`cancelDailyReminder`/`getDailyReminderTime` and the immediate ones (`scheduleSessionReminder`/`scheduleStreakReminder`/`scheduleMindfulMoment`). Add the keyed API alongside them.

**Current public API (leave intact):** `requestPermissions`, `scheduleDailyReminder(hour, minute, title, body)`, `cancelDailyReminder`, `getDailyReminderTime`, `scheduleSessionReminder(minutes)`, `scheduleStreakReminder(streak)`, `scheduleMindfulMoment`, `addNotificationListener`, `addResponseListener`, `removeListeners`.

**New keyed persistence** — one JSON blob under a single key `'routine_reminders'`:
```ts
type ReminderRecord = { expoId: string; hour: number; minute: number; title: string; body: string };
type ReminderMap = Record<string, ReminderRecord>;   // persisted as JSON under 'routine_reminders'
```

**New methods:**
```ts
async scheduleKeyedReminder(key: string, hour: number, minute: number, title: string, body: string): Promise<string>
async cancelKeyedReminder(key: string): Promise<void>
async getKeyedReminder(key: string): Promise<ReminderRecord | null>
async getAllReminders(): Promise<ReminderMap>
```
`scheduleKeyedReminder`: load map → if `map[key]` exists, cancel its `expoId` (per-key idempotent replace) → schedule `SchedulableTriggerInputTypes.DAILY` → `map[key] = {...}` → save. `cancelKeyedReminder` cancels only `map[key].expoId` and deletes that entry.

**Key convention:** `"habit:<habitId>"`, `"todo:<todoId>"`, reserved `"daily"` (migrated legacy) and `"daily:morning"` / `"daily:evening"` for feature 24's global reminders. `useHabitReminders.ts` wraps these.

**iOS 64-notification cap:** iOS caps *scheduled* local notifications at 64 (immediate `trigger: null` ones don't count). Before scheduling, call `Notifications.getAllScheduledNotificationsAsync()` (or count the map). **Cap keyed reminders at 60** to leave headroom for meditation's daily reminder + system slack. On overflow throw a typed error; eviction is **user-driven** (never silently drop a reminder):
```ts
export class ReminderLimitError extends Error { constructor() { super('REMINDER_LIMIT_REACHED'); } }
```
`RemindersScreen` / `HabitEditorScreen` catch it and show a calm message ("You've reached the reminder limit — remove one to add another").

**Migration (first run of new version):** `migrateLegacyReminders()` reads legacy `'daily_reminder_id'` / `'daily_reminder_time'`; if present, insert into the map under reserved key `"daily"` (preserving meditation's reminder), then clear the legacy keys after a successful merge.

**Copy:** legacy titles contain emoji (e.g. `'Meditation Complete! 🧘'`). New routines reminders must be **plain text only** (no-emoji aesthetic).

**Optional Firestore mirror (collection I, `ReminderConfig`)** only if reminders must survive reinstall / sync across devices — local notifications are device-local, so this is optional. The `expoId` is device-local and lives **only** in the AsyncStorage map, never in Firestore.
```ts
/** Optional cloud mirror. Firestore path: users/{userId}/routineReminders/{reminderKey} */
export interface ReminderConfig {
  id: string;               // == reminderKey ("habit:ab12", "todo:cd34", "daily:morning")
  userId: string;
  hour: number; minute: number;
  title: string; body: string;
  enabled: boolean;
  createdAt: number;
}
```

### 8.2 Charts — `react-native-chart-kit` (installed, with `react-native-svg`)

`TrackerChart.tsx` (feat 10) wraps `LineChart` for weight/wake-time/workout trends. `StatsScreen` uses `BarChart` for completion-rate. Build `chartConfig` from theme tokens (`theme.colors.primary` for the line/`color` fn, `theme.colors.surface` background, `theme.colors.textSecondary` labels) so it themes in dark mode. Width from `Dimensions.get('window').width - theme.spacing.lg * 2`. Aggregation happens in `domain/stats.ts` (pure); the chart only renders.

### 8.3 Heatmap — build with `react-native-svg` (not chart-kit)

`chart-kit`'s `ContributionGraph` is inflexible and hard to theme. Build `HeatmapGrid.tsx` as a 7-column week × N-row month grid of `<Rect>` squares, fill interpolated from `theme.colors.surface` (empty) → habit accent (done), with a distinct token for `rest`. Props: `{ dateKeys, statusByDate, accentColor }`. Reused by `HabitDetailScreen` (feat 16) and `StatsScreen`. Vector-only. The `TodoCalendarScreen` (feat 9) is built from the same SVG/date primitives — no third-party calendar library.

### 8.4 Image export (feature 19) — add `react-native-view-shot`

**Not installed** (confirmed — only `chart-kit` + `react-native-svg` present). `ShareableSummaryCard.tsx` renders the monthly summary (completion %, streak highlights, mini heatmap, mood overview). Wrap in a `ViewShot` ref; on Save/Share call `captureRef(ref, { format: 'png', quality: 1 })` → temp URI → share. Card stays on-brand (vector icons, theme tokens, no emoji).

### 8.5 New dependencies

```bash
npx expo install react-native-view-shot   # feature 19 — capture summary card as PNG
npx expo install expo-sharing             # feature 19 — OS share sheet for the PNG
```
Already present: `react-native-chart-kit@^6.12.0`, `react-native-svg@15.12.1`, `expo-file-system@~19.0.21`, `@react-native-async-storage/async-storage@^2.2.0`, `expo-notifications`, `firebase`, `@tanstack/react-query`. **Note:** the repo has a real `ios/` project (prebuild), so `react-native-view-shot`'s native config must be applied (`npx expo prebuild` / pod install as needed).

**`expo-file-system` API surface (SDK 54, pinned `~19.0.21`):** the file API changed significantly in SDK 54. The new default export is the `File`/`Directory` object API; the old `FileSystem.*` helpers (e.g. `documentDirectory`, `writeAsStringAsync`, `copyAsync`) moved to `expo-file-system/legacy`. When writing the captured PNG to disk in feature 19, pick **one** import surface explicitly — either the new `File` API (`import { File, Paths } from 'expo-file-system'`) or the legacy helpers (`import * as FileSystem from 'expo-file-system/legacy'`) — do not import the legacy helpers from the bare `expo-file-system` path, as they are no longer there.

---

## 9. Milestone-by-Milestone Implementation Guide

> Each feature: what to build + acceptance criteria. Do not start a feature until its dependencies are ✅.

### M0 — Foundation & scaffold
Create the module tree (§7.1), `manifest.ts`, `index.ts`, `types.ts` skeleton, `domain/dateKeys.ts` (re-implement/copy `toDateKey` from `src/features/mood/api/moodEntries.ts`, which is not exported from mood's `index.ts`), `domain/repeat.ts` skeleton, route wrapper `app/routines.tsx`, register in `_layout.tsx` + `registry.ts` + `TOOL_IDS`, add `firestore.rules` blocks.
**Done when:** `/routines` renders an empty home behind auth, "Routines" appears on the Tools tab and in Discover, `tsc` + eslint (boundaries) pass, `firestore.rules` deploys.

### M1 — Core loop (features 1, 2, 3)

**Feature 1 — Situation-based daily routines.** `Habit` + `HabitCompletion` types; `api/habits.ts` + `api/completions.ts`; `useHabits`, `useCreateHabit`, `useTodayCompletions`, `useToggleCompletion` (invalidate `["habitCompletions", uid, dateKey]`); `RoutinesHomeScreen` (today's due habits grouped by moment, tap-to-check); `HabitEditorScreen` (create).
*Done when:* user creates a habit anchored to a moment/time, sees it in Today, toggles complete/incomplete, and state persists across restart + reflects immediately.

**Feature 2 — Flexible repeat patterns.** `RepeatConfig` union; `isDueOn(habit, date)` for `daily/weekly/weekdays/times-per-week`; `RepeatPicker`; for `times-per-week` read the week window from completions.
*Done when:* Today shows only habits due per their rule; a 3×/week habit disappears once 3 completions exist that week.

**Feature 3 — Rest days.** `state: "rest"` completion; "Mark today as rest" affordance on home + day detail.
*Done when:* a rest day removes required habits from the "missed" tally, is visually distinct, and toggling back restores requirements.

### M2 — Habit attributes (features 4, 5, 22)

**Feature 4 — Difficulty (Mini/Plus/Max).** Add `difficulty` to `Habit`; `DifficultyPicker` + `data/difficulty.ts`; badge on the habit row.
*Done when:* each habit stores a difficulty, editable and shown.

**Feature 5 — Priority (1–3).** Add `priority`; `PriorityPicker`; sort/weight Today by priority.
*Done when:* each habit stores 1–3, editable; Today orders by it. (Consumed by 14 and 17.)

**Feature 22 — Goal tags.** `api/goalTags.ts` CRUD; `data/goalTags.ts` seeds defaults; `useGoalTags`; `GoalTagChips` multi-select; `goalTagIds` on `Habit`; filter by tag.
*Done when:* user creates/assigns tags and filters habits by tag; defaults exist on first use.

### M3 — Streaks & shields (feature 6)
`domain/streaks.ts` (`computeStreak`, `shieldsRemaining`); `shieldsMax` on `Habit`; `state: "shielded"` write via `useSpendShield`; `StreakBadge` (flame + shields).
*Done when:* each habit shows a correct current streak that survives rest days, breaks on an un-shielded miss on a scheduled day, and a shield preserves the streak across one missed day.

### M4 — Green Light (feature 14)
`domain/greenLight.ts` (`computeGreenLight`, priority-weighted); `GreenLightIndicator` (three vector circles) on the home header; derived in `select` (no extra fetch).
*Done when:* the indicator reflects today's priority-weighted completion (all high-priority done → green; nothing → red; partial → yellow) and updates live as habits are checked.

### M5 — Profiles (feature 7)
`RoutineProfile` type; `api/profiles.ts` CRUD + `applyToday(profileId)` (two writes: activate chosen, deactivate previous); `useProfiles`, `useApplyProfile`; `ProfilesScreen`.
*Done when:* user saves ≤10 named profiles, "Apply Today" swaps the active set, and the ≤10 cap is enforced client-side.

### M6 — Standalone data islands (features 8, 9, 10, 13)

**Feature 8 — To-dos.** `Todo` type; `api/todos.ts` CRUD; `useTodos`, `useToggleTodo`, `useCreateTodo`; `TodosScreen` + list on home.
*Done when:* add/complete/delete one-off to-dos, persisted, independent of habits.

**Feature 9 — To-do calendar.** `getTodosForMonth` (`dateKey` range query); `TodoCalendarScreen` (SVG month grid) + backlog query for unscheduled todos.
*Done when:* a month view marks days with todos/appointments and tapping a day lists them.

**Feature 10 — Numeric trackers + charts.** `NumericTracker` + `TrackerEntry`; `api/trackers.ts` (defs + date-keyed entries subcollection); `useTrackers`, `useTrackerEntries`, `useLogTrackerValue`; `TrackerChart` (chart-kit LineChart); `TrackersScreen` + `TrackerDetailScreen`.
*Done when:* user defines a tracker, logs daily values, and sees a trend line over a selectable range.

**Feature 13 — Routine timer.** `useCountdownTimer(seconds)` (turns red + counts overtime past zero); `RoutineTimer` component, launchable from a habit. No persistence in v1.
*Done when:* the timer counts down, turns red at 0, and continues overtime until stopped.

### M7 — Mood & diary (features 11, 12)

**Feature 11 — Mood (REUSE mood).** Consume `src/features/mood` via its `index.ts`. Mood currently exports only `MoodHomeScreen` + `manifest`, so add there: `MoodEntry`/`MoodValue`, a date-range query (`getMoodEntriesInRange`) **or** a documented current-month client-side filter over the limit-based `getMoodHistory`, and a numeric ordinal (`MOOD_ORDER` / `moodToScore`) since `MoodValue` is a string union, not a number. Add a mood entry-point card on the Routines home. No new mood collection.
*Done when:* Routines reads daily mood via the existing mood feature and shows a mood graph; the range query + ordinal used are exported from `src/features/mood/index.ts`.

**Feature 12 — Diary & notes (thin per-day note).** `RoutineDayNote` (collection H); `api/dayNotes.ts` (date-keyed get/set); `useDayNote`, `useSaveDayNote`; note field on the day-detail screen; "Open in Journal" deep-link for long-form.
*Done when:* each day holds one free-text note that saves/loads by date, documented as intentionally separate from Journal with a link-out.

### M8 — Analytics (features 15, 16, 17, 18)

**Feature 15 — Statistics.** `domain/stats.ts` (`computeStats(range)` → `RoutineStats`, per-habit + overall, excluding rest from the denominator); `useRoutineStats(range)`; `StatsScreen` (day/week/month toggle).
*Done when:* completion-rate percentages are correct per habit and overall for the selected range.

**Feature 16 — Heatmap.** `getHabitMonthGrid(habitId, month)` (range query); `HeatmapGrid` (react-native-svg); render on `HabitDetailScreen`.
*Done when:* each habit renders a month grid where each square reflects done/missed/rest.

**Feature 17 — Weekly report.** `getWeeklyReport(weekStart)` (7-day × habit grid + goal-progress %); `WeekGrid` + goal-progress bars.
*Done when:* a week grid shows each habit's daily state across 7 days plus goal-progress % per tag.

**Feature 18 — Monthly report + mood.** `getMonthlyReport(month)` combining `RoutineStats` + monthly mood series. Fetch the month's mood via mood's public date-range export (or a current-month client-side filter over `getMoodHistory`), then map each `MoodValue` string to a 1..5 ordinal via mood's exported `MOOD_ORDER`/`moodToScore` for the trend line; `MonthlyReportScreen`.
*Done when:* one monthly view shows overall/per-habit completion alongside the month's mood trend, with the mood string union mapped to a numeric series for charting.

### M9 — Reminders (feature 24)
Extend `notificationService` with the keyed API + `ReminderLimitError` + `migrateLegacyReminders()` (§8.1); `useHabitReminders`; `reminderKey?` on `Habit`/`Todo`; reminder pickers in editors; global morning/evening setting; `RemindersScreen`.
*Done when:* a user sets morning/evening + per-habit/per-todo reminders that fire at the chosen local time, survive restart, and update/remove correctly; hitting the cap shows the calm limit message.

### M10 — Sharing (feature 19)
Add `react-native-view-shot` + `expo-sharing` (§8.5); wrap `ShareableSummaryCard` in a capture ref; `captureRef` → temp file → OS share sheet / save via `expo-file-system`. For SDK 54, write the PNG using the new `File` API (`import { File, Paths } from 'expo-file-system'`) or the legacy helpers (`import * as FileSystem from 'expo-file-system/legacy'`) — not the legacy helpers off the bare `expo-file-system` path (see §8.5).
*Done when:* tapping Share on the monthly summary produces an image that can be saved to Photos or shared via the OS share sheet.

---

## 10. Decisions Log & Open Questions

### Resolved decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Working feature name is **"Routines"**; single module `src/features/routines/`, category `"practice"`, one Tools tile. | Matches how `cbt` bundles five methods behind one manifest; the 21 features are one product surface with heavy cross-dependencies, and sibling modules would force forbidden cross-feature imports. |
| D2 | **Collection C `routineCompletions` (composite id `${habitId}_${dateKey}`) is the single source of truth.** Streaks, shields, Green Light, all stats/heatmaps/reports are pure client-side derivations. | Storing derived values creates a second source of truth that drifts. Composite id makes "done today?" a 1-doc `getDoc` and every stat query `dateKey`-range-bounded. |
| D3 | Collections are **`routine*`-namespaced** (`routineHabits`, `routineCompletions`, `routineTodos`, `routineProfiles`, `routineGoalTags`, `routineTrackers`, `routineDayNotes`, `routineReminders`). | Resolves a naming conflict between the source research (some used bare `habits`/`todos`). Namespacing keeps `firestore.rules` scoping unambiguous and avoids collision with any future top-level habit feature. |
| D4 | Completion doc-id order is **`${habitId}_${dateKey}`** (habit first). | Resolves an inconsistency in the source research (one draft used `${dateKey}_${habitId}`). Either works with denormalized `habitId`/`dateKey` fields; habit-first chosen for consistency across the suite. |
| D5 | **Feature 11 (mood): REUSE `src/features/mood`**, consumed via its public `index.ts`. No `routineMoodEntries` collection. Mood must additionally surface on its `index.ts`: (a) a date-range query (e.g. `getMoodEntriesInRange`) **or** a documented current-month client-side filter over `getMoodHistory`, and (b) a numeric ordinal (`MOOD_ORDER` / `moodToScore`), since the stored `MoodValue` is a string union, not a number. | Mood already stores date-keyed daily moods (string union `"terrible".."great"`, not a numeric score) with a limit-based history query. A parallel collection would fork user data and break the single-source-of-truth invariant. `boundaries` forbids importing mood internals, so the range query + ordinal must be added to mood's public `index.ts`. |
| D6 | **Feature 12 (diary): thin standalone `routineDayNotes` (one free-text note per day) + optional "Open in Journal" deep-link.** Do NOT fold into `src/features/journal`. | `src/features/journal` is a titled, multi-entry-per-day model with prompts; "one note attached to a day" doesn't fit it, and forcing it would distort journal and couple the suites. (Note: the source research offered two options — reuse-journal-for-notes vs. thin standalone. Thin standalone chosen as primary because it matches the date-key idempotency used everywhere else in this suite; journal reuse remains available for long-form via the deep-link.) |
| D7 | **To-dos store done-ness on the instance** (`done`/`completedAt` on the `Todo` doc). No `TodoOccurrence`/per-day collection. | A to-do is a single instance, not a recurring habit; inventing occurrence rows for one-shot items is needless. |
| D8 | **Extend `notificationService` with a keyed-map API; do not remove existing methods.** Cap keyed reminders at 60 (iOS 64 limit) with a user-driven `ReminderLimitError`; migrate legacy keys under `"daily"`. | Meditation still depends on the singleton methods. The two hardcoded AsyncStorage keys can't represent per-habit/per-todo identity. |
| D9 | **Add `react-native-view-shot` + `expo-sharing`** for feature 19. Charts/heatmaps ship on already-installed `react-native-chart-kit` + `react-native-svg`. Write the captured PNG via SDK 54's `expo-file-system` `File` API or `expo-file-system/legacy` (not legacy helpers off the bare path — see §8.5). | `view-shot` is confirmed not installed; the rest are present. `expo-file-system@~19.0.21` (SDK 54) moved the legacy `FileSystem.*` helpers to `expo-file-system/legacy`, so the save path must name its import surface. |
| D10 | Manifest accent color **`#8FA98C`** (calm sage), icon `repeat-outline`. | Distinct from mood `#7DAFB4` and cbt `#C4A77D`; on-brand, vector icon, no emoji. |

### Open questions

- **OQ1 — [RESOLVED 2026-07-01]:** Routines is **FREE for now**. Manifest ships `requiresSubscription: false` (as built in M0). Flip to `true` later if premium-gated (single-field change).
- **OQ2 — [RESOLVED 2026-07-01]:** Reminders **mirror to Firestore**. Activate collection I `routineReminders` (rules added in M0) as the cross-device source of truth, with device-local AsyncStorage as the fast cache. Implement the mirror in M9 (`hooks/useHabitReminders.ts` + notificationService keyed API writes through to Firestore).
- **OQ3:** Green Light thresholds (0.8 / 0.4) are placeholders — confirm with design before shipping.
- **OQ4:** Shield period semantics (`shieldsMax` per what — week? month?) — confirm and encode the period in `shieldsRemaining(habit, completions, period)`.
- **OQ5:** Should `RoutinesHomeScreen` use a segmented control or section-link cards for the mini-hub? Decide during M1 UI.

---

## 11. Session Log (append-only)

> After every work session, append a row. Keep newest at the bottom.

| Date | Session summary | Features touched | Next up |
|---|---|---|---|
| 2026-07-01 | *(example)* Created this build plan; scaffolded nothing yet. | — | M0 — module scaffold + registry/route wiring |
| 2026-07-01 | **M0 complete.** Scaffolded `src/features/routines/` (manifest, full `types.ts`, `index.ts`, `domain/dateKeys.ts`, `domain/repeat.ts` skeleton, placeholder `RoutinesHomeScreen`). Wired `src/registry.ts`, `app/routines.tsx`, `_layout` Stack.Screen, Tools tile, and all `firestore.rules` blocks. `tsc --noEmit` + `eslint` both clean. Resolved OQ1 (free) & OQ2 (mirror reminders to Firestore). Laid down the full `types.ts` data model ahead of schedule. | M0; `types.ts` (full) | M1 — core loop: `api/habits.ts` + `api/completions.ts`, hooks, `HabitEditorScreen`, and the real Today checklist on `RoutinesHomeScreen`. Also: run a simulator smoke test of `/routines`, and deploy `firestore.rules` before first write. |
| 2026-07-01 | **M1 complete (features 1, 2, 3).** Built `api/habits.ts` + `api/completions.ts`, hooks (`useHabits`, `useHabitCompletions` incl. `useWeekCompletions`), `data/presets.ts`, `components/HabitRow` + `RepeatPicker`, `HabitEditorScreen` (create) + route `app/routines/habit/new.tsx`, and the real Today screen (moment groups, tap-to-check, rest-day long-press, done/total). Feature 2 quota fully wired via pure `isDueToday`. `tsc` + `eslint` clean. | 1, 2, 3 | M2 — habit attributes (difficulty, priority, goal tags). Also still pending from M0/M1: **deploy `firestore.rules`**, create the `(habitId, dateKey)` composite index, and a simulator smoke test (auth + create habit + check-off + restart persistence). |

---

## 12. Changelog

| Date | Change |
|---|---|
| 2026-07-01 | Initial build plan authored. Consolidated conventions cheat sheet, data model, module/reuse map, and phasing into one document. Resolved decisions D1–D10 (see §10), including `routine*` collection namespacing (D3), completion id order `${habitId}_${dateKey}` (D4), and the diary thin-standalone choice (D6). |
| 2026-07-01 | Applied reviewer corrections: (1) §5.8 `firestore.rules` snippet now nests all `routine*` blocks inside `match /users/{userId}` and uses the repo's null-guarded `if request.auth != null && request.auth.uid == userId;` form (M0 checklist + facts-verified line updated to match); (2) §6.12/D5/§9 mood-reuse now requires mood's `index.ts` to additionally export a date-range query (or documented current-month client filter) **and** a numeric ordinal (`MOOD_ORDER`/`moodToScore`), and stops calling the stored `MoodValue` a "5-point score" (it is a string union); (3) §5.1 cross-feature imports reworded to "only via public `index.ts`"; (4) `toDateKey` located to `src/features/mood/api/moodEntries.ts` (not exported) with copy-not-import guidance; (5) feature-18 journal-read clause scoped to navigation-only; (6) §8.5/§9 M10/D9 specify the SDK 54 `expo-file-system` import surface (`File` API or `expo-file-system/legacy`). |
| 2026-07-01 | **M0 implemented & verified** (`tsc --noEmit` + `eslint` clean). Created the `routines` module, wired registry/route/Tools tile/`_layout`, added all `firestore.rules` blocks, and laid down the full `types.ts` data model ahead of schedule. OQ1 resolved (free tier), OQ2 resolved (Firestore reminder mirror → collection I active). Data model, conventions, and phasing unchanged. |
| 2026-07-01 | **M1 implemented & verified** (`tsc --noEmit` + `eslint` clean). Features 1–3: habit CRUD + completion log, Today screen, habit editor, repeat picker, rest days, and the times-per-week/weekly quota. Minor API refinement vs. the spec: `toggleCompletion` split into `setCompletion`/`clearCompletion` (so un-check deletes the doc); added `getCompletionsForRange` + `useWeekCompletions` for the quota. Data model unchanged. |
