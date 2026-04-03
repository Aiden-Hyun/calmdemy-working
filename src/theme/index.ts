/**
 * ============================================================
 * theme/index.ts — Design System: Colors, Typography, Spacing
 * ============================================================
 *
 * Architectural Role:
 *   This module defines the complete visual design system for Calmdemy.
 *   It provides type-safe access to colors, typography (font families,
 *   sizes, line heights), spacing, border radii, shadows, and gradients.
 *
 * Design Patterns:
 *   - Design System/Tokens: All visual constants are centralized here
 *     rather than hardcoded in components. This ensures consistency,
 *     simplifies theme changes, and enables light/dark mode variants.
 *   - Strategy Pattern: lightColors vs. darkColors define two complete
 *     color strategies. createTheme() builds the full theme from a
 *     color palette, allowing easy theme switching.
 *   - Composition: sharedTheme contains non-color tokens (spacing,
 *     typography, borders) that are identical in light/dark modes.
 *     createTheme() combines colors + shared tokens into one Theme object.
 *
 * Key Concepts:
 *   - ThemeColors: Interface defining all color tokens (primary, accent,
 *     status colors, semantic colors for moods).
 *   - lightColors / darkColors: Two complete color palettes following
 *     warm, organic design aesthetic (sage green, terracotta, dusty rose).
 *   - Typography: Font families (Fraunces for display, Lora for body,
 *     DM Sans for UI) and scales (h1, h2, body, label, caption, etc.).
 *   - Theme: The complete, immutable design system object passed to
 *     styled components via ThemeContext.
 *
 * Consumed By:
 *   All styled components via useTheme() hook.
 *   Example: const { colors, spacing, shadows } = useTheme();
 * ============================================================
 */

// --- Type Definitions ---

/**
 * Complete color palette interface.
 *
 * Defines all semantic color tokens used throughout the app.
 * Implementations (lightColors, darkColors) provide specific hex values.
 */
export interface ThemeColors {
  // Primary palette - Sage Green
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary - Warm Terracotta
  secondary: string;
  secondaryLight: string;
  secondaryDark: string;
  
  // Accent - Dusty Rose
  accent: string;
  accentLight: string;
  accentDark: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceElevated: string;
  
  // Text colors
  text: string;
  textLight: string;
  textMuted: string;
  textOnPrimary: string;
  textOnDark: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Neutral colors - Warm grays
  gray: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
  
  // Special colors for meditation moods
  calm: string;
  focus: string;
  relax: string;
  sleep: string;
  energy: string;
  
  // Sleep mode colors (always dark)
  sleepBackground: string;
  sleepSurface: string;
  sleepAccent: string;
  sleepText: string;
  sleepTextMuted: string;
}

/**
 * Light mode color palette.
 *
 * Warm, organic aesthetic with muted earth tones:
 *   - Primary (Sage Green): calming, meditative
 *   - Secondary (Terracotta): warm, grounding
 *   - Accent (Dusty Rose): soft, welcoming
 *   - Backgrounds: warm whites/creams
 *   - Text: warm charcoal (not pure black for legibility)
 *
 * Sleep mode colors are always dark regardless of light/dark mode setting,
 * since sleep screens must be non-disruptive to circadian rhythm.
 */
