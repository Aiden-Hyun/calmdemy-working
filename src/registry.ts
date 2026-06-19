/**
 * ============================================================
 * registry.ts — Feature Manifest Contract & Registry
 * ============================================================
 *
 * Architectural Role:
 *   Every feature module (under src/features/<name>/) exports a manifest
 *   that conforms to FeatureManifest. The manifest is the single source
 *   of truth about what the feature is, where it lives, who can see it,
 *   and how to find it.
 *
 *   This file owns:
 *     1. The FeatureManifest type — the contract.
 *     2. FeatureCategory — the grouping taxonomy for the Discover tab.
 *     3. featureRegistry — the array each feature pushes its manifest
 *        onto. Populated by feature index.ts re-exports + Phase 7's
 *        registry builder.
 *
 *   Why centralized: features can't depend on each other, but they all
 *   need the same shape to be listable, searchable, and route-mappable.
 *   Putting the type here at the src/ root makes it equally importable
 *   from every feature without creating a cross-feature dependency.
 *
 * Consumed By:
 *   - features/<name>/manifest.ts — imports the type
 *   - The future Discover tab (Phase 7) — iterates `featureRegistry`
 *   - The future search helper (Phase 7) — filters on label / keywords
 *   - The future Home personalization (Phase 7) — filters by category + gates
 * ============================================================
 */

import type { Ionicons } from '@expo/vector-icons';

// Every feature's manifest, imported from its public index.ts. Explicit
// import + push (no auto-discovery, no side-effect imports): one file, one
// source of truth. Alphabetical by feature for readability; the registry
// array below orders them by category.
import { manifest as authManifest } from './features/auth';
import { manifest as breathingManifest } from './features/breathing';
import { manifest as downloadsManifest } from './features/downloads';
import { manifest as emergencyManifest } from './features/emergency';
import { manifest as homeManifest } from './features/home';
import { manifest as journalManifest } from './features/journal';
import { manifest as legalManifest } from './features/legal';
import { manifest as libraryManifest } from './features/library';
import { manifest as meditationManifest } from './features/meditation';
import { manifest as musicManifest } from './features/music';
import { manifest as onboardingManifest } from './features/onboarding';
import { manifest as profileManifest } from './features/profile';
import { manifest as progressManifest } from './features/progress';
import { manifest as settingsManifest } from './features/settings';
import { manifest as sleepManifest } from './features/sleep';
import { manifest as subscriptionManifest } from './features/subscription';

/**
 * Category for grouping features in the Discover tab.
 *
 * - practice — active engagement: breathing, journal, CBT, mood, gratitude
 * - library  — passive audio: meditation, music, sleep stories, ASMR, etc.
 * - progress — stats, milestones, history
 * - account  — auth, settings, profile, subscription
 * - legal    — privacy policy, terms of service
 */
export type FeatureCategory =
  | 'practice'
  | 'library'
  | 'progress'
  | 'account'
  | 'legal';

/**
 * Declaration that every feature module exports.
 *
 * Phase 7 will add a builder that imports every features/<name>/manifest.ts and
 * collects them into a single list for the Discover tab + search.
 */
export interface FeatureManifest {
  /** Unique slug. Stable identifier used as a registry key. */
  id: string;

  /** Display name shown to users. */
  label: string;

  /** One-line summary shown on Discover cards. */
  description: string;

  /** Ionicons glyph name for cards and lists. */
  icon: keyof typeof Ionicons.glyphMap;

  /** Hex color used as the feature's accent (cards, badges, headings). */
  color: string;

  /** Expo Router path to the feature's entry route. */
  route: string;

  /** Category for grouping in Discover. */
  category: FeatureCategory;

  /** Whether the feature requires an authenticated user. */
  requiresAuth: boolean;

  /** Whether the feature requires an active premium subscription. */
  requiresSubscription: boolean;

  /** Keywords for search. Lowercase. */
  searchKeywords: string[];

  /**
   * Soft feature flag. Disabled features stay hidden from Discover and
   * search; their routes remain accessible (so deep links don't break)
   * but they won't be discoverable through the registry.
   */
  enabled: boolean;
}

/**
 * Aggregated list of every feature in the app (all 15, regardless of
 * `enabled`). Ordered by category — library, practice, progress, account,
 * legal — then alphabetical within each category. This is the default order
 * the Discover tab renders when it doesn't impose its own sort.
 *
 * Wired in Phase 7a: explicit import + push, one source of truth.
 */
export const featureRegistry: FeatureManifest[] = [
  // --- library ---
  downloadsManifest,
  homeManifest,
  libraryManifest,
  meditationManifest,
  musicManifest,
  sleepManifest,
  // --- practice ---
  breathingManifest,
  emergencyManifest,
  journalManifest,
  // --- progress ---
  progressManifest,
  // --- account ---
  authManifest,
  onboardingManifest,
  profileManifest,
  settingsManifest,
  subscriptionManifest,
  // --- legal ---
  legalManifest,
];

/**
 * Look up a feature by its `id`. Does NOT filter by `enabled` — deep links and
 * route resolution must work even for hidden features (e.g. emergency, auth).
 *
 * @returns the manifest, or undefined if no feature has that id.
 */
export function getById(id: string): FeatureManifest | undefined {
  return featureRegistry.find((m) => m.id === id);
}

/**
 * All enabled features in a category, in registry order. Discover-facing, so
 * disabled features are excluded.
 */
export function byCategory(category: FeatureCategory): FeatureManifest[] {
  return featureRegistry.filter((m) => m.enabled && m.category === category);
}

/**
 * Case-insensitive substring search across label + description + searchKeywords.
 * Discover-facing, so disabled features are excluded. An empty/whitespace query
 * returns [] (the caller shows the sectioned browse view instead).
 */
export function search(query: string): FeatureManifest[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return featureRegistry.filter((m) => {
    if (!m.enabled) return false;
    const haystack = [m.label, m.description, ...m.searchKeywords]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Every enabled feature, in registry order. Convenience for the Discover
 * "everything" view.
 */
export function allEnabled(): FeatureManifest[] {
  return featureRegistry.filter((m) => m.enabled);
}
