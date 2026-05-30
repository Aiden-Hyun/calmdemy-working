/**
 * ============================================================
 * storageKeys.ts — AsyncStorage key registry
 * ============================================================
 *
 * Architectural Role:
 *   Central source of truth for every AsyncStorage key used by the app.
 *   Keeping them in one file prevents drift between writer and reader
 *   (e.g., ThemeContext writes `@calmdemy_theme_mode` while AuthContext
 *   would previously look for `@theme_mode` in the delete-account preserve
 *   list — those values must agree).
 *
 * Convention:
 *   - Prefix every key with `@calmdemy_` so they cluster under one
 *     namespace in storage inspectors.
 *   - Use SCREAMING_SNAKE_CASE constants exported individually for
 *     refactor-safe imports.
 * ============================================================
 */

export const ONBOARDING_KEY = '@calmdemy_onboarding';
export const THEME_MODE_KEY = '@calmdemy_theme_mode';
