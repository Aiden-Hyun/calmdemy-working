import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { Alert } from "react-native";
import { useAuth } from "./AuthContext";
import {
  syncRevenueCatIdentity,
  resetRevenueCatIdentity,
  hasPremiumEntitlement,
  detectActiveSubscriptionOnAppleId,
  restorePurchasesWithRecovery,
  type CustomerInfo as ManagerCustomerInfo,
  type RestoreResult,
} from "../managers/AuthSubscriptionManager";

/**
 * ============================================================
 * SubscriptionContext.tsx — Subscription Provider (Provider Pattern + Lazy Loading + Observer)
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Provider pattern to manage RevenueCat subscription
 *   state and paywall integration across the entire app. It sits in "core/providers" —
 *   a cross-cutting concern that all feature modules depend on for premium access
 *   gating, restore flows, and purchase orchestration.
 *
 * Design Patterns:
 *   - Provider Pattern: Centralizes subscription state and exposes it via
 *     useSubscription() hook. All components consume premium status from here.
 *   - Lazy Loading: RevenueCat SDK is dynamically imported only when needed (the
 *     native module may not be available in web or test environments). This prevents
 *     crashes during initialization.
 *   - Observer Pattern: Subscribes to RevenueCat's customer info updates via
 *     addCustomerInfoUpdateListener(). When subscriptions change (e.g., purchase,
 *     cancellation), the listener fires and updates React state reactively.
 *   - Singleton: Purchases (the RevenueCat SDK reference) is loaded once and reused.
 *   - Admin Bypass: Certain hardcoded UIDs always get premium access without owning
 *     a subscription (used for testing and employee access).
 *   - Adapter: AuthSubscriptionManager acts as an Adapter, wrapping RevenueCat and
 *     Firebase operations so the context doesn't depend directly on either SDK.
 *   - Deduplication Guard: lastSyncedUid prevents redundant syncs when the user UID
 *     hasn't changed, avoiding wasteful network calls.
 *
 * Key Dependencies:
 *   - react-native-purchases (RevenueCat SDK, lazily imported)
 *   - AuthSubscriptionManager (wraps RevenueCat + Firebase Auth integration)
 *   - Firebase Auth (via AuthContext) for user identity
 *
 * Consumed By:
 *   Every screen and feature that checks isPremium, shows paywalls, or triggers
 *   purchases/restores via the useSubscription() and usePremiumAccess() hooks.
 * ============================================================
 */

// RevenueCat API Key (Apple/iOS)
const REVENUECAT_API_KEY = "appl_JhsFtEMqcEsdxXadtbKkjhXGoZT";

// Entitlement ID configured in RevenueCat dashboard
// IMPORTANT: Verify this matches the actual Entitlement Identifier in RevenueCat,
// not the display name (often something simple like "premium")
export const PREMIUM_ENTITLEMENT_ID = "Calmdemy Premium";

// Admin UIDs that always get premium access (no subscription required)
const ADMIN_UIDS = [
  "JYsGeh2x20Xpv9nkZxVLyh02PUQ2",
];

/**
 * Checks if a user UID belongs to the admin allowlist.
 *
 * This implements the Admin Bypass pattern — certain hardcoded UIDs (employees,
 * testers) receive premium access without owning a RevenueCat subscription. Used
 * for internal testing and developer access without polluting production purchase
 * data. In production, this should be replaced with a server-side entitlement check
 * (e.g., a Firestore field or custom claim) to avoid secrets in client code.
 *
 * @param uid - The Firebase Auth UID to check
 * @returns true if the UID is in ADMIN_UIDS, false otherwise
 */
function isAdminUser(uid: string | null | undefined): boolean {
  return !!uid && ADMIN_UIDS.includes(uid);
}

// Lazy load RevenueCat to prevent crash when native modules aren't available
let Purchases: any = null;
let LOG_LEVEL: any = null;