export const lightColors: ThemeColors = {
    // Primary palette - Sage Green
    primary: '#8B9F82',
    primaryLight: '#A8B89F',
    primaryDark: '#6B7F65',
    
    // Secondary - Warm Terracotta
    secondary: '#C4A77D',
    secondaryLight: '#D4BFA0',
    secondaryDark: '#A68B5B',
    
    // Accent - Dusty Rose
    accent: '#D4A5A5',
    accentLight: '#E4C0C0',
    accentDark: '#B88888',
    
    // Background colors - Warm tones
    background: '#FAF8F5',
    surface: '#FFFEF9',
    surfaceElevated: '#FFFFFF',
    
    // Text colors - Warm charcoal
    text: '#3D3A38',
    textLight: '#8B8685',
    textMuted: '#A8A5A3',
    textOnPrimary: '#FFFFFF',
    textOnDark: '#F5F0E8',
    
    // Status colors - Muted versions
    success: '#7BA37B',
    warning: '#D4B896',
    error: '#C88B8B',
    info: '#8BA5B8',
    
    // Neutral colors - Warm grays
    gray: {
      50: '#FDFCFA',
      100: '#F5F3F0',
      200: '#EBE8E4',
      300: '#D9D5D0',
      400: '#B8B4AE',
      500: '#8B8685',
      600: '#5C5856',
      700: '#3D3A38',
      800: '#2A2826',
      900: '#1A1917',
    },
    
    // Special colors for meditation moods
  calm: '#B4C4B0',
  focus: '#8B9F82',
  relax: '#C4A77D',
  sleep: '#1A1D29',
  energy: '#D4C4A8',
    
  // Sleep mode colors (always dark)
    sleepBackground: '#1A1D29',
    sleepSurface: '#252A3A',
    sleepAccent: '#C9B896',
    sleepText: '#F5F0E8',
    sleepTextMuted: '#8B8A99',
};

/**
 * Dark mode color palette.
 *
 * Inverted from light mode while maintaining the warm aesthetic.
 * Backgrounds are deep warm tones (not pure black) for eye comfort during
 * extended meditation sessions. Primary/secondary colors are slightly
 * brighter to maintain contrast on dark backgrounds.
 */
export const darkColors: ThemeColors = {
  // Primary palette - Sage Green (slightly brighter for dark mode)
  primary: '#9DB094',
  primaryLight: '#B5C5AC',
  primaryDark: '#7A8E71',
  
  // Secondary - Warm Terracotta
  secondary: '#D4B78D',
  secondaryLight: '#E4CFB0',
  secondaryDark: '#B69B6B',
  
  // Accent - Dusty Rose
  accent: '#E4B5B5',
  accentLight: '#F4D0D0',
  accentDark: '#C89898',
  
  // Background colors - Deep warm tones
  background: '#1A1917',
  surface: '#252321',
  surfaceElevated: '#2F2C2A',
  
  // Text colors - Light warm tones
  text: '#F5F0E8',
  textLight: '#B8B4AE',
  textMuted: '#8B8685',
  textOnPrimary: '#1A1917',
  textOnDark: '#F5F0E8',
  
  // Status colors - Slightly brighter for dark mode
  success: '#8BB38B',
  warning: '#E4C8A6',
  error: '#D89B9B',
  info: '#9BB5C8',
  
  // Neutral colors - Inverted warm grays
  gray: {
    50: '#1A1917',
    100: '#252321',
    200: '#2F2C2A',
    300: '#3D3A38',
    400: '#5C5856',
    500: '#8B8685',
    600: '#A8A5A3',
    700: '#D9D5D0',
    800: '#EBE8E4',
    900: '#FDFCFA',
  },
  
  // Special colors for meditation moods (slightly brighter)
  calm: '#C4D4C0',
  focus: '#9DB094',
  relax: '#D4B78D',
  sleep: '#252A3A',
  energy: '#E4D4B8',
  
  // Sleep mode colors (same as light - always dark)
  sleepBackground: '#1A1D29',
  sleepSurface: '#252A3A',
  sleepAccent: '#C9B896',
  sleepText: '#F5F0E8',
  sleepTextMuted: '#8B8A99',
};

/**
 * Shared design tokens that apply to both light and dark themes.
 *
 * These are constants like spacing, border radii, typography, and font families
 * that don't change based on theme mode. Only colors vary between light/dark.
 */
