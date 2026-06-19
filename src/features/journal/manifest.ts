/**
 * ============================================================
 * features/journal/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the journal feature IS — surfaced to Discover,
 * search, and deep-link routing through the registry (see src/registry.ts).
 * ============================================================
 */

import type { FeatureManifest } from "../../registry";

export const manifest: FeatureManifest = {
  id: "journal",
  label: "Journal",
  description:
    "Write reflections or whatever's on your mind, with optional prompts to get started.",
  icon: "book-outline",
  color: "#B4A7C7",
  route: "/journal",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ["journal", "write", "reflection", "thoughts", "feelings", "diary"],
  enabled: true,
};
