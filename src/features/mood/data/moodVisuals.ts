/**
 * ============================================================
 * features/mood/data/moodVisuals.ts — Mood value presentation
 * ============================================================
 *
 * The face icon, accent color, and label for each mood value, plus the
 * canonical low→high order used by the picker and the history dots. Muted,
 * on-brand palette spanning warm → sage so the 14-day history reads as a
 * gradient.
 *
 * Faces use MaterialCommunityIcons (vector) rather than Unicode emoji: emoji
 * rendered as missing-glyph boxes on device, and vector icons are consistent
 * with the rest of the app's icon-based UI and tintable with the mood color.
 * ============================================================
 */

import type { MaterialCommunityIcons } from "@expo/vector-icons";
import { MoodValue } from "../types";

export interface MoodVisual {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  label: string;
}

export const moodVisuals: Record<MoodValue, MoodVisual> = {
  terrible: { icon: "emoticon-cry-outline", color: "#A8576C", label: "Terrible" },
  bad: { icon: "emoticon-sad-outline", color: "#C4928E", label: "Bad" },
  okay: { icon: "emoticon-neutral-outline", color: "#B8B4AE", label: "Okay" },
  good: { icon: "emoticon-happy-outline", color: "#A8B89F", label: "Good" },
  great: { icon: "emoticon-excited-outline", color: "#8B9F82", label: "Great" },
};

/** Mood values in display order (low → high). */
export const MOOD_ORDER: MoodValue[] = ["terrible", "bad", "okay", "good", "great"];