const sharedTheme = {
  /**
   * Spacing scale: used for padding, margins, gaps throughout the app.
   * Follows a base-8 scale for consistent, predictable layouts.
   */
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  /**
   * Border radii: organic, rounded corners (not sharp rectangles).
   * 'full' (9999) is used for perfectly circular buttons/avatars.
   * Follows a base-of-4 progression for visual harmony.
   */
  borderRadius: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
    full: 9999,
  },
  
  /**
   * Font families: carefully chosen for meditation app aesthetic.
   *   - Fraunces: warm, editorial serif for headlines/display text
   *   - Lora: readable serif for body copy (intentional, not rushed)
   *   - DM Sans: friendly sans-serif for UI labels and buttons
   */
  fonts: {
    /**
     * Fraunces: Display font for hero text, headlines.
     * Warm and inviting, sets a meditative tone.
     */
    display: {
      regular: 'Fraunces-Regular',
      medium: 'Fraunces-Medium',
      semiBold: 'Fraunces-SemiBold',
      bold: 'Fraunces-Bold',
    },
    /**
     * Lora: Body font for content copy. Serif conveys intentionality
     * and thoughtfulness, ideal for meditation app messaging.
     */
    body: {
      regular: 'Lora-Regular',
      medium: 'Lora-Medium',
      semiBold: 'Lora-SemiBold',
      bold: 'Lora-Bold',
      italic: 'Lora-Italic',
    },
    /**
     * DM Sans: UI font for labels, buttons, navigation.
     * Modern sans-serif for clarity and scannability.
     */
    ui: {
      regular: 'DMSans-Regular',
      medium: 'DMSans-Medium',
      semiBold: 'DMSans-SemiBold',
      bold: 'DMSans-Bold',
    },
  },
  
  /**
   * Typography scale: predefined text styles for consistent sizing,
   * line height, and letter spacing throughout the app.
   * Follows a typographic hierarchy: display > h1 > h2 > h3 > body > label > caption
   */
  typography: {
    /**
     * Display: Largest, hero text. Only use for app title or major section headers.
     */
    display: {
      fontFamily: 'Fraunces-Bold',
      fontSize: 36,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
    h1: {
      fontFamily: 'Fraunces-SemiBold',
      fontSize: 28,
      lineHeight: 36,
      letterSpacing: -0.3,
    },
    h2: {
      fontFamily: 'Fraunces-SemiBold',
      fontSize: 24,
      lineHeight: 32,
      letterSpacing: -0.2,
    },
    h3: {
      fontFamily: 'DMSans-SemiBold',
      fontSize: 20,
      lineHeight: 28,
    },
    h4: {
      fontFamily: 'DMSans-SemiBold',
      fontSize: 17,
      lineHeight: 24,
    },
    body: {
      fontFamily: 'Lora-Regular',
      fontSize: 16,
      lineHeight: 24,
    },
    bodyMedium: {
      fontFamily: 'Lora-Medium',
      fontSize: 16,
      lineHeight: 24,
    },
    bodySmall: {
      fontFamily: 'DMSans-Regular',
      fontSize: 14,
      lineHeight: 20,
    },
    caption: {
      fontFamily: 'DMSans-Regular',
      fontSize: 12,
      lineHeight: 16,
    },
    label: {
      fontFamily: 'DMSans-Medium',
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.3,
    },
    /**
     * Quote/intention: Italic serif for inspirational quotes, affirmations.
     * The italic styling emphasizes the introspective nature.
     */
    quote: {
      fontFamily: 'Lora-Italic',
      fontSize: 18,
      lineHeight: 28,
    },
    /**
     * Button: Semibold sans-serif for interactive text.
     * Clear and actionable.
     */
    button: {
      fontFamily: 'DMSans-SemiBold',
      fontSize: 16,
      lineHeight: 24,
    },
  },
};
  
/**
 * Shadow definitions: depth cueing for elevation.
 *
 * Shadows are color-aware: darker in light mode, lighter in dark mode
 * for visual contrast. Used for cards (sm), modals (md), and overlays (lg).
 */
