/**
 * ============================================================
 * AuthSubscriptionManager.ts — Firebase Auth ↔ RevenueCat Adapter
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Adapter pattern to bridge Firebase Auth (identity)
 *   with RevenueCat (subscription management). It ensures that whenever a user's
 *   Firebase UID changes (login, logout, account switch), the RevenueCat SDK is
 *   updated to reflect the same user identity. Without this bridge, subscriptions
 *   would be bound to the device, not the user account — meaning a user could not
 *   restore their subscription on a new device.
 *
 * Design Patterns:
 *   - Adapter: Translates between Firebase Auth's user model (UID, logout events)
 *     and RevenueCat's customer model (logIn/logOut calls). Neither system knows
 *     about the other; this module is the glue.
 *   - Lazy Loading: RevenueCat is dynamically imported (loadRevenueCat) only when
 *     needed, reducing initial bundle size and handling environments where the module
 *     may not be available.
 *   - Identity Mapping: The Firebase UID is the single canonical user identity
 *     across the entire system. RevenueCat customer ID is always synced to match.
 *   - Observer Pattern: createAuthSubscriptionListener subscribes to Firebase's
 *     onAuthStateChanged stream and reactively syncs RevenueCat whenever that state changes.
 *   - Recovery Flow: restorePurchasesWithRecovery handles the complex case where
 *     an Apple ID has an active subscription, but it belongs to a different Firebase
 *     account. This flow detects that situation and offers the user a recovery wizard.
 *   - Graceful Degradation: All functions return null or false if RevenueCat is
 *     unavailable (e.g., on web), allowing the app to remain functional without
 *     subscription features.
 *
 * Key Responsibilities:
 *   1. Synchronize Firebase UID with RevenueCat customer ID on login
 *   2. Reset RevenueCat identity (logout) when user logs out of Firebase
 *   3. Detect when an active subscription on Apple ID doesn't belong to current account
 *   4. Provide entitlement checks for subscription-gated features
 *   5. Create a reactive listener that keeps Firebase and RevenueCat in sync
 *
 * Key Dependencies:
 *   - firebase/auth: Provides onAuthStateChanged stream and user object
 *   - react-native-purchases (RevenueCat): Subscription SDK (lazily loaded)
 *
 * Consumed By:
 *   - Core auth providers and context hooks (typically useAuth)
 *   - Feature screens that need to check if user has premium entitlement
 *   - Account settings screens for premium/subscription management
 * ============================================================
 */

import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

/**
 * Entitlement ID configured in RevenueCat dashboard.
 *
 * IMPORTANT: This must match the exact Entitlement Identifier in the RevenueCat
 * console (in the Products section), NOT the product display name. For example,
 * the display name might be "Calmdemy Premium" but the identifier could be
 * "premium_monthly" or "premium". Mismatches will cause hasPremiumEntitlement()
 * to always return false.
 */
export const PREMIUM_ENTITLEMENT_ID = "Calmdemy Premium";

/**
 * Lazy-loaded RevenueCat SDK module.
 *
 * RevenueCat is only available on React Native (iOS/Android), not on web.
 * Rather than fail at startup if the module can't be imported, we defer the import
 * until the first time it's needed (lazy loading). This allows the app to boot on
 * unsupported platforms (e.g., web) without crashing.
 */
let Purchases: any = null;

/**
 * Dynamically import the RevenueCat SDK if not already loaded.
 *
 * This implements Lazy Loading: the expensive import only happens once, the first
 * time any subscription operation is attempted. On subsequent calls, the cached
 * Purchases module is reused. If the import fails (e.g., on web), a warning is logged
 * and the function returns false, triggering Graceful Degradation in calling functions.
 *
 * @returns true if the module was successfully loaded (or was already loaded), false otherwise
 */
async function loadRevenueCat(): Promise<boolean> {
  if (Purchases) return true;
  try {
    const module = await import("react-native-purchases");
    Purchases = module.default;
    return true;
  } catch (error) {
    console.warn("[AuthSubscriptionManager] RevenueCat not available:", error);
    return false;
  }
}

