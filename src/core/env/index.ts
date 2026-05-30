/**
 * ============================================================
 * env.ts — Environment variable accessors
 * ============================================================
 *
 * Architectural Role:
 *   Centralizes how the app reads EXPO_PUBLIC_* environment variables.
 *   In Expo, `process.env.EXPO_PUBLIC_*` is replaced at bundle time with
 *   the value from `.env`. This file gives every read a typed, validated
 *   entry point so missing config fails fast with a clear error rather
 *   than crashing deep in third-party SDKs.
 *
 * Why two helpers:
 *   - `requireEnv(name)` — throws if missing. Use for values the app
 *     cannot function without (Firebase config, OAuth client IDs).
 *   - `getEnv(name, fallback?)` — returns undefined/fallback if missing.
 *     Use for optional values (feature flags, admin allowlist).
 *
 * Note:
 *   EXPO_PUBLIC_* vars are bundled into the client. Do not put real
 *   server secrets here. These are public client identifiers protected
 *   by server-side rules (Firestore security rules, RevenueCat dashboard).
 * ============================================================
 */

/**
 * Read a required environment variable. Throws if it is missing or empty.
 *
 * @param name - Variable name (must start with EXPO_PUBLIC_ for client bundling)
 * @returns The variable value
 * @throws Error with a helpful message if the variable is not set
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env and fill in the value.`
    );
  }
  return value;
}

/**
 * Read an optional environment variable.
 *
 * @param name - Variable name
 * @param fallback - Value to return if the variable is missing or empty
 * @returns The variable value or the fallback
 */
export function getEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

/**
 * Read a comma-separated environment variable as a string array.
 * Trims whitespace and filters out empty entries.
 *
 * @param name - Variable name
 * @returns Array of trimmed non-empty values
 */
export function getEnvList(name: string): string[] {
  return getEnv(name)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
