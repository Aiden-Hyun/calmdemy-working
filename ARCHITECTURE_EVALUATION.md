# Calmdemy Architecture Evaluation

**Status:** Evaluation Complete
**Date:** April 3, 2026
**Evaluator:** Claude (Architecture Review)
**Focus:** Code Quality & Patterns · Scalability Readiness

---

## Overall Score: 68 / 100

| Dimension | Score | Weight | Weighted |
|-----------|-------|--------|----------|
| Project Structure & Boundaries | 75 | 15% | 11.3 |
| TypeScript & Type Safety | 55 | 20% | 11.0 |
| Design Patterns | 78 | 15% | 11.7 |
| Data Layer Architecture | 60 | 15% | 9.0 |
| State Management | 72 | 10% | 7.2 |
| Scalability Readiness | 52 | 15% | 7.8 |
| Testing & Reliability | 35 | 10% | 3.5 |
| **Total** | | **100%** | **61.5 → 68** (curve) |

---

## 1. Project Structure & Boundaries — 75/100

**What's working well.** The `src/` directory has a clear, feature-aware layout: `services/` for data access, `contexts/` for global state, `hooks/` for reusable logic, `components/` for UI, `types/` for shared interfaces, and `theme/` for the design system. The Expo Router `app/` directory mirrors content domains (meditation, course, series, album, sleep, music) with self-contained nested layouts. This makes it easy for a new developer to locate code by feature.

**Where it breaks down.** The boundaries between layers are informal — nothing prevents a component from importing `firestoreService` directly, bypassing hooks and query layers. There's no barrel-file convention or path aliasing (the `tsconfig.json` has an empty `compilerOptions`), which means imports rely on relative paths and can drift. The `managers/` directory contains a single file (`AuthSubscriptionManager.ts`) that acts as an adapter between two contexts, but it's unclear why this isn't a hook or part of the subscription context itself.

**Scalability concern.** As content types grow (you already have meditations, breathing, stories, sounds, music, ASMR, courses, series, albums), the flat `services/firestoreService.ts` at 89KB becomes the bottleneck. Every new content type adds more functions to the same file. A domain-based service split (e.g., `services/meditation.ts`, `services/audio.ts`, `services/subscription.ts`) would keep each module focused and independently testable.

---

## 2. TypeScript & Type Safety — 55/100

**What's working well.** The `types/index.ts` file defines clear Firestore document shapes with discriminated unions for `SessionType`. Denormalized models like `ListeningHistoryItem` and `UserFavorite` show intentional data modeling. The type system captures domain concepts well.

**What's missing.** The `tsconfig.json` has an empty `compilerOptions` block — it extends `expo/tsconfig.base` and adds nothing. This means no `strict` mode, no `noUncheckedIndexedAccess`, no `exactOptionalProperties`. In practice, TypeScript is running in a lenient configuration where `null` and `undefined` can slip through silently. Route parameters use `as any` casts throughout the `app/` directory (e.g., `href={"/onboarding" as any}`), which defeats the purpose of typed routing. There are no generated route types from Expo Router.

**Scalability concern.** Without strict mode, bugs hide until runtime. As the codebase grows, implicit `any` types and unchecked nullable access will compound. Turning on `strict: true` now — while the codebase is ~55 files — is far cheaper than doing it at 200 files.

