/**
 * ============================================================
 * features/routines/data/presets.ts — Static presets for the editor + Today
 * ============================================================
 *
 * Display metadata for the moment/situation anchors (feat 1) plus the curated
 * icon/color choices offered in the habit editor. All Ionicons are outline
 * glyphs — no emoji (current design direction).
 * ============================================================
 */

import type { IoniconName, RoutineMoment } from "../types";

/** The moments/situations a habit can anchor to, in display order (Today groups by this). */
export const MOMENT_ORDER: RoutineMoment[] = [
  "wake-up",
  "morning",
  "midday",
  "afternoon",
  "evening",
  "before-bed",
  "anytime",
];

/** Label + icon shown for each moment section. */
export const MOMENT_META: Record<RoutineMoment, { label: string; icon: IoniconName }> = {
  "wake-up": { label: "Wake up", icon: "sunny-outline" },
  morning: { label: "Morning", icon: "partly-sunny-outline" },
  midday: { label: "Midday", icon: "cafe-outline" },
  afternoon: { label: "Afternoon", icon: "time-outline" },
  evening: { label: "Evening", icon: "moon-outline" },
  "before-bed": { label: "Before bed", icon: "bed-outline" },
  anytime: { label: "Anytime", icon: "infinite-outline" },
};

/** Curated icon choices for a new habit. */
export const HABIT_ICONS: IoniconName[] = [
  "water-outline",
  "barbell-outline",
  "book-outline",
  "leaf-outline",
  "walk-outline",
  "bicycle-outline",
  "nutrition-outline",
  "heart-outline",
  "musical-notes-outline",
  "pencil-outline",
  "bed-outline",
  "sunny-outline",
];

/** Curated accent colors, tuned to the calm palette. */
export const HABIT_COLORS: string[] = [
  "#8FA98C",
  "#7DAFB4",
  "#C4A77D",
  "#D4A5A5",
  "#A5B4D4",
  "#B4A5D4",
  "#D4C4A5",
  "#A5D4B4",
];
