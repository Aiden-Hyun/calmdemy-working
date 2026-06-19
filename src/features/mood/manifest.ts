/**
 * ============================================================
 * features/mood/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the mood feature IS — surfaced to Discover, search,
 * and deep-link routing through the registry (see src/registry.ts).
 * ============================================================
 */

import type { FeatureManifest } from "../../registry";

export const manifest: FeatureManifest = {
  id: "mood",
  label: "Mood",
  description: "A daily check-in to notice how you're really feeling.",
  icon: "happy-outline",
  color: "#7DAFB4",
  route: "/mood",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ["mood", "check-in", "feelings", "daily", "how am i"],
  enabled: true,
};
