/**
 * ============================================================
 * routes.ts — Navigation route registry
 * ============================================================
 *
 * Architectural Role:
 *   Central source of truth for hardcoded route paths used by core
 *   navigation logic. Keeping them in one file prevents drift between
 *   the screens that own a route and the navigators that redirect to it.
 *
 * Convention:
 *   - Use ROUTE_ prefixed SCREAMING_SNAKE_CASE constants exported
 *     individually for refactor-safe imports.
 *   - Declare each as a `const` literal so the value is usable both as
 *     an expo-router `Href` and in `===` pathname comparisons.
 * ============================================================
 */

export const ROUTE_DOWNLOADS = '/downloads' as const;
export const ROUTE_HOME = '/(tabs)/home' as const;