/**
 * RevenueCat customer subscription information.
 *
 * This is a subset of the full RevenueCat CustomerInfo object, containing only
 * the fields relevant to Calmdemy's subscription logic. See RevenueCat docs for
 * the complete structure.
 *
 * Properties:
 *   - entitlements.active: Key-value map of entitlements currently active for this user.
 *     Keys are entitlement IDs (e.g., "Calmdemy Premium"). If the user has the premium
 *     entitlement, PREMIUM_ENTITLEMENT_ID will exist as a key with a non-undefined value.
 *   - activeSubscriptions: Product IDs that are currently active (non-expired, non-cancelled).
 *     Most reliable signal for detecting an active subscription.
 *   - allExpirationDates: Map of product IDs to expiration dates. Used as a fallback
 *     to check if any subscription was non-expired (by comparing to current time).
 *   - allPurchaseDates: Map of product IDs to purchase dates. Intentionally not used
 *     for active-subscription detection because a date in this map does not guarantee
 *     the subscription is still active (could be expired or cancelled).
 */
export interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
  activeSubscriptions: string[];
  allExpirationDates: Record<string, string | null>;
  allPurchaseDates: Record<string, string | null>;
}

/**
 * Result of a purchase restoration attempt, indicating success and next steps.
 *
 * Properties:
 *   - success: true if the current account has an active premium entitlement after restoration
 *   - reason: Why restoration failed ("no_subscription" = no active sub on Apple ID,
 *     "different_account" = sub exists but belongs to different Firebase account)
 *   - showRecoveryWizard: true if the app should show a recovery flow (present when
 *     a subscription exists on the Apple ID but belongs to a different Firebase account)
 *   - customerInfo: The RevenueCat customer info after restoration (present on success
 *     or when a different_account scenario is detected)
 */
export interface RestoreResult {
  success: boolean;
  reason?: "no_subscription" | "different_account";
  showRecoveryWizard?: boolean;
  customerInfo?: CustomerInfo;
}

/**
 * Synchronize RevenueCat's customer ID with the Firebase UID (Identity Mapping).
 *
 * When a user logs into Firebase with a new UID, RevenueCat must be told to
 * associate that UID with the customer identity. This ensures:
 * 1. Entitlements are fetched for the correct user account
 * 2. Subscriptions purchased on other devices (same Firebase account) are recognized
 * 3. The current device reflects the user's subscription state
 *
 * The Adapter pattern is visible here: Purchases.logIn() is a low-level RevenueCat
 * call that knows nothing about Firebase; this function bridges the two systems.
 *
 * Call this immediately after Firebase login, before checking entitlements.
 *
 * @param firebaseUid - The Firebase authentication UID (canonical user identity)
 * @returns CustomerInfo if sync was successful, null otherwise (Graceful Degradation)
 */
export async function syncRevenueCatIdentity(
  firebaseUid: string
): Promise<CustomerInfo | null> {
  const loaded = await loadRevenueCat();
  if (!loaded || !Purchases) {
    console.log("[AuthSubscriptionManager] RevenueCat not available for sync");
    return null;
  }

  try {
    // --- Adapter: translate Firebase UID to RevenueCat logIn call ---
    const { customerInfo } = await Purchases.logIn(firebaseUid);
    console.log(
      "[AuthSubscriptionManager] Synced RevenueCat identity for UID:",
      firebaseUid
    );
    return customerInfo;
  } catch (error) {
    console.error("[AuthSubscriptionManager] Error syncing RevenueCat:", error);
    return null;
  }
}

/**
 * Reset RevenueCat identity to anonymous mode (logout equivalent).
 *
 * When a Firebase user logs out, we must also log them out of RevenueCat to ensure
 * that subscription entitlements are no longer linked to their account. Without this,
 * a previous user's subscriptions might bleed through to the next user who logs in
 * on the same device.
 *
 * Call this when Firebase.logOut() completes (typically in the auth context provider).
 *
 * Uses Graceful Degradation: if RevenueCat is unavailable, silently returns without
 * error — the logout still completes successfully, just without the RevenueCat sync.
 */