/**
 * Lazily loads the RevenueCat SDK (react-native-purchases).
 *
 * This implements Lazy Loading — the RevenueCat native module is only imported
 * at runtime, not bundled statically. This prevents crashes in environments where
 * native modules aren't available (e.g., web, Expo Go, test runners). On first
 * call, the dynamic import() executes and caches the module. Subsequent calls
 * short-circuit and return immediately.
 *
 * Why dynamic import? The Singleton pattern ensures Purchases is loaded once and
 * reused. The conditional check (if (Purchases) return true) guarantees idempotency.
 *
 * @returns true if RevenueCat loaded successfully, false if the native module is
 *          unavailable (graceful degradation — app continues in demo mode)
 */
async function loadRevenueCat() {
  if (Purchases) return true;
  try {
    // Dynamic import ensures the module is only loaded at runtime, not bundled
    const module = await import("react-native-purchases");
    Purchases = module.default;
    LOG_LEVEL = module.LOG_LEVEL;
    return true;
  } catch (error) {
    // Native module not available — app runs in demo mode (no paywall)
    console.warn("RevenueCat not available (native module not installed):", error);
    return false;
  }
}

// Type definitions (since we're dynamically importing)
interface PurchasesPackage {
  identifier: string;
  product: {
    price: number;
    priceString: string;
    title: string;
    description: string;
  };
}

interface CustomerInfo {
  entitlements: {
    active: Record<string, any>;
  };
  activeSubscriptions: string[];
  allExpirationDates: Record<string, string | null>;
  allPurchaseDates: Record<string, string | null>;
}

interface PurchasesOffering {
  identifier: string;
  monthly?: PurchasesPackage;
  annual?: PurchasesPackage;
  availablePackages: PurchasesPackage[];
}

