/**
 * ============================================================
 * features/mood/types.ts — Mood feature domain types
 * ============================================================
 *
 * Owned by the mood feature. A daily 5-point check-in. Other features must not
 * import these directly; surface through index.ts if ever needed (Phase 8
 * enforces this).
 * ============================================================
 */

/** The 5-point mood scale, low → high. */
export type MoodValue = "terrible" | "bad" | "okay" | "good" | "great";

/**
 * A single day's mood check-in.
 *
 * One entry per day (v1): the document id is the local date key (YYYY-MM-DD),
 * so re-checking-in overwrites the day's entry. `createdAt` is epoch ms.
 *
 * Firestore path: users/{userId}/moodEntries/{YYYY-MM-DD}
 */
export interface MoodEntry {
  id: string;
  userId: string;
  value: MoodValue;
  note?: string;
  createdAt: number;
}
