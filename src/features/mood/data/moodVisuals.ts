/**
 * ============================================================
 * features/mood/data/moodVisuals.ts — Mood value presentation
 * ============================================================
 *
 * The emoji, accent color, and label for each mood value, plus the canonical
 * low→high order used by the picker and the history dots. Muted, on-brand
 * palette spanning warm → sage so the 14-day history reads as a gradient.
 * ============================================================
 */

import { MoodValue } from "../types";

export interface MoodVisual {
  emoji: string;
  color: string;
  label: string;
}

export const moodVisuals: Record<MoodValue, MoodVisual> = {
  terrible: { emoji: "😣", color: "#A8576C", label: "Terrible" },
  bad: { emoji: "🙁", color: "#C4928E", label: "Bad" },
  okay: { emoji: "😐", color: "#B8B4AE", label: "Okay" },
  good: { emoji: "🙂", color: "#A8B89F", label: "Good" },
  great: { emoji: "😊", color: "#8B9F82", label: "Great" },
};

/** Mood values in display order (low → high). */
export const MOOD_ORDER: MoodValue[] = ["terrible", "bad", "okay", "good", "great"];
