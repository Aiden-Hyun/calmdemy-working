/**
 * ============================================================
 * features/cbt/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the CBT feature IS — surfaced to Discover, search,
 * and deep-link routing through the registry (see src/registry.ts).
 * ============================================================
 */

import type { FeatureManifest } from "../../registry";

export const manifest: FeatureManifest = {
  id: "cbt",
  label: "CBT Tools",
  description: "Cognitive techniques to identify, challenge, and reframe negative thoughts.",
  icon: "sparkles-outline",
  color: "#C4A77D",
  route: "/cbt",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    "cbt",
    "cognitive",
    "thoughts",
    "reframe",
    "distortion",
    "socratic",
    "gratitude",
    "core beliefs",
    "decatastrophize",
  ],
  enabled: true,
};
