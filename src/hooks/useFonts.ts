/**
 * ============================================================
 * useFonts.ts — Font Loading & Typography System (Facade)
 * ============================================================
 *
 * Architectural Role:
 *   This module exposes a simple font loading hook and a centralized typography
 *   constant object. It acts as a Facade over expo-font, abstracting font imports
 *   and lifecycle management, and provides a single source of truth for all font
 *   names throughout the app.
 *
 * Design Patterns:
 *   - Facade: useFonts wraps expo-font's useExpoFonts, hiding the complexity of
 *     font imports and returning a simple { fontsLoaded, fontError } result that
 *     the RootLayout can check before rendering the app.
 *   - Strategy (Typography): The `fonts` constant groups fonts by typographic
 *     role (display, body, ui), allowing screens to reference fonts by semantic
 *     purpose rather than hard-coded names. Changing the typography system only
 *     requires updates here.
 *   - Module Constant: The `fonts` object is a static, pre-computed constant
 *     exported alongside the hook, making it available to all components without
 *     any hook or context dependency.
 *
 * Font Selection:
 *   - Fraunces (display): Warm, editorial serif for headlines and section titles.
 *     Uses weights 400–700 for hierarchy.
 *   - Lora (body): Readable serif for long-form text, meditation descriptions,
 *     and quoted content. Includes italic variant for emphasis.
 *   - DM Sans (ui): Friendly, rounded sans-serif for buttons, labels, and UI chrome.
 *     Pairs with the warm serif system to balance elegance with approachability.
 *
 * Usage in RootLayout:
 *   const { fontsLoaded, fontError } = useFonts();
 *   if (!fontsLoaded) return null; // or show splash screen
 *   // Then use fonts.display.bold in Text components
 *
 * Consumed By:
 *   All screens and components that set fontFamily on Text elements.
 * ============================================================
 */

import { useFonts as useExpoFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_700Bold,
  Lora_400Regular_Italic,
} from '@expo-google-fonts/lora';

/**
 * Hook for asynchronously loading custom fonts.
 *
 * This hook wraps expo-font's useExpoFonts to load three font families with
 * multiple weights. Call this in RootLayout and gate app rendering on fontsLoaded.
 * The hook is memoized internally by expo-font — subsequent calls return cached results.
 *
 * @returns Object with fontsLoaded (boolean) and fontError (Error | null)
 */
export function useFonts() {
  // Load all custom fonts, mapping human-readable names to imported font objects.
  // The names used here ('Fraunces-Regular', 'DMSans-Bold', etc.) are arbitrary
  // identifiers that components use when setting fontFamily on Text elements.
  const [fontsLoaded, fontError] = useExpoFonts({
    // --- Fraunces: Display font (warm, editorial serif) ---
    // Used for headlines and prominent titles. 400–700 weight range for hierarchy.
    'Fraunces-Regular': Fraunces_400Regular,
    'Fraunces-Medium': Fraunces_500Medium,
    'Fraunces-SemiBold': Fraunces_600SemiBold,
    'Fraunces-Bold': Fraunces_700Bold,

    // --- DM Sans: UI font (friendly, rounded sans-serif) ---
    // Used for buttons, labels, and UI chrome. Pairs the editorial serif system
    // with a warm, approachable sans-serif to balance formality with friendliness.
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-SemiBold': DMSans_600SemiBold,
    'DMSans-Bold': DMSans_700Bold,

    // --- Lora: Body font (readable serif) ---
    // Used for body text, meditation descriptions, and long-form content.
    // Includes an italic variant for emphasis and quotations.
    'Lora-Regular': Lora_400Regular,
    'Lora-Medium': Lora_500Medium,
    'Lora-SemiBold': Lora_600SemiBold,
    'Lora-Bold': Lora_700Bold,
    'Lora-Italic': Lora_400Regular_Italic,
  });

  return { fontsLoaded, fontError };
}

/**
 * Centralized font family constants for consistent typography across the app.
 *
 * This object groups fonts by semantic role (display, body, ui) rather than
 * technical name, allowing screens to request fonts by intent rather than
 * hard-coding font names. Changing the typography system only requires
 * updates in this one location.
 *
 * Usage: Text style={{ fontFamily: fonts.display.bold }}
 */
export const fonts = {
  // --- Display / Headlines ---
  // Warm, editorial serif for visual emphasis. Use bold or semiBold for section
  // headers, screen titles, and call-to-action text that needs prominence.
  display: {
    regular: 'Fraunces-Regular',
    medium: 'Fraunces-Medium',
    semiBold: 'Fraunces-SemiBold',
    bold: 'Fraunces-Bold',
  },

  // --- Body / Long-form Content ---
  // Readable serif for meditation descriptions, story text, and quoted content.
  // Includes italic for emphasis and citations.
  body: {
    regular: 'Lora-Regular',
    medium: 'Lora-Medium',
    semiBold: 'Lora-SemiBold',
    bold: 'Lora-Bold',
    italic: 'Lora-Italic',
  },

  // --- UI / Labels & Controls ---
  // Friendly, rounded sans-serif for buttons, labels, form fields, and interface chrome.
  // Balances the warm serif system with modern, approachable UI typography.
  ui: {
    regular: 'DMSans-Regular',
    medium: 'DMSans-Medium',
    semiBold: 'DMSans-SemiBold',
    bold: 'DMSans-Bold',
  },
};

