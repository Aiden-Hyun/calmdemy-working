/**
 * ============================================================
 * features/library/contentIcons.ts — category → icon mapping
 * ============================================================
 *
 * Single source of truth for the "category badge" icon used by the music
 * tab (album/sound categories) and the sleep tab + bedtime-stories list
 * (series/story categories). Consolidated in Phase 5 Step 8 from three
 * duplicated local copies.
 *
 * The two original mappings were domain-disjoint (music: ambient/piano/
 * classical/lofi; sleep: fantasy/travel/thriller/fiction) and only
 * overlapped on `nature → leaf`, so a single merged switch preserves every
 * real call-site result. They differed only in their *default*: music fell
 * back to `disc`, sleep/stories to `book`. That difference is preserved via
 * the `fallback` parameter, so no visible behavior changes.
 * ============================================================
 */

import type { Ionicons } from '@expo/vector-icons';

/**
 * Map a content category to an Ionicons glyph.
 *
 * @param category Firestore category string (album/series/story/sound)
 * @param fallback Icon to use for unknown categories. Music uses the default
 *                 `disc`; sleep/series/story call sites pass `book`.
 */
export function getCategoryIcon(
  category: string,
  fallback: keyof typeof Ionicons.glyphMap = 'disc'
): keyof typeof Ionicons.glyphMap {
  switch (category) {
    // shared
    case 'nature':
      return 'leaf';
    // music / album categories
    case 'ambient':
      return 'planet';
    case 'piano':
      return 'musical-notes';
    case 'classical':
      return 'musical-note';
    case 'lofi':
      return 'headset';
    // sleep / series / story categories
    case 'fantasy':
      return 'planet';
    case 'travel':
      return 'airplane';
    case 'thriller':
      return 'skull';
    case 'fiction':
      return 'book';
    default:
      return fallback;
  }
}
