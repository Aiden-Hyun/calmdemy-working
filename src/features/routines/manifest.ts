/**
 * ============================================================
 * features/routines/manifest.ts — Feature declaration
 * ============================================================
 *
 * Source of truth for what the Routines feature IS — surfaced to the Tools
 * tab, Discover, and search through the registry (see src/registry.ts).
 *
 * Routines is a STANDALONE habit/routine tracker (see docs/routines/BUILD_PLAN.md).
 * All 21 sub-features live behind this single manifest/tile, the same way the
 * CBT feature fans out five methods behind one manifest.
 * ============================================================
 */

import type { FeatureManifest } from "../../registry";

export const manifest: FeatureManifest = {
  id: "routines",
  label: "Routines",
  description: "Build daily habits and routines, track progress, and stay on course.",
  icon: "repeat-outline",
  color: "#8FA98C",
  route: "/routines",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: [
    "routine",
    "routines",
    "habit",
    "habits",
    "streak",
    "tracker",
    "to-do",
    "todo",
    "goal",
    "reminder",
  ],
  enabled: true,
};
