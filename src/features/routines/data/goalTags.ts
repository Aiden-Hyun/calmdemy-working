/**
 * ============================================================
 * features/routines/data/goalTags.ts — Default goal-tag seeds (feat 22)
 * ============================================================
 *
 * Seeded into `routineGoalTags` on first use (see api/goalTags.ts). Each uses a
 * stable slug as its Firestore doc id so re-seeding is idempotent. Users can
 * add their own tags on top of these.
 * ============================================================
 */

import type { IoniconName } from "../types";

export interface GoalTagSeed {
  slug: string;
  label: string;
  icon: IoniconName;
  color: string;
}

export const DEFAULT_GOAL_TAGS: GoalTagSeed[] = [
  { slug: "self-care", label: "Self-care", icon: "heart-outline", color: "#D4A5A5" },
  { slug: "growth", label: "Growth", icon: "leaf-outline", color: "#8FA98C" },
  { slug: "tidy", label: "Tidy", icon: "sparkles-outline", color: "#7DAFB4" },
  { slug: "health", label: "Health", icon: "fitness-outline", color: "#A5B4D4" },
  { slug: "focus", label: "Focus", icon: "eye-outline", color: "#C4A77D" },
];
