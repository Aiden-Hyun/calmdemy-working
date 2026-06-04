/**
 * ============================================================
 * features/sleep/types.ts — Sleep Domain Types
 * ============================================================
 *
 * Type definitions owned by the sleep feature. Relocated from the shared
 * src/types/index.ts in 6d-4 so the sleep content shapes live next to the
 * screens, queries, and api that consume them.
 *
 * NatureSound and the SleepStory alias are relocated as-is (no current type
 * consumers — kept per the 6c "relocate as-is" decision). BedtimeStory is
 * consumed by the sleep screens and api. Cross-feature consumers must import
 * these through the feature's public index.ts, never from this file directly.
 * ============================================================
 */

/**
 * Nature sound content: ambient audio for relaxation/sleep.
 *
 * Examples: "Rain on Window", "Ocean Waves", "Forest Ambience".
 * Stored in /natureSounds collection. User can favorite these
 * and trigger listening session tracking.
 */
export interface NatureSound {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  audio_url?: string;
  audio_file?: string; // Key for local audio asset (see audioFiles.ts)
  thumbnail_url?: string;
  category: "rain" | "ocean" | "forest" | "fire" | "wind" | "ambient";
  isFree: boolean;
  created_at: string;
}

/**
 * Bedtime story: narrated content for sleep and wind-down.
 *
 * Examples: "The Shoemaker and the Elves", "Midnight Crossing".
 * Stored in /bedtimeStories. Includes narrator credit and category tags.
 */
export interface BedtimeStory {
  id: string;
  title: string;
  description: string;
  narrator: string;
  duration_minutes: number;
  audio_url?: string;
  audio_file?: string; // Key for local audio asset (see audioFiles.ts)
  thumbnail_url?: string;
  category: "nature" | "fantasy" | "travel" | "fiction" | "thriller" | "fairytale";
  isFree: boolean;
  created_at: string;
}

/**
 * Legacy type alias for backwards compatibility.
 * SleepStory and NatureSound are not equivalent; this is a data migration artifact.
 */
export type SleepStory = NatureSound;