export async function resetRevenueCatIdentity(): Promise<void> {
  const loaded = await loadRevenueCat();
  if (!loaded || !Purchases) return;

  try {
    await Purchases.logOut();
    console.log("[AuthSubscriptionManager] Reset RevenueCat identity");
  } catch (error) {
    console.error(
      "[AuthSubscriptionManager] Error resetting RevenueCat:",
      error
    );
  }
}

/**
 * Orchestrate the complete Firebase ↔ RevenueCat sync when auth state changes.
 *
 * This is the high-level entry point for auth state transitions. It delegates to
 * either syncRevenueCatIdentity (user logged in) or resetRevenueCatIdentity (user
 * logged out), ensuring that Firebase and RevenueCat stay in sync.
 *
 * Typically called from onAuthStateChanged in a context provider, passing the
 * newly updated user (or null if logged out).
 *
 * @param user - The Firebase User object after auth state change, or null if logged out
 * @returns CustomerInfo if user is logged in and RevenueCat sync succeeds, null otherwise
 */
export async function handleAuthStateChange(
  user: User | null
): Promise<CustomerInfo | null> {
  if (!user) {
    // --- Logout: reset RevenueCat to anonymous state ---
    await resetRevenueCatIdentity();
    return null;
  }
  // --- Login: sync the new user's UID with RevenueCat ---
  return syncRevenueCatIdentity(user.uid);
}

/**
 * Check if the user currently holds the premium entitlement.
 *
 * This is a simple boolean check: if the PREMIUM_ENTITLEMENT_ID key exists in the
 * entitlements.active map (and is defined), the user has premium access. This is
 * the standard Entitlement Verification pattern in RevenueCat.
 *
 * @param customerInfo - The RevenueCat CustomerInfo returned from a sync or restore
 * @returns true if the user has an active premium entitlement, false otherwise
 */
export function hasPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return (
    typeof customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !==
    "undefined"
  );
}

/**
 * Detect whether an active subscription exists on the Apple ID, regardless of
 * which Firebase account owns it.
 *
 * This is critical for the Recovery Flow: if a user tries to restore purchases
 * and we detect an active subscription that the current Firebase account doesn't
 * own, we need to show them a recovery wizard (offering to sign out and re-sign
 * with the account that owns the subscription).
 *
 * The detection uses multiple signals with a priority order (most to least reliable):
 * 1. activeSubscriptions: Product IDs currently active (best signal)
 * 2. Any active entitlements (covers edge cases where activeSubscriptions is stale)
 * 3. Expiration dates with future expiry (fallback for unusual RevenueCat states)
 *
 * Note: We deliberately do NOT use allPurchaseDates alone, because that map
 * includes expired and cancelled subscriptions — not a reliable indicator of
 * current active status.
 *
 * @param customerInfo - The RevenueCat CustomerInfo after a restore attempt
 * @returns true if any active subscription is detected on the Apple ID
 */
export function detectActiveSubscriptionOnAppleId(
  customerInfo: CustomerInfo
): boolean {
  // --- Signal 1: activeSubscriptions (most reliable) ---
  // RevenueCat's activeSubscriptions array contains product IDs that are currently
  // active (not cancelled, not expired). If this array is non-empty, the Apple ID
  // definitely has an active subscription.
  if (
    customerInfo.activeSubscriptions &&
    customerInfo.activeSubscriptions.length > 0
  ) {
    return true;
  }

  // --- Signal 2: Any active entitlements (covers RevenueCat edge cases) ---
  // Sometimes activeSubscriptions may be empty but entitlements.active is populated.
  // This is an edge case, but we check it as a secondary signal.
  const anyActiveEntitlement =
    Object.keys(customerInfo.entitlements?.active || {}).length > 0;
  if (anyActiveEntitlement) {
    return true;
  }

  // --- Signal 3: Non-expired subscription expiration dates (fallback) ---
  // Iterate through all expiration dates. If any date is in the future,
  // the associated subscription is still active (has not yet reached expiry).
  const now = new Date();
  const expirationDates = customerInfo.allExpirationDates || {};
  for (const [, expirationDate] of Object.entries(expirationDates)) {
    if (expirationDate && new Date(expirationDate) > now) {
      return true;
    }
  }

  // --- No signals detected: no active subscription ---
  return false;
}