const createShadows = (isDark: boolean) => ({
    // Small shadow: cards, list items, subtle elevation
    sm: {
    shadowColor: isDark ? '#000000' : '#3D3A38',
      shadowOffset: {
        width: 0,
        height: 2,
      },
    shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 4,
      elevation: 1,
    },
    // Medium shadow: modals, floating action buttons
    md: {
    shadowColor: isDark ? '#000000' : '#3D3A38',
      shadowOffset: {
        width: 0,
        height: 4,
      },
    shadowOpacity: isDark ? 0.4 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    // Large shadow: full-screen overlays, maximum elevation
    lg: {
    shadowColor: isDark ? '#000000' : '#3D3A38',
      shadowOffset: {
        width: 0,
        height: 8,
      },
    shadowOpacity: isDark ? 0.5 : 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
    // Glow: subtle colored shadow using primary color (for focus states, badges)
    glow: {
    shadowColor: isDark ? '#9DB094' : '#8B9F82',
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 0,
    },
});
  
/**
 * Gradient definitions: color transitions for hero sections, backgrounds.
 *
 * Each gradient is a 2-color blend. Color-aware: inverts for dark mode.
 * Sleepy gradients (sleepyNight, dreamyPurple) are always dark for
 * circadian-friendly design.
 */
const createGradients = (isDark: boolean) => ({
  warmSunrise: isDark ? ['#252321', '#1A1917'] : ['#FAF8F5', '#F5EDE3'],
  sage: isDark ? ['#7A8E71', '#6B7F65'] : ['#A8B89F', '#8B9F82'],
  terracotta: isDark ? ['#B69B6B', '#A68B5B'] : ['#D4BFA0', '#C4A77D'],
  rose: isDark ? ['#C89898', '#B88888'] : ['#E4C0C0', '#D4A5A5'],
  sleepyNight: ['#1A1D29', '#252A3A'] as [string, string],
  dreamyPurple: ['#2A2D3E', '#1A1D29'] as [string, string],
  goldenHour: isDark ? ['#B69B6B', '#A68B5B'] : ['#D4C4A8', '#C4A77D'],
});

/**
 * Factory function to create a complete theme object.
 *
 * Combines color palette with shared tokens (spacing, typography, shadows).
 * Color-aware: shadows and gradients adjust based on isDark flag.
 *
 * @param colors - Color palette (lightColors or darkColors)
 * @param isDark - true for dark mode shadows/gradients, false for light mode
 * @returns Complete theme object with colors, typography, spacing, shadows, gradients
 */
export function createTheme(colors: ThemeColors, isDark: boolean) {
  return {
    colors,
    ...sharedTheme,
    shadows: createShadows(isDark),
    gradients: createGradients(isDark),
};
}

/**
 * Type: the complete theme object.
 *
 * This is what useTheme() returns. All color, typography, spacing,
 * shadow, and gradient tokens are available on this object.
 */
export type Theme = ReturnType<typeof createTheme>;

/**
 * Default light theme.
 *
 * Created once for backwards compatibility with code that doesn't use
 * ThemeContext (during migration). New code should use useTheme() hook.
 */
export const theme = createTheme(lightColors, false);

/**
 * Helper style object: consistent card/surface styling.
 *
 * Combines surface background color, rounded corners, padding, and shadow.
 * Use this for cards, modals, and elevated surfaces.
 */
export const cardStyle = {
  backgroundColor: theme.colors.surface,
  borderRadius: theme.borderRadius.xl,
  padding: theme.spacing.lg,
  ...theme.shadows.sm,
};

/**
 * Helper style object: sleep mode cards.
 *
 * Uses dark sleep colors (always dark, regardless of theme mode).
 * Applied to screens shown during wind-down to minimize blue light.
 */
export const sleepCardStyle = {
  backgroundColor: theme.colors.sleepSurface,
  borderRadius: theme.borderRadius.xl,
  padding: theme.spacing.lg,
};
