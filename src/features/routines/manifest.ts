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
    "goal",
    "reminder",
  ],
  enabled: true,
};

/**
 * To-dos and Trackers live inside the routines module (they share its types,
 * domain helpers, and Firestore collections) but surface as their OWN tiles on
 * the Tools tab — so they get their own manifests here rather than a separate
 * feature module (which the boundaries lint rule would block from importing
 * routines' internals). Their routes stay under /routines/*.
 */
export const todosManifest: FeatureManifest = {
  id: "todos",
  label: "To-dos",
  description: "Quick one-off tasks and a simple month calendar.",
  icon: "checkbox-outline",
  color: "#A5B4D4",
  route: "/routines/todos",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ["to-do", "todo", "tasks", "checklist", "calendar", "reminder"],
  enabled: true,
};

export const trackersManifest: FeatureManifest = {
  id: "trackers",
  label: "Trackers",
  description: "Log daily numbers like weight or workouts and watch the trend.",
  icon: "stats-chart-outline",
  color: "#C9A0C0",
  route: "/routines/trackers",
  category: "practice",
  requiresAuth: true,
  requiresSubscription: false,
  searchKeywords: ["tracker", "trackers", "weight", "chart", "trend", "log", "measure"],
  enabled: true,
};