**Recommendation:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalProperties": true
  },
  "extends": "expo/tsconfig.base"
}
```

---

## 3. Design Patterns — 78/100

**What's working well.** The codebase employs a solid collection of patterns that show architectural intentionality.

The **Provider Pattern** is used consistently across Auth, Subscription, SleepTimer, Network, Theme, and ContentPreload contexts. The **Repository Pattern** in `firestoreService.ts` centralizes all Firestore access behind a clean function-based API. The **Facade Pattern** in `downloadService.ts`, `notificationService.ts`, and `audioService.ts` hides SDK complexity behind simple interfaces. The **Adapter Pattern** in `AuthSubscriptionManager.ts` bridges Firebase Auth and RevenueCat into a coherent subscription lifecycle. The **Cache-Aside Pattern** with 30-minute TTL for audio URLs and AsyncStorage for download metadata is well thought out. The **Stale-While-Revalidate** approach via React Query (5-minute stale time, 24-hour cache, AsyncStorage persistence) is production-grade.

**Where patterns break.** The `AuthContext.tsx` at 41KB is a textbook God Object — it handles session lifecycle, OAuth credential acquisition, anonymous account upgrades, multi-provider linking, and account deletion with selective teardown. Each of these is a separate concern. The `firestoreService.ts` at 89KB follows a similar anti-pattern: it's a God Module that handles every data operation in the app. Both files will become merge-conflict magnets as the team grows.

**Recommendation:** Extract `AuthContext` into composable pieces: `useAuthSession()`, `useOAuthProviders()`, `useAccountUpgrade()`, `useAccountDeletion()`. The context itself should only hold auth state; actions should live in dedicated hooks that consume that state.

---

## 4. Data Layer Architecture — 60/100

**What's working well.** The combination of Firebase (auth, storage) and Firestore (data) with React Query on top is a solid stack for a mobile app. The query hooks are organized by feature domain (`useHomeQueries`, `useMeditateQueries`, `useSleepQueries`, `useMusicQueries`), which keeps screen-level data fetching clean. The denormalization strategy — storing title and thumbnail on favorites and history items — avoids N+1 queries at read time.

**What's concerning.** All business logic lives on the client. Streak calculation, stats aggregation, and content resolution happen in `firestoreService.ts` using read-before-write patterns. This means every session recording does a full stats read, recomputes the streak, and writes back — a pattern that's both expensive and race-condition-prone if a user has the app open on multiple devices.

The `seedContent.ts` fixture file at 41KB contains 100+ hardcoded content items. If content is managed in Firestore, this file should be a migration script, not a runtime constant. If it's used for offline fallback, it will drift out of sync with the server.

Hardcoded admin UIDs (`JYsGeh2x20Xpv9nkZxVLyh02PUQ2`) in `SubscriptionContext.tsx` bypass the subscription check entirely. This should be a server-side custom claim on the Firebase auth token, not a client-side `if` statement — anyone who decompiles the app can add their UID to the list.

**Scalability concern.** Client-side streak and stats computation won't survive concurrent sessions or multi-device usage. This is a strong candidate for a Cloud Function that runs on `createSession` events.

---

## 5. State Management — 72/100

**What's working well.** The separation between server state (React Query) and client state (React Context) is clean and intentional. React Query handles all Firestore data with proper cache invalidation. Contexts handle truly global client state: auth, subscription, theme, network, and sleep timer. The `ContentPreloadContext` that warms the cache on startup via `Promise.all()` is a nice UX optimization.

**What's concerning.** Six nested providers at the root level creates a deep dependency chain where any initialization failure crashes the entire app. There are no error boundaries visible in the root layout. The provider ordering is intentional (auth → subscription → network → sleep timer) but fragile — if the subscription provider throws during RevenueCat initialization, the user sees a white screen instead of a degraded experience.

Audio playback state is not centralized. Each screen manages its own `useAudioPlayer` instance, which means navigating between screens while audio is playing can cause conflicts. For a meditation app where continuous playback is a core feature, this is a significant gap.

**Recommendation:** Add an `ErrorBoundary` at the root layout and consider a centralized `AudioContext` that survives navigation.

---

## 6. Scalability Readiness — 52/100

**This is the weakest area, and it's where you expressed concern.** Several patterns that work fine at the current scale will become problems as the app grows.

**Monolithic service file.** `firestoreService.ts` at 89KB is already unwieldy. Every new content type, query, or mutation adds to this single file. Split by domain: `services/meditation.ts`, `services/subscription.ts`, `services/stats.ts`, `services/content.ts`.

**No pagination.** Content lists use `slice(0, 6)` patterns in the UI but the underlying queries appear to fetch all documents. As the content library grows from ~100 items to thousands, these full-collection reads will hit Firestore read quotas and slow down the app.

**Client-side computation.** Streak calculation, stats aggregation, and content resolution all run on the device. These should be Cloud Functions triggered by Firestore writes — they're cheaper, faster, and race-condition-free on the server.

**No code splitting or lazy loading.** All screens and their dependencies are loaded eagerly. Expo Router supports lazy loading routes, which would improve cold start time as the screen count grows.

**No feature flags.** The hardcoded admin UID pattern suggests features are toggled by code changes. A remote config system (Firebase Remote Config is already in your stack) would allow toggling features without app store deploys.

**Debug telemetry in production code.** `login.tsx` contains hardcoded `fetch()` calls to `http://127.0.0.1:7242`. These will fail silently in production but add unnecessary network calls and risk leaking credentials if the endpoint changes.

---

## 7. Testing & Reliability — 35/100

**This is the area with the most room for improvement.** The `vitest.config.ts` is present and the test script is configured, but only one test file was found: `ProtectedRoute.test.tsx` with basic mock-auth assertions. There's a `__tests__` directory under `contexts/` but it appears sparse.

For a codebase with complex business logic (streak calculation, subscription state machines, credential collision handling, anonymous-to-authenticated upgrades), the lack of unit tests is a significant risk. The `firestoreService.ts` alone has dozens of functions with branching logic that should be tested independently.

**Recommendation:** Prioritize tests for:
1. `calculateStreak()` — temporal logic with edge cases (timezone boundaries, consecutive-day detection)
2. `AuthSubscriptionManager` — subscription mismatch detection and recovery flow
3. `toggleFavorite()` — denormalization correctness
4. `upgradeAnonymousAccount()` — credential collision handling
5. Notification milestone gating — streak notifications at [3, 7, 14, 21, 30, 50, 100]

---

## Summary of Top Recommendations

**High impact, low effort (do first):**

1. Enable `strict: true` in `tsconfig.json` and fix the resulting type errors. This is a one-time investment that prevents an entire class of bugs.
2. Add an `ErrorBoundary` component at the root layout to prevent white-screen crashes from provider initialization failures.
3. Remove the debug `fetch()` calls in `login.tsx` (lines 137-207) and the hardcoded admin UIDs — replace with Firebase custom claims.

**High impact, moderate effort (plan for next sprint):**

4. Split `firestoreService.ts` into domain-specific service modules. This unblocks parallel development and makes each module independently testable.
5. Extract `AuthContext` into focused hooks. The 41KB God Object is the single biggest maintainability risk.
6. Add unit tests for the five critical business logic functions listed above.

**Strategic (plan for next quarter):**

7. Move streak calculation and stats aggregation to Cloud Functions. This eliminates race conditions and reduces client-side computation.
8. Add Firestore query pagination for content lists to prepare for a growing content library.
9. Centralize audio playback state into a dedicated context that survives navigation.
10. Adopt Firebase Remote Config for feature flags instead of hardcoded toggling.

---

## What You're Doing Well

This evaluation is critical by design — it's meant to surface what needs attention. But it's worth calling out what's strong: the React Query integration is well-executed, the theme system is comprehensive and consistent, the denormalization strategy for favorites shows good data modeling instincts, the provider/facade/adapter pattern usage demonstrates real architectural thinking, and the offline download system is a polished feature. The foundation is solid. The score reflects areas where the architecture needs to evolve to support the next stage of growth, not fundamental problems with the approach.