interface RestorePurchasesResult {
  success: boolean;
  reason?: "no_subscription" | "different_account";
  showRecoveryWizard?: boolean;
}

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  isAvailable: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  restorePurchasesWithRecovery: () => Promise<RestorePurchasesResult>;
  checkSubscriptionStatus: () => Promise<void>;
  hasActiveSubscriptionOnAppleId: () => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastSyncedUid, setLastSyncedUid] = useState<string | null>(null);

  // --- INITIALIZATION PHASE: One-time RevenueCat SDK setup ---
  // Runs once on mount (empty dependency array). Loads the lazy RevenueCat module,
  // configures it with the API key, and fetches available offerings (products/packages).
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        // Load the RevenueCat SDK (Lazy Loading + Singleton pattern)
        const loaded = await loadRevenueCat();
        if (!loaded || !Purchases) {
          console.log("RevenueCat not available, running in demo mode");
          setIsLoading(false);
          return;
        }

        setIsAvailable(true);

        if (LOG_LEVEL) {
          // Use WARN level to reduce noise from expected configuration issues (simulator, pending review)
          Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.WARN : LOG_LEVEL.ERROR);
        }

        // Set custom log handler to filter expected configuration errors
        if (__DEV__ && Purchases.setLogHandler) {
          Purchases.setLogHandler((logLevel: any, message: string) => {
            // Filter out expected configuration errors (empty offerings, products pending review)
            const isExpectedConfigError =
              message.includes("why-are-offerings-empty") ||
              message.includes("None of the products registered") ||
              message.includes("configuration");

            if (isExpectedConfigError) {
              // Silently ignore expected configuration issues
              return;
            }

            // Log other messages normally
            if (logLevel === "ERROR") {
              console.error("[RevenueCat]", message);
            } else if (logLevel === "WARN") {
              console.warn("[RevenueCat]", message);
            } else {
              console.log("[RevenueCat]", message);
            }
          });
        }

        // Configure RevenueCat SDK with API key (required before any SDK calls)
        await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
        setIsInitialized(true);

        // Fetch offerings (paywall products configured in RevenueCat dashboard)
        await fetchOfferings();
      } catch (error: any) {
        console.error("Error initializing RevenueCat:", error);
        setIsLoading(false);
      }
    };

    initRevenueCat();
  }, []);

  // --- IDENTITY SYNC PHASE: Sync Firebase Auth UID with RevenueCat ---
  // Runs whenever isInitialized or user.uid changes. Links the logged-in user's
  // Firebase UID with RevenueCat so subscription purchases are tied to their identity.
  // Uses Deduplication Guard (lastSyncedUid) to skip redundant syncs.
  useEffect(() => {
    if (!isInitialized || !Purchases) return;

    const syncIdentity = async () => {
      const currentUid = user?.uid || null;

      // --- DEDUPLICATION GUARD ---
      // If the UID hasn't changed since the last sync, skip the sync entirely.
      // This prevents redundant network calls when the component re-renders for
      // unrelated reasons (e.g., customerInfo updates). A classic deduplication
      // pattern to optimize performance and reduce unnecessary state mutations.
      if (currentUid === lastSyncedUid) return;

      setIsLoading(true);

      try {
        if (currentUid) {
          // User is logged in — sync RevenueCat identity to this Firebase UID
          // via the AuthSubscriptionManager (Adapter pattern for Firebase + RevenueCat)
          const info = await syncRevenueCatIdentity(currentUid);
          if (info) {
            setCustomerInfo(info as CustomerInfo);
            const hasPremium =
              typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !==
              "undefined";
            // Admin Bypass: admins always get premium, even without a subscription
            setIsPremium(hasPremium || isAdminUser(currentUid));
          }
          setLastSyncedUid(currentUid);
        } else {
          // User logged out — reset RevenueCat to anonymous (clears subscriptions)
          await resetRevenueCatIdentity();
          setCustomerInfo(null);
          setIsPremium(false);
          setLastSyncedUid(null);
        }
      } catch (error) {
        console.error("Error syncing RevenueCat identity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    syncIdentity();
  }, [user?.uid, isInitialized, lastSyncedUid]);

  // --- OBSERVER PHASE: Listen for customer info updates from RevenueCat ---
  // Subscribes to RevenueCat's customerInfoUpdateListener stream. Whenever the user's
  // subscription changes (purchase, cancellation, renewal, etc.), RevenueCat fires this
  // listener. We update React state reactively (Observer pattern). Cleanup function
  // unsubscribes on unmount to prevent memory leaks.
  useEffect(() => {
    if (!isInitialized || !Purchases) return;

    const customerInfoListener = (info: CustomerInfo) => {
      setCustomerInfo(info);
      const hasPremium = typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
      // Admin Bypass: admins always show as premium in the UI
      setIsPremium(hasPremium || isAdminUser(user?.uid));
    };

    // Subscribe to the RevenueCat observable stream
    Purchases.addCustomerInfoUpdateListener(customerInfoListener);

    // Cleanup: unsubscribe on unmount to prevent memory leaks and stale callbacks
    return () => {
      Purchases.removeCustomerInfoUpdateListener(customerInfoListener);
    };
  }, [isInitialized]);

  const checkSubscriptionStatusInternal = async () => {
    if (!Purchases) {
      setIsLoading(false);
      return;
    }
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      const hasPremium = typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
      setIsPremium(hasPremium || isAdminUser(user?.uid));
    } catch (error) {
      console.error("Error checking subscription status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSubscriptionStatus = useCallback(async () => {
    await checkSubscriptionStatusInternal();
  }, []);

  const fetchOfferings = async () => {
    if (!Purchases) return;
    try {
      const offerings = await Purchases.getOfferings();
      
      // Debug logging to help diagnose offering issues
      console.log("[RevenueCat] Offerings response:", {
        hasOfferings: !!offerings,
        hasCurrent: !!offerings?.current,
        currentIdentifier: offerings?.current?.identifier,
        availablePackagesCount: offerings?.current?.availablePackages?.length || 0,
        packageIdentifiers: offerings?.current?.availablePackages?.map((p: any) => p.identifier) || [],
        allOfferingIds: Object.keys(offerings?.all || {}),
      });
      
      if (offerings.current) {
        setCurrentOffering(offerings.current);
      } else if (offerings.all && Object.keys(offerings.all).length > 0) {
        // If no "current" offering but other offerings exist, use the first one
        const firstOfferingKey = Object.keys(offerings.all)[0];
        console.log("[RevenueCat] No current offering set, using first available:", firstOfferingKey);
        setCurrentOffering(offerings.all[firstOfferingKey]);
      } else {
        console.log("[RevenueCat] No offerings available. Check RevenueCat dashboard: ensure products are added to an offering and the offering is set as 'Current'.");
      }
    } catch (error: any) {
      console.log("[RevenueCat] Error fetching offerings:", error.message, error.code);
    }
  };

  /**
   * Initiates a purchase flow for a specific package (plan).
   *
   * Calls RevenueCat's purchasePackage(), which displays the native iOS App Store
   * purchase dialog. Returns the new CustomerInfo on success. If the user already
   * has an active subscription, this may be a renewal, upgrade, or downgrade.
   *
   * Error Handling: Ignores user cancellations (userCancelled = true) to avoid
   * spamming alerts. Other errors (network, validation) are shown to the user.
   *
   * @param pkg - The PurchasesPackage to purchase (e.g., monthly or annual plan)
   * @returns true if the purchase succeeded and the user is now premium, false otherwise
   */
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    if (!Purchases) {
      Alert.alert("Not Available", "In-app purchases are not available yet. Please rebuild the app.");
      return false;
    }
    try {
      setIsLoading(true);
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(newInfo);
      const hasPremium = typeof newInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
      setIsPremium(hasPremium || isAdminUser(user?.uid));
      return hasPremium || isAdminUser(user?.uid);
    } catch (error: any) {
      // Suppress alert for user cancellations (not an error from the app's perspective)
      if (!error.userCancelled) {
        console.error("Error purchasing package:", error);
        Alert.alert(
          "Purchase Failed",
          error.message || "There was an error processing your purchase. Please try again."
        );
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restores purchases with basic alert feedback.
   *
   * Calls RevenueCat's restorePurchases() to look for subscriptions owned by the
   * current Apple ID in App Store servers (works across devices). Shows success or
   * failure alerts to the user. Use this for straightforward "Restore Purchases"
   * button flows in settings.
   *
   * Difference from restorePurchasesWithRecoveryFlow: This is simpler and shows
   * alerts. The recovery variant returns structured results and can detect when
   * a subscription exists on a different Apple ID, triggering recovery logic.
   *
   * @returns true if a subscription was found and restored, false otherwise
   */
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!Purchases) {
      Alert.alert(
        "Not Available",
        "In-app purchases are not available yet. Please rebuild the app."
      );
      return false;
    }
    try {
      setIsLoading(true);
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);
      const hasPremium =
        typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !== "undefined";
      setIsPremium(hasPremium || isAdminUser(user?.uid));

      if (hasPremium) {
        Alert.alert("Success", "Your purchases have been restored!");
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore."
        );
      }

      return hasPremium;
    } catch (error: any) {
      console.error("Error restoring purchases:", error);
      Alert.alert(
        "Restore Failed",
        error.message ||
          "There was an error restoring your purchases. Please try again."
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restores purchases with recovery detection and structured result.
   *
   * Unlike restorePurchases(), this delegates to AuthSubscriptionManager.
   * restorePurchasesWithRecovery(), which can detect when a subscription exists
   * on a *different* Apple ID than the current login. Returns a structured result
   * (not alerts) with showRecoveryWizard = true to signal that account recovery
   * UI should be displayed.
   *
   * Difference from restorePurchases: This returns structured data (success,
   * reason, showRecoveryWizard) instead of showing alerts. Use this when you need
   * to programmatically handle recovery flows — e.g., guide the user through
   * signing into the correct Apple ID to claim the subscription.
   *
   * Recovery Flow Pattern: When a user has a subscription on Apple ID "alice@example.com"
   * but is logged into the app with "bob@example.com", the recovery wizard helps
   * them either: (1) sign in to the correct Apple ID, or (2) transfer the subscription
   * to their current login.
   *
   * @returns structured result: { success, reason, showRecoveryWizard }
   */
  const restorePurchasesWithRecoveryFlow =
    useCallback(async (): Promise<RestorePurchasesResult> => {
      if (!Purchases) {
        return { success: false, reason: "no_subscription" };
      }

      try {
        setIsLoading(true);
        // Delegate to the Adapter (AuthSubscriptionManager) for smart recovery logic
        const result = await restorePurchasesWithRecovery();

        if (result.customerInfo) {
          setCustomerInfo(result.customerInfo as CustomerInfo);
          const hasPremium = hasPremiumEntitlement(
            result.customerInfo as ManagerCustomerInfo
          );
          setIsPremium(hasPremium || isAdminUser(user?.uid));
        }

        return {
          success: result.success,
          reason: result.reason,
          showRecoveryWizard: result.showRecoveryWizard,
        };
      } catch (error: any) {
        console.error("Error restoring purchases with recovery:", error);
        return { success: false, reason: "no_subscription" };
      } finally {
        setIsLoading(false);
      }
    }, []);

  /**
   * Checks if there's an active subscription on the device's Apple ID that the
   * current logged-in user may not own.
   *
   * This detects the "subscription mismatch" scenario — e.g., the device has a
   * subscription from "alice@example.com" (in App Store settings), but the app
   * user is "bob@example.com" (in Firebase Auth). Used by the recovery wizard
   * to determine whether to offer account-switching or transfer flows.
   *
   * Implemented via the Adapter pattern (detectActiveSubscriptionOnAppleId in
   * AuthSubscriptionManager) to abstract RevenueCat logic.
   *
   * @returns true if the device has an active subscription on a different Apple ID
   */
  const hasActiveSubscriptionOnAppleId = useCallback((): boolean => {
    if (!customerInfo) return false;
    return detectActiveSubscriptionOnAppleId(
      customerInfo as ManagerCustomerInfo
    );
  }, [customerInfo]);

  // --- FACADE PATTERN ---
  // Assemble the context value object. The Facade pattern presents a simplified,
  // cohesive interface to the component tree. Consumers don't interact with
  // individual state variables or RevenueCat directly; they access this unified API.
  // Each property is either state (isPremium, isLoading, etc.) or a useCallback-wrapped
  // action (purchasePackage, restorePurchases, etc.) that handles side effects.
  const value = {
    isPremium,
    isLoading,
    isAvailable,
    customerInfo,
    currentOffering,
    purchasePackage,
    restorePurchases,
    restorePurchasesWithRecovery: restorePurchasesWithRecoveryFlow,
    checkSubscriptionStatus,
    hasActiveSubscriptionOnAppleId,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access the subscription context.
 *
 * Standard React Context consumer hook. Throws if used outside SubscriptionProvider,
 * which indicates a component tree structure error. All components needing subscription
 * state call this hook to access the Facade pattern interface.
 *
 * @throws Error if called outside SubscriptionProvider
 * @returns SubscriptionContextType with all subscription state and actions
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}

/**
 * Derived hook to check if user can access premium content.
 *
 * Computes premium access eligibility based on content type and user subscription.
 * Provides a convenient bundle: canAccess (boolean check), isPremium (subscription
 * status), isLoading (SDK initialization), and showPaywall (computed convenience
 * boolean for conditional paywall rendering).
 *
 * Example:
 *   const { canAccess, showPaywall } = usePremiumAccess(meditation.isPremium);
 *   if (showPaywall) return <PaywallScreen />;
 *   return <Content />;
 *
 * @param isPremiumContent - true if the content requires premium access, false if free
 * @returns object with { canAccess, isPremium, isLoading, showPaywall }
 */
export function usePremiumAccess(isPremiumContent: boolean = false) {
  const { isPremium, isLoading } = useSubscription();

  return {
    canAccess: !isPremiumContent || isPremium,
    isPremium,
    isLoading,
    showPaywall: isPremiumContent && !isPremium && !isLoading,
  };
}

// Re-export types for use in other files
export type {
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
  RestorePurchasesResult,
};
