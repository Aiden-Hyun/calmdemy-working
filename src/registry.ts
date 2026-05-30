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
 * Aggregated list of every feature in the app.
 *
 * Phase 7 will replace this with a builder that imports every
 * features/<name>/manifest.ts and exposes helpers (getById, byCategory,
 * search). For now the array exists so the type contract is real
 * and downstream code can reference it.
 */
export const featureRegistry: FeatureManifest[] = [];
