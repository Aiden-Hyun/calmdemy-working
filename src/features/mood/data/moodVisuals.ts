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

// Emoji are built from numeric codepoints rather than literal characters:
// astral-plane (4-byte) emoji literals can survive the source file fine but get
// mangled in the Metro/Hermes bundle pipeline, rendering as missing-glyph boxes
// at runtime. String.fromCodePoint sidesteps that — the source stays pure ASCII
// and the exact codepoint is reconstructed on device.
const EMOJI = {
  terrible: String.fromCodePoint(0x1f623), // 😣 persevering face
  bad: String.fromCodePoint(0x1f641), // 🙁 slightly frowning face
  okay: String.fromCodePoint(0x1f610), // 😐 neutral face
  good: String.fromCodePoint(0x1f642), // 🙂 slightly smiling face
  great: String.fromCodePoint(0x1f60a), // 😊 smiling face with smiling eyes
};

export const moodVisuals: Record<MoodValue, MoodVisual> = {
  terrible: { emoji: EMOJI.terrible, color: "#A8576C", label: "Terrible" },
  bad: { emoji: EMOJI.bad, color: "#C4928E", label: "Bad" },
  okay: { emoji: EMOJI.okay, color: "#B8B4AE", label: "Okay" },
  good: { emoji: EMOJI.good, color: "#A8B89F", label: "Good" },
  great: { emoji: EMOJI.great, color: "#8B9F82", label: "Great" },
};

/** Mood values in display order (low → high). */
export const MOOD_ORDER: MoodValue[] = ["terrible", "bad", "okay", "good", "great"];
