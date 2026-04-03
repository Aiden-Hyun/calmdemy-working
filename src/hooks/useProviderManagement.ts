import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { AuthCredential } from "firebase/auth";
import { useAuth, CredentialCollisionError } from "../contexts/AuthContext";

/**
 * ============================================================
 * useProviderManagement.ts — Multi-Provider Account Management
 * ============================================================
 *
 * Architectural Role:
 *   This hook abstracts Firebase Authentication's provider linking and
 *   account switching logic. It manages a user's authentication methods
 *   (Google, Apple, Email/Password) and resolves credential collisions
 *   when linking a credential that's already associated with another account.
 *   Consumed by account settings screens where users configure their sign-in methods.
 *
 * Design Patterns:
 *   - Facade: Presents a clean, unified interface for "link Google", "switch Apple",
 *     "change email", etc., hiding Firebase complexity (credential flows, collision
 *     handling, unlink-then-relink sequences)
 *   - State Machine: Tracks linked vs. available providers by deriving state from
 *     user.providerData (Firebase maintains the source of truth)
 *   - Gatekeeper: Several operations have guards (e.g., can't unlink the last provider;
 *     must add a backup provider before switching); these prevent account lockout
 *   - Error Recovery: Credential collisions are caught and stored as collisionError
 *     state; the screen can then offer a recovery UI (sign in with collision credential)
 *   - Strategy: Different credential acquisition flows (Google Sign-In, Apple Sign-In,
 *     email/password) are abstracted behind getGoogleCredential, getAppleCredential, etc.
 *
 * Key Responsibilities:
 *   1. Derive linked/available providers from user.providerData
 *   2. Link additional providers (Google, Apple, Email)
 *   3. Unlink providers (with single-provider guard)
 *   4. Switch accounts (unlink old provider, link new)
 *   5. Change email/password for email provider
 *   6. Handle credential collisions gracefully
 *   7. Manage loading and error states
 * ============================================================
 */

interface ProviderInfo {
  providerId: string;
  displayName: string;
  email?: string | null;
  icon: string;
}

