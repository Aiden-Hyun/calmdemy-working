/**
 * ============================================================
 * features/meditation/types.ts — Meditation Domain Types
 * ============================================================
 *
 * Type definitions owned by the meditation feature. Relocated from the
 * shared src/types/index.ts in 6d-4 so the meditation content shapes live
 * next to the screens, queries, and api that consume them.
 *
 * Cross-feature consumers must import these through the feature's public
 * index.ts, never from this file directly.
 * ============================================================
 */

/**
 * Guided meditation content item.
 *
 * Represents a standalone meditation exercise in the /meditations collection.
 * Includes metadata (title, description, duration), media references (audioPath, thumbnailUrl),
 * and tagging for discovery (themes, techniques).
 *
 * Note: themes and techniques are arrays to support multi-tag filtering.
 * For example, a meditation might target both "stress" and "sleep" themes.
 */
export interface GuidedMeditation {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  audioPath: string;
  thumbnailUrl?: string;
  themes: MeditationTheme[];      // Multiple themes allowed for multi-tag discovery
  techniques: MeditationTechnique[]; // Multiple techniques allowed
  difficulty_level: "beginner" | "intermediate" | "advanced";
  instructor?: string;
  isFree?: boolean;
}

/**
 * Meditation theme tags (e.g., "stress", "sleep", "focus").
 *
 * Used to categorize meditations by their primary benefit or use case.
 * Frontend screens filter and display meditations by theme.
 */
export type MeditationTheme =
  | "focus"
  | "stress"
  | "anxiety"
  | "sleep"
  | "relationships"
  | "self-esteem"
  | "gratitude"
  | "loving-kindness";

export type MeditationTechnique =
  | "breathing"
  | "body-scan"
  | "visualization"
  | "loving-kindness"
  | "mindfulness"
  | "grounding"
  | "progressive-relaxation";

/**
 * Legacy alias for MeditationTheme (backwards compatibility).
 * New code should use MeditationTheme directly.
 */
export type MeditationCategory = MeditationTheme;