/**
 * Fetch the current user's customer information from RevenueCat.
 *
 * This is a simple query function (no state change). Call this after a successful
 * syncRevenueCatIdentity() to fetch the user's current entitlements and subscription state.
 *
 * Returns null if RevenueCat is unavailable (Graceful Degradation), allowing the
 * app to function without subscription features on platforms where RevenueCat
 * is not available (e.g., web).
 *
 * @returns CustomerInfo with current entitlements and subscriptions, or null on error
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  const loaded = await loadRevenueCat();
  if (!loaded || !Purchases) return null;

  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error(
      "[AuthSubscriptionManager] Error getting customer info:",
      error
    );
    return null;
  }
}

/**
 * Restore purchases from the App Store and determine the outcome.
 *
 * This function handles the complex case where an active subscription exists on the
 * Apple ID but was purchased under a different Firebase account. It returns a
 * detailed RestoreResult that tells the UI whether to show the user:
 * - Success screen (subscription restored to current account)
 * - Recovery wizard (subscription exists, but is owned by a different account)
 * - "No subscription found" message
 *
 * This implements the Recovery Flow pattern: when restoration succeeds but reveals
 * that the Apple ID's subscription doesn't belong to the current Firebase account,
 * we prompt the user with options (e.g., "Sign in with the account that owns this
 * subscription" or "Use a different Apple ID").
 *
 * @returns RestoreResult with success flag, reason (if failed), and optional recovery wizard prompt
 */
export async function restorePurchasesWithRecovery(): Promise<RestoreResult> {
  const loaded = await loadRevenueCat();
  if (!loaded || !Purchases) {
    return { success: false, reason: "no_subscription" };
  }

  try {
    // --- Phase 1: Call RevenueCat restore ---
    const customerInfo = await Purchases.restorePurchases();

    // --- Phase 2: Check if current account now has the premium entitlement ---
    // This is the happy path: the subscription either belonged to the current
    // account all along, or the restore successfully linked it.
    const hasEntitlement = hasPremiumEntitlement(customerInfo);
    if (hasEntitlement) {
      return { success: true, customerInfo };
    }

    // --- Phase 3: Check if Apple ID has an active subscription owned by a different account ---
    // If the current account doesn't have premium, but the Apple ID does have an active
    // subscription, it means that subscription belongs to a different Firebase account.
    // We detect this and signal that a recovery wizard should be shown.
    const hasActiveOnAppleId = detectActiveSubscriptionOnAppleId(customerInfo);
    if (hasActiveOnAppleId) {
      return {
        success: false,
        reason: "different_account",
        showRecoveryWizard: true,
        customerInfo,
      };
    }

    // --- Phase 4: No active subscription on Apple ID ---
    return { success: false, reason: "no_subscription", customerInfo };
  } catch (error) {
    console.error("[AuthSubscriptionManager] Error restoring purchases:", error);
    return { success: false, reason: "no_subscription" };
  }
}

/**
 * Create a reactive listener that keeps Firebase Auth and RevenueCat in sync.
 *
 * This implements the Observer pattern: it subscribes to Firebase's
 * onAuthStateChanged stream and reactively calls handleAuthStateChange whenever
 * the auth state changes. The optional callback allows consumers to react to
 * updates (e.g., updating a context provider when customer info is fetched).
 *
 * Typical usage in an auth context provider:
 * ```
 * useEffect(() => {
 *   const unsubscribe = createAuthSubscriptionListener((customerInfo) => {
 *     setCustomerInfo(customerInfo);
 *   });
 *   return unsubscribe;
 * }, []);
 * ```
 *
 * The returned unsubscribe function should be called in a useEffect cleanup
 * to remove the listener and prevent memory leaks.
 *
 * @param onCustomerInfoUpdate - Optional callback invoked with CustomerInfo after each auth state change
 * @returns An unsubscribe function to clean up the listener
 */
export function createAuthSubscriptionListener(
  onCustomerInfoUpdate?: (customerInfo: CustomerInfo | null) => void
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    const customerInfo = await handleAuthStateChange(user);
    onCustomerInfoUpdate?.(customerInfo);
  });
}