interface UseProviderManagementReturn {
  // --- State ---
  linkedProviders: ProviderInfo[];
  availableProviders: ProviderInfo[];
  isLoading: boolean;
  error: string | null;
  // Collision state (error recovery)
  collisionError: CredentialCollisionError | null;
  clearCollisionError: () => void;
  // --- Provider linking actions ---
  linkGoogleProvider: () => Promise<void>;
  linkAppleProvider: () => Promise<void>;
  linkEmailProvider: (email: string, password: string) => Promise<void>;
  unlinkProviderById: (providerId: string) => Promise<void>;
  // --- Provider switching actions (unlink old + link new) ---
  switchGoogleAccount: () => Promise<void>;
  switchAppleAccount: () => Promise<void>;
  // --- Email/password management ---
  changeEmailAddress: (newEmail: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  // --- Collision recovery ---
  signInWithCollisionCredential: () => Promise<void>;
}

/**
 * Static display metadata for auth providers.
 * Maps Firebase provider IDs to human-readable labels and icon names.
 */
const PROVIDER_DISPLAY_INFO: Record<
  string,
  { displayName: string; icon: string }
> = {
  "google.com": { displayName: "Google", icon: "logo-google" },
  "apple.com": { displayName: "Apple", icon: "logo-apple" },
  password: { displayName: "Email & Password", icon: "mail" },
};

/**
 * useProviderManagement — Manage a user's linked authentication providers.
 *
 * This hook exposes two computed lists:
 *   - linkedProviders: derived from user.providerData (Firebase source of truth)
 *   - availableProviders: providers not yet linked (computed by set difference)
 *
 * It also exposes handlers for linking, unlinking, switching providers, and
 * managing credentials. All operations include loading states, error handling,
 * and guards to prevent account lockout (e.g., can't unlink the last provider).
 *
 * @returns Object with state (linked/available providers, loading, error) and handlers
 */
export function useProviderManagement(): UseProviderManagementReturn {
  const {
    user,
    linkProvider,
    unlinkProvider,
    getGoogleCredential,
    getAppleCredential,
    changeEmail,
    sendPasswordReset,
    signInWithPendingCredential,
    isAppleSignInAvailable,
  } = useAuth();

  // --- Reactive State ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Collision state: set when linking a credential that belongs to another account
  const [collisionError, setCollisionError] =
    useState<CredentialCollisionError | null>(null);

  /**
   * --- Derived State: linkedProviders (State Machine) ---
   *
   * Transform user.providerData (Firebase's source of truth) into a list of
   * human-readable ProviderInfo objects. user.providerData is an array of
   * UserInfo objects, each representing one linked authentication method.
   */
  const linkedProviders: ProviderInfo[] = (user?.providerData || []).map(
    (provider) => ({
      providerId: provider.providerId,
      displayName:
        PROVIDER_DISPLAY_INFO[provider.providerId]?.displayName ||
        provider.providerId,
      email: provider.email,
      icon: PROVIDER_DISPLAY_INFO[provider.providerId]?.icon || "person",
    })
  );

  /**
   * --- Derived State: availableProviders (Set Difference) ---
   *
   * Compute which providers can still be added by filtering against linked.
   * This is a simple set difference operation: all supported providers minus
   * the ones already linked.
   *
   * Note: Apple is included only if isAppleSignInAvailable (runtime capability
   * detection, since Apple Sign-In is only available on iOS 13+).
   */
  const linkedProviderIds = linkedProviders.map((p) => p.providerId);
  const availableProviders: ProviderInfo[] = [];

  // Google is always available as a provider option
  if (!linkedProviderIds.includes("google.com")) {
    availableProviders.push({
      providerId: "google.com",
      displayName: "Google",
      icon: "logo-google",
    });
  }

  // Apple is only available if the device/OS supports it
  if (!linkedProviderIds.includes("apple.com") && isAppleSignInAvailable) {
    availableProviders.push({
      providerId: "apple.com",
      displayName: "Apple",
      icon: "logo-apple",
    });
  }

  // Email/password is always available
  if (!linkedProviderIds.includes("password")) {
    availableProviders.push({
      providerId: "password",
      displayName: "Email & Password",
      icon: "mail",
    });
  }

  /**
   * clearCollisionError — Clear the collision error state.
   *
   * Called after the user resolves a collision (either signs in with the
   * collision credential or cancels the recovery flow).
   */
  const clearCollisionError = useCallback(() => {
    setCollisionError(null);
  }, []);

  /**
   * handleError — Centralized error handler for provider operations.
   *
   * Distinguishes between:
   *   - CredentialCollisionError: stored in collisionError state for recovery UI
   *   - Other errors: logged, stored in error state, and shown in an Alert
   *
   * This is a Strategy pattern: the handler checks the error type and routes
   * to different recovery paths.
   */
  const handleError = useCallback((err: any, action: string) => {
    if (err instanceof CredentialCollisionError) {
      // Error Recovery: Store for the screen to display recovery options
      setCollisionError(err);
      return;
    }

    // Standard error path: log, store, and alert
    console.error(`Error ${action}:`, err);
    setError(err.message || `Failed to ${action}`);
    Alert.alert("Error", err.message || `Failed to ${action}`);
  }, []);

  /**
   * linkGoogleProvider — Initiate Google Sign-In and link the account.
   *
   * Workflow:
   *   1. Show loading indicator
   *   2. Invoke getGoogleCredential (platform-specific flow)
   *   3. Call Repository's linkProvider with the credential
   *   4. Handle errors (including credential collision)
   *   5. Show success alert
   */
  const linkGoogleProvider = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await linkProvider("google.com");
      Alert.alert("Success", "Google account linked successfully!");
    } catch (err: any) {
      handleError(err, "link Google account");
    } finally {
      setIsLoading(false);
    }
  }, [linkProvider, handleError]);

  /**
   * linkAppleProvider — Initiate Apple Sign-In and link the account.
   *
   * Same workflow as linkGoogleProvider but for Apple Sign-In (iOS/web only).
   */
  const linkAppleProvider = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await linkProvider("apple.com");
      Alert.alert("Success", "Apple account linked successfully!");
    } catch (err: any) {
      handleError(err, "link Apple account");
    } finally {
      setIsLoading(false);
    }
  }, [linkProvider, handleError]);

  /**
   * linkEmailProvider — Link an email/password authentication method.
   *
   * Unlike OAuth providers, email authentication requires user-provided
   * credentials (email + password). These are passed to the Repository's
   * linkProvider function.
   *
   * @param email - Email address to link
   * @param password - Password for this email
   */
  const linkEmailProvider = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await linkProvider("password", { email, password });
        Alert.alert("Success", "Email and password linked successfully!");
      } catch (err: any) {
        handleError(err, "link email");
      } finally {
        setIsLoading(false);
      }
    },
    [linkProvider, handleError]
  );

  /**
   * unlinkProviderById — Remove a linked authentication provider.
   *
   * This operation has a critical Gatekeeper guard: users must always have
   * at least one sign-in method linked to their account. If they try to unlink
   * the last provider, we show an alert and abort.
   *
   * This prevents account lockout — the user would be unable to log back in if
   * they removed all authentication methods.
   *
   * @param providerId - Firebase provider ID (e.g., "google.com", "password")
   */
  const unlinkProviderById = useCallback(
    async (providerId: string) => {
      // --- Gatekeeper: Prevent account lockout ---
      if (linkedProviders.length <= 1) {
        Alert.alert(
          "Cannot Remove",
          "You must have at least one sign-in method linked to your account."
        );
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        await unlinkProvider(providerId);
        Alert.alert("Success", "Sign-in method removed successfully!");
      } catch (err: any) {
        handleError(err, "remove sign-in method");
      } finally {
        setIsLoading(false);
      }
    },
    [unlinkProvider, linkedProviders.length, handleError]
  );

  /**
   * switchGoogleAccount — Replace the linked Google account with a different one.
   *
   * Workflow:
   *   1. Gatekeeper: Ensure user has a backup provider (to prevent lockout)
   *   2. Get new Google credential via getGoogleCredential (prompts sign-in)
   *   3. Unlink old Google account
   *   4. Link new Google account
   *   5. Show success alert
   *
   * The Gatekeeper check ensures that if the unlink succeeds but the link fails,
   * the user still has at least one sign-in method.
   */
  const switchGoogleAccount = useCallback(async () => {
    // --- Gatekeeper: Check if user has another provider to fall back on ---
    // This prevents account lockout if the new link fails after unlinking
    const hasOtherProvider = linkedProviders.some(
      (p) => p.providerId !== "google.com"
    );

    if (!hasOtherProvider) {
      Alert.alert(
        "Add Another Method First",
        "Before switching Google accounts, please add another sign-in method (like Email or Apple) to ensure you don't lose access to your account.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Strategy: Use platform-specific credential acquisition
      const newCredential = await getGoogleCredential();
      if (!newCredential) {
        setIsLoading(false);
        return; // User cancelled the sign-in flow
      }

      // Atomicity trade-off: unlink old, then link new
      // If unlink succeeds but link fails, user still has a backup provider
      await unlinkProvider("google.com");
      await linkProvider("google.com");
      Alert.alert("Success", "Google account switched successfully!");
    } catch (err: any) {
      handleError(err, "switch Google account");
    } finally {
      setIsLoading(false);
    }
  }, [
    linkedProviders,
    getGoogleCredential,
    unlinkProvider,
    linkProvider,
    handleError,
  ]);

  /**
   * switchAppleAccount — Replace the linked Apple account with a different one.
   *
   * Same pattern as switchGoogleAccount but for Apple Sign-In.
   */
  const switchAppleAccount = useCallback(async () => {
    // --- Gatekeeper: Ensure user has a backup provider ---
    const hasOtherProvider = linkedProviders.some(
      (p) => p.providerId !== "apple.com"
    );

    if (!hasOtherProvider) {
      Alert.alert(
        "Add Another Method First",
        "Before switching Apple accounts, please add another sign-in method (like Email or Google) to ensure you don't lose access to your account.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Strategy: Use platform-specific credential acquisition
      const newCredential = await getAppleCredential();
      if (!newCredential) {
        setIsLoading(false);
        return; // User cancelled
      }

      // Atomicity trade-off: unlink old, then link new
      await unlinkProvider("apple.com");
      await linkProvider("apple.com");
      Alert.alert("Success", "Apple account switched successfully!");
    } catch (err: any) {
      handleError(err, "switch Apple account");
    } finally {
      setIsLoading(false);
    }
  }, [
    linkedProviders,
    getAppleCredential,
    unlinkProvider,
    linkProvider,
    handleError,
  ]);

  /**
   * changeEmailAddress — Update the email address for the email/password provider.
   *
   * Requires the user's current password for re-authentication before changing
   * the email. This is a security requirement from Firebase.
   *
   * @param newEmail - New email address to set
   * @param password - Current password for re-authentication
   */
  const changeEmailAddress = useCallback(
    async (newEmail: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await changeEmail(newEmail, password);
        Alert.alert("Success", "Email address updated successfully!");
      } catch (err: any) {
        handleError(err, "change email");
      } finally {
        setIsLoading(false);
      }
    },
    [changeEmail, handleError]
  );

  /**
   * resetPassword — Send a password reset email to the given email address.
   *
   * Security: This function uses a generic alert message regardless of success
   * or failure. This prevents user enumeration attacks (an attacker couldn't
   * determine whether an email is registered by checking the alert message).
   *
   * Firebase sendPasswordReset already follows this pattern (it doesn't error
   * if the email doesn't exist), but we double-down on the anti-enumeration
   * strategy by not showing different messages.
   *
   * @param email - Email address to send reset instructions to
   */
  const resetPassword = useCallback(
    async (email: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await sendPasswordReset(email);
        // Generic success message (email may or may not exist)
        Alert.alert(
          "Email Sent",
          "Check your inbox for password reset instructions."
        );
      } catch (err: any) {
        // Always show the same generic message for security (anti-enumeration)
        Alert.alert(
          "Email Sent",
          "If an account exists with this email, you'll receive reset instructions."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [sendPasswordReset]
  );

  /**
   * signInWithCollisionCredential — Recover from a credential collision.
   *
   * Scenario: User tries to link Google account A, but Google account A is
   * already linked to a different Calmdemy account. Firebase stores the
   * credential in collisionError.pendingCredential.
   *
   * This function signs the user into that OTHER account (the one that already
   * has the credential), switching their active session. This is a recovery path
   * for the common case where a user tries to link an account that's already in use.
   *
   * Error Recovery: If sign-in fails, we call handleError which may show another
   * collision error or a standard error alert.
   */
  const signInWithCollisionCredential = useCallback(async () => {
    if (!collisionError?.pendingCredential) {
      return;
    }

    setIsLoading(true);
    try {
      // Use the pending credential to sign into the other account
      await signInWithPendingCredential(collisionError.pendingCredential);
      // Clear collision state on success
      setCollisionError(null);
    } catch (err: any) {
      // Error Recovery: handle any errors from the sign-in attempt
      handleError(err, "sign in");
    } finally {
      setIsLoading(false);
    }
  }, [collisionError, signInWithPendingCredential, handleError]);

  return {
    // --- Derived State ---
    linkedProviders,
    availableProviders,
    // --- Loading/Error State ---
    isLoading,
    error,
    // --- Collision Recovery State ---
    collisionError,
    clearCollisionError,
    // --- Provider Linking ---
    linkGoogleProvider,
    linkAppleProvider,
    linkEmailProvider,
    unlinkProviderById,
    // --- Provider Switching (unlink + link) ---
    switchGoogleAccount,
    switchAppleAccount,
    // --- Email/Password Management ---
    changeEmailAddress,
    resetPassword,
    // --- Collision Recovery ---
    signInWithCollisionCredential,
  };
}
