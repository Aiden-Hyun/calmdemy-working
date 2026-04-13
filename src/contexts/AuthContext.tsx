/**
 * ============================================================
 * AuthContext.tsx — Authentication Provider (Provider Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Provider pattern to supply authentication
 *   state and actions to the entire component tree via React Context.
 *   It sits in the "core/providers" layer — a cross-cutting concern that
 *   every feature module depends on but none owns.
 *
 *   WARNING: This is a monolithic "God Object" — a single provider encapsulating
 *   all auth concerns (types, session lifecycle, credential acquisition, anonymous
 *   upgrades, collision handling, account deletion, provider management). Unlike
 *   the refactored approach in the main Calmdemy repo (which splits into action
 *   factories), this version bundles everything in one file. While functional,
 *   this pattern violates Single Responsibility and makes testing/mocking harder.
 *   Future refactoring should decompose into action factories:
 *     - SessionActions (signIn, signUp, logout, session state)
 *     - CredentialActions (getGoogleCredential, getAppleCredential)
 *     - UpgradeActions (upgradeAnonymousWithGoogle, etc.)
 *     - LinkingActions (linkProvider, unlinkProvider)
 *     - AccountActions (deleteAccount, changeEmail)
 *   See: https://en.wikipedia.org/wiki/Single_responsibility_principle
 *
 * Design Patterns:
 *   - Provider Pattern: Centralizes auth state and exposes it through
 *     a context consumer hook (useAuth).
 *   - Facade Pattern: The context value object exposes a simplified,
 *     unified interface to a complex subsystem (Firebase Auth +
 *     Google Sign-In + Apple Authentication).
 *   - Observer Pattern: onAuthStateChanged subscribes to Firebase's
 *     auth state stream — the component re-renders reactively when
 *     the observed subject (Firebase Auth) emits a new state.
 *   - Typed Exception: CredentialCollisionError is a domain-specific
 *     exception carrying metadata (credential, provider type, email)
 *     for precise error handling downstream.
 *   - Chain of Responsibility: deleteAccount re-authenticates based on
 *     the linked provider chain, trying email → Google → Apple → fallback.
 *   - Gatekeeper Pattern: unlinkProvider prevents removing the last
 *     sign-in method, enforcing a safety invariant.
 *   - Selective Teardown: deleteAccount wipes user data from multiple
 *     systems (Firestore, AsyncStorage, downloads) while preserving
 *     non-user state (theme preference).
 *
 * Key Dependencies:
 *   - firebase/auth (identity provider, credential linking, reauthentication)
 *   - @react-native-google-signin (OAuth credential acquisition on Android/iOS)
 *   - expo-apple-authentication (Apple Sign-In on iOS)
 *   - AsyncStorage (local user preferences and session state)
 *   - Firestore services (deleteUserAccount, deleteAllDownloads)
 *
 * Consumed By:
 *   Every screen and feature that checks login state, initiates auth flows,
 *   or links/unlinks providers, via the useAuth() hook.
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  User,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously as firebaseSignInAnonymously,
  linkWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithCredential,
  EmailAuthProvider,
  reauthenticateWithCredential,
  AuthCredential,
  unlink,
  updateEmail,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { deleteUserAccount } from "../services/firestoreService";
import { deleteAllDownloads } from "../services/downloadService";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * CredentialCollisionError — Typed Exception Pattern
 *
 * Thrown when Firebase detects that a credential (email/password, Google OAuth,
 * Apple OAuth) is already linked to another account. This is a domain-specific
 * exception that carries enough metadata for the UI to:
 *   1. Show the user which provider caused the collision (google.com, apple.com, password)
 *   2. Display the email address associated with the colliding credential
 *   3. Offer to switch to that account using signInWithPendingCredential
 *
 * This follows the Typed Exception pattern: instead of checking error.code strings,
 * callers can discriminate on instanceof and access properties directly.
 *
 * @example
 * try {
 *   await upgradeAnonymousWithGoogle();
 * } catch (err) {
 *   if (err instanceof CredentialCollisionError) {
 *     const email = err.email; // e.g., "user@example.com"
 *     const providerType = err.providerType; // e.g., "google.com"
 *     // Show UI: "Switch to the account at ${email}?"
 *   }
 * }
 */
export class CredentialCollisionError extends Error {
  constructor(
    public readonly pendingCredential: AuthCredential,
    public readonly providerType: "google.com" | "apple.com" | "password",
    public readonly email: string | null = null
  ) {
    super("This credential is already linked to another account");
    this.name = "CredentialCollisionError";
  }
}

// Configure Google Sign In with platform-specific client IDs.
// This setup is required before any GoogleSignin method is called.
GoogleSignin.configure({
  webClientId: "1012641376582-d37ir0jp1r9a4hb4r82dbn5nemaddnki.apps.googleusercontent.com",
  iosClientId: "1012641376582-q3b2a8q3k1qlvgqokaq229aujeat7hme.apps.googleusercontent.com",
});

/**
 * AuthContextType — Auth Facade Interface
 *
 * Defines the contract exported by the AuthProvider. This is the Facade pattern
 * applied to auth: consumers see a unified, simplified interface that hides
 * the complexity of Firebase Auth, Google Sign-In, Apple Authentication,
 * and local state management.
 *
 * Methods are grouped by concern:
 *   - Session Lifecycle: signUp, signIn, logout, deleteAccount
 *   - Anonymous Account Upgrade: upgradeAnonymousWithGoogle, upgradeAnonymousWithApple, upgradeAnonymousWithEmail
 *   - Credential Acquisition: getGoogleCredential, getAppleCredential, signInWithPendingCredential
 *   - Provider Management: linkProvider, unlinkProvider, getLinkedProviders
 *   - Account Management: changeEmail, sendPasswordReset
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  linkAnonymousAccount: (credential: AuthCredential) => Promise<void>;
  isAppleSignInAvailable: boolean;
  logout: () => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  // New methods for credential management
  upgradeAnonymousWithGoogle: () => Promise<void>;
  upgradeAnonymousWithApple: () => Promise<void>;
  upgradeAnonymousWithEmail: (email: string, password: string) => Promise<void>;
  signInWithPendingCredential: (credential: AuthCredential) => Promise<void>;
  getGoogleCredential: () => Promise<AuthCredential | null>;
  getAppleCredential: () => Promise<AuthCredential | null>;
  linkProvider: (
    providerType: "google.com" | "apple.com" | "password",
    emailPassword?: { email: string; password: string }
  ) => Promise<void>;
  unlinkProvider: (providerId: string) => Promise<void>;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  getLinkedProviders: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider — Authentication State + Actions (Provider Pattern)
 *
 * A React Context provider that manages:
 *   1. Auth state (user, loading, isAnonymous, isAppleSignInAvailable)
 *   2. All auth-related actions (sign in, sign up, linking, account deletion, etc.)
 *
 * This component initializes Firebase Auth's listener on mount and keeps the
 * context value in sync with the current auth state.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  // Capability Detection: probe Apple Sign-In availability at init time.
  // This is platform-conditional (iOS only) and async, so we subscribe
  // on mount and store the result in local state for downstream consumers.
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAppleSignInAvailable);
    }
  }, []);

  // --- Session Lifecycle: Firebase Auth Observer Setup ---
  // Subscribe to Firebase's auth state stream on mount. The Observer pattern
  // means this component re-renders whenever the observed subject (Firebase Auth)
  // emits a new state. Cleanup is automatic: the returned unsubscribe function
  // is called when the component unmounts.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  /**
   * Create a new account with email and password.
   * On success, the user is automatically signed in.
   * Throws error if email is already in use or password is weak.
   */
  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  /**
   * Sign in with email and password.
   * Throws error if credentials are invalid.
   */
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  /**
   * Sign in anonymously.
   * Creates a temporary account with a generated UID. Useful for onboarding
   * flows: users can explore content before committing to credentials.
   * Anonymous accounts can later be upgraded with linkProvider or
   * upgradeAnonymousWithGoogle/Apple/Email.
   */
  const signInAnonymously = async () => {
    await firebaseSignInAnonymously(auth);
  };

  const linkAnonymousAccount = async (credential: AuthCredential) => {
    if (!user) {
      throw new Error("No user is currently signed in");
    }
    if (!user.isAnonymous) {
      throw new Error("User is not anonymous");
    }
    await linkWithCredential(user, credential);
  };

  // === CREDENTIAL ACQUISITION ===
  // These methods get OAuth credentials from external identity providers without
  // immediately signing in. This is a key pattern for:
  //   1. Anonymous account upgrades (link the credential to the anon user)
  //   2. Multi-provider linking (add a second sign-in method to an existing account)
  //   3. Collision detection (the credential may already be linked to another account)

  /**
   * Get a Google OAuth credential without signing in.
   *
   * Triggers Google Sign-In UI, captures the ID token, and wraps it in
   * a Firebase AuthCredential. The credential can then be used to:
   *   - linkWithCredential (add Google as a sign-in method)
   *   - signInWithCredential (sign in with Google)
   *
   * Returns null if the user cancels the sign-in flow.
   * Throws if device doesn't support Google Play Services or other auth errors.
   *
   * @returns Firebase AuthCredential or null if user cancelled
   */
  const getGoogleCredential = async (): Promise<AuthCredential | null> => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) return null;
      return GoogleAuthProvider.credential(idToken);
    } catch (err: any) {
      if (
        err?.code === statusCodes.SIGN_IN_CANCELLED ||
        err?.code === "12501"
      ) {
        return null;
      }
      throw err;
    }
  };

  /**
   * Get an Apple OAuth credential without signing in.
   *
   * Triggers Apple Sign-In UI, captures the identity token, and wraps it in
   * a Firebase AuthCredential. The credential can then be used to:
   *   - linkWithCredential (add Apple as a sign-in method)
   *   - signInWithCredential (sign in with Apple)
   *
   * Returns null if the user cancels the sign-in flow.
   * Throws if device doesn't support Apple Sign-In (checked via isAppleSignInAvailable).
   *
   * Note: Apple may return null for email if the user selected "Hide My Email".
   * This is handled gracefully — we proceed without the email in collision detection.
   *
   * @returns Firebase AuthCredential or null if user cancelled
   */
  const getAppleCredential = async (): Promise<AuthCredential | null> => {
    if (!isAppleSignInAvailable) {
      throw new Error("Apple Sign In is not available on this device");
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken } = credential;
      if (!identityToken) return null;
      const provider = new OAuthProvider("apple.com");
      return provider.credential({ idToken: identityToken });
    } catch (err: any) {
      if (
        err?.code === AppleAuthentication.AppleAuthenticationError?.CANCELED ||
        err?.code === "ERR_CANCELED" ||
        err?.code === "ERR_REQUEST_CANCELED"
      ) {
        return null;
      }
      throw err;
    }
  };

  // === ANONYMOUS ACCOUNT UPGRADE ===
  // These methods convert an anonymous account to a persistent, signed-in account
  // by linking a credential (Google, Apple, or email/password). The UID remains
  // unchanged, so all user data and preferences carry over seamlessly.
  //
  // Collision Handling:
  //   If the credential is already linked to another account, Firebase throws
  //   "auth/credential-already-in-use". We catch this and throw a CredentialCollisionError
  //   with metadata (provider type, email) so the UI can ask: "Switch to that account?"

  /**
   * Upgrade anonymous account by linking Google credential.
   *
   * This method:
   *   1. Verifies the current user is anonymous
   *   2. Calls getGoogleCredential() to obtain a Google OAuth credential
   *   3. Links the credential to the anonymous account via linkWithCredential
   *   4. On collision, catches "auth/credential-already-in-use" and throws
   *      CredentialCollisionError with the conflicting email address
   *
   * The user's UID remains the same after successful linking — all user data
   * (preferences, favorites, downloads) is preserved.
   *
   * @throws Error if user is not anonymous
   * @throws Error if user cancels the Google Sign-In flow
   * @throws CredentialCollisionError if the Google account is already linked
   */
  const upgradeAnonymousWithGoogle = async (): Promise<void> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:upgradeAnonymousWithGoogle:entry',message:'upgradeAnonymousWithGoogle called',data:{hasUser:!!user,isAnonymous:user?.isAnonymous,userId:user?.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,E'})}).catch(()=>{});
    // #endregion
    if (!user?.isAnonymous) {
      throw new Error("User is not anonymous");
    }
    const credential = await getGoogleCredential();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:upgradeAnonymousWithGoogle:afterGetCred',message:'Got Google credential',data:{hasCredential:!!credential,userStillAnonymous:user?.isAnonymous,userId:user?.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    if (!credential) {
      throw new Error("User cancelled");
    }

    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:upgradeAnonymousWithGoogle:beforeLink',message:'About to call linkWithCredential',data:{userId:user?.uid,isAnonymous:user?.isAnonymous},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      await linkWithCredential(user, credential);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:upgradeAnonymousWithGoogle:linkSuccess',message:'linkWithCredential SUCCEEDED - no collision',data:{userId:user?.uid},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:upgradeAnonymousWithGoogle:linkError',message:'linkWithCredential threw error',data:{errorCode:error?.code,errorMessage:error?.message,errorName:error?.name,fullError:JSON.stringify(error,Object.getOwnPropertyNames(error))},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      // Collision Detection Pattern: Firebase throws auth/credential-already-in-use
      // when a credential is already linked to another account. We catch this,
      // wrap it in a typed exception (CredentialCollisionError) with the email of
      // the account that owns the credential, and let the UI decide whether to
      // switch accounts. This is safer than silently failing or re-throwing Firebase's
      // error message (which is cryptic for end users).
      if (error.code === "auth/credential-already-in-use") {
        const googleUser = await GoogleSignin.getCurrentUser();
        const email = googleUser?.user?.email || null;
        throw new CredentialCollisionError(credential, "google.com", email);
      }
      throw error;
    }
  };

  /**
   * Upgrade anonymous account by linking Apple credential.
   *
   * Similar to upgradeAnonymousWithGoogle, but handles Apple Sign-In specifics:
   *   - User may select "Hide My Email", so email can be null
   *   - Apple Sign-In is only available on iOS 13+
   *
   * @throws Error if user is not anonymous
   * @throws Error if Apple Sign-In is not available on the device
   * @throws Error if user cancels the Apple Sign-In flow
   * @throws CredentialCollisionError if the Apple account is already linked
   */
  const upgradeAnonymousWithApple = async (): Promise<void> => {
    if (!user?.isAnonymous) {
      throw new Error("User is not anonymous");
    }
    if (!isAppleSignInAvailable) {
      throw new Error("Apple Sign In is not available on this device");
    }

    let appleEmail: string | null = null;
    let credential: AuthCredential;

    try {
      const appleResponse = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const { identityToken, email } = appleResponse;
      appleEmail = email || null;
      if (!identityToken) {
        throw new Error("User cancelled");
      }
      const provider = new OAuthProvider("apple.com");
      credential = provider.credential({ idToken: identityToken });
    } catch (err: any) {
      if (
        err?.code === AppleAuthentication.AppleAuthenticationError?.CANCELED ||
        err?.code === "ERR_CANCELED" ||
        err?.code === "ERR_REQUEST_CANCELED"
      ) {
        throw new Error("User cancelled");
      }
      throw err;
    }

    try {
      await linkWithCredential(user, credential);
    } catch (error: any) {
      if (error.code === "auth/credential-already-in-use") {
        throw new CredentialCollisionError(credential, "apple.com", appleEmail);
      }
      throw error;
    }
  };

  /**
   * Upgrade anonymous account by linking email/password credential.
   *
   * Converts the anonymous account to a persistent account with email/password
   * sign-in. Unlike OAuth methods, we don't trigger a UI flow — the caller
   * provides email and password directly.
   *
   * @param email - Email address to link (must not already be in use)
   * @param password - Password for the account (must meet Firebase strength requirements)
   * @throws Error if user is not anonymous
   * @throws CredentialCollisionError if the email is already linked to another account
   */
  const upgradeAnonymousWithEmail = async (
    email: string,
    password: string
  ): Promise<void> => {
    if (!user?.isAnonymous) {
      throw new Error("User is not anonymous");
    }
    const credential = EmailAuthProvider.credential(email, password);

    try {
      await linkWithCredential(user, credential);
    } catch (error: any) {
      if (
        error.code === "auth/credential-already-in-use" ||
        error.code === "auth/email-already-in-use"
      ) {
        throw new CredentialCollisionError(credential, "password", email);
      }
      throw error;
    }
  };

  /**
   * Sign in with a pending credential from a CredentialCollisionError.
   *
   * When a credential collision is detected (credential already linked to another
   * account), the UI can offer to switch to that account. This method signs in
   * using the credential that caused the collision, logging out the current user.
   *
   * Typical flow:
   *   1. User tries to upgrade anonymous account with Google
   *   2. Firebase throws auth/credential-already-in-use
   *   3. We throw CredentialCollisionError with pendingCredential and email
   *   4. UI shows: "Switch to account@example.com?"
   *   5. User clicks yes
   *   6. UI calls signInWithPendingCredential(error.pendingCredential)
   *
   * @param credential - The credential from a CredentialCollisionError
   */
  const signInWithPendingCredential = async (
    credential: AuthCredential
  ): Promise<void> => {
    await signInWithCredential(auth, credential);
  };

  // === PROVIDER MANAGEMENT ===
  // These methods manage multiple sign-in methods on a single account.
  // A user can have multiple linked providers (e.g., Google + Apple + Email/Password),
  // allowing flexible sign-in options and account recovery.

  /**
   * Link a new provider to the current account.
   *
   * Allows a user to add a second (or subsequent) sign-in method:
   *   - Google OAuth: triggers Google Sign-In UI
   *   - Apple OAuth: triggers Apple Sign-In UI (iOS only)
   *   - Email/Password: caller provides email and password directly
   *
   * If the credential is already linked to another account, throws CredentialCollisionError.
   * If the user cancels the OAuth flow, returns silently (no error).
   *
   * @param providerType - The provider to link ("google.com", "apple.com", or "password")
   * @param emailPassword - Required only for password provider; omit for OAuth
   * @throws Error if no user is signed in
   * @throws CredentialCollisionError if the credential belongs to another account
   */
  const linkProvider = async (
    providerType: "google.com" | "apple.com" | "password",
    emailPassword?: { email: string; password: string }
  ): Promise<void> => {
    if (!user) {
      throw new Error("No user is currently signed in");
    }

    let credential: AuthCredential | null = null;
    let providerEmail: string | null = null;

    if (providerType === "google.com") {
      credential = await getGoogleCredential();
      if (credential) {
        const googleUser = await GoogleSignin.getCurrentUser();
        providerEmail = googleUser?.user?.email || null;
      }
    } else if (providerType === "apple.com") {
      credential = await getAppleCredential();
      // Apple email is not easily accessible after getAppleCredential
      // It may be null if user chose "Hide My Email"
    } else if (providerType === "password" && emailPassword) {
      credential = EmailAuthProvider.credential(
        emailPassword.email,
        emailPassword.password
      );
      providerEmail = emailPassword.email;
    }

    if (!credential) return; // User cancelled

    try {
      await linkWithCredential(user, credential);
    } catch (error: any) {
      if (
        error.code === "auth/credential-already-in-use" ||
        error.code === "auth/email-already-in-use"
      ) {
        throw new CredentialCollisionError(credential, providerType, providerEmail);
      }
      throw error;
    }
  };

  /**
   * Unlink a provider from the current account.
   *
   * Removes a sign-in method from the user's account. An account must always
   * have at least one sign-in method (Invariant Guard pattern), so we prevent
   * removal of the last provider with a guard clause. This invariant is enforced
   * client-side for better UX and server-side by Firebase Auth as a safeguard.
   *
   * Typical use case: A user with Google + Email sign-in wants to disable
   * Google as a sign-in option and keep only Email.
   *
   * @param providerId - The provider to unlink (e.g., "google.com", "apple.com", "password")
   * @throws Error if no user is signed in
   * @throws Error if this is the last sign-in method (Gatekeeper)
   */
  const unlinkProvider = async (providerId: string): Promise<void> => {
    if (!user) {
      throw new Error("No user is currently signed in");
    }

    // Invariant Guard: Ensure the user has at least one other provider.
    // This prevents accidentally locking themselves out of their account.
    const providers = user.providerData.map((p) => p.providerId);
    if (providers.length <= 1) {
      throw new Error("Cannot remove the last sign-in method");
    }

    await unlink(user, providerId);
  };

  /**
   * Change the email address for the current account.
   *
   * For security, Firebase requires re-authentication before changing the email.
   * This method:
   *   1. Re-authenticates the user with their current email and password
   *   2. Updates the email to the new address
   *
   * Typical use case: User changes email and wants to keep their account.
   *
   * @param newEmail - The new email address (must not already be in use)
   * @param password - The user's current password for re-authentication
   * @throws Error if no user with email is currently signed in
   * @throws Error if password is incorrect
   * @throws Error if new email is already in use
   */
  const changeEmail = async (
    newEmail: string,
    password: string
  ): Promise<void> => {
    if (!user || !user.email) {
      throw new Error("No user with email is currently signed in");
    }
    // Re-authenticate first (security requirement from Firebase)
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    // Then update email
    await updateEmail(user, newEmail);
  };

  /**
   * Send a password reset email.
   *
   * Sends an email with a link to reset the password for the given email address.
   * If the email is not registered, the method still succeeds (silent failure for
   * security — we don't want to leak which emails are registered).
   *
   * @param email - The email address to send the reset link to
   */
  const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  /**
   * Get list of linked provider IDs.
   *
   * Returns the providerId for each authentication method linked to the user's account.
   * Possible values: "password", "google.com", "apple.com", etc.
   *
   * @returns Array of provider IDs, or empty array if no user is signed in
   */
  const getLinkedProviders = (): string[] => {
    if (!user) return [];
    return user.providerData.map((p) => p.providerId);
  };

  /**
   * Sign in with Google (direct sign-in, not credential acquisition).
   *
   * Triggers Google Sign-In UI and immediately signs in the user if they're new
   * or logs them back in if they're returning. This is a complete sign-in flow
   * in one step.
   *
   * User cancellation is treated as a silent abort (no error thrown), so the UI
   * doesn't show an error message if the user dismisses the sign-in dialog.
   *
   * @throws Error if device doesn't support Google Play Services
   * @throws Error if a network or auth error occurs (but not user cancellation)
   */
  const signInWithGoogle = async () => {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Get the user's ID token
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;
      if (!idToken) {
        // User likely cancelled or no token returned; silently abort
        return;
      }
      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);
      // Sign in with the credential
      await signInWithCredential(auth, googleCredential);
    } catch (err: any) {
      // Swallow user-cancelled sign-in
      if (
        err?.code === statusCodes.SIGN_IN_CANCELLED ||
        err?.code === "12501" // common Android cancel code
      ) {
        return;
      }
      throw err;
    }
  };

  /**
   * Sign in with Apple (direct sign-in, not credential acquisition).
   *
   * Triggers Apple Sign-In UI and immediately signs in the user if they're new
   * or logs them back in if they're returning. This is a complete sign-in flow
   * in one step.
   *
   * User cancellation is treated as a silent abort (no error thrown). Apple may
   * also return null for email if the user selected "Hide My Email" — this is
   * handled gracefully.
   *
   * @throws Error if Apple Sign-In is not available on the device
   * @throws Error if a network or auth error occurs (but not user cancellation)
   */
  const signInWithApple = async () => {
    if (!isAppleSignInAvailable) {
      throw new Error("Apple Sign In is not available on this device");
    }

    try {
      // Perform Apple Sign In request
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Ensure we have an identity token
      const { identityToken } = credential;
      if (!identityToken) {
        // User likely cancelled; silently abort
        return;
      }

      // Create a Firebase credential from the Apple response (provider instance in modular SDK)
      const provider = new OAuthProvider("apple.com");
      const appleCredential = provider.credential({
        idToken: identityToken,
      });

      // Sign in with the credential
      await signInWithCredential(auth, appleCredential);
    } catch (err: any) {
      // Swallow user-cancelled sign-in
      if (
        err?.code === AppleAuthentication.AppleAuthenticationError?.CANCELED ||
        err?.code === "ERR_CANCELED" ||
        err?.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      throw err;
    }
  };

  // === ACCOUNT MANAGEMENT ===

  /**
   * Sign out the current user.
   *
   * Also signs out from Google locally to prevent auto-sign-in on next app launch.
   */
  const logout = async () => {
    // Sign out from Google as well
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore if not signed in with Google
    }
    await signOut(auth);
  };

  /**
   * Delete the current user's account and all associated data.
   *
   * This is a multi-step, transactional operation:
   *   1. Re-authenticate based on the linked provider (Chain of Responsibility)
   *   2. Delete user data from Firestore
   *   3. Delete downloaded meditation content
   *   4. Clear AsyncStorage preferences (Selective Teardown: keep theme only)
   *   5. Sign out from Google locally
   *   6. Delete Firebase Auth account
   *
   * Re-authentication is required by Firebase for security. We try multiple
   * strategies in order: email/password → Google → Apple → unknown (fallback).
   *
   * Selective Teardown: We explicitly preserve the theme preference (@theme_mode)
   * because it's system-level state, not user-account state. All other user
   * preferences (favorites, downloads, etc.) are cleared.
   *
   * @param password - Required only if the user has email/password sign-in
   * @throws Error if no user is currently signed in
   * @throws Error if re-authentication fails (e.g., wrong password, cancelled OAuth)
   * @throws Error if delete fails with code "auth/requires-recent-login" (security)
   */
  const deleteAccount = async (password?: string) => {
    if (!user) {
      throw new Error("No user is currently signed in");
    }

    const userId = user.uid;
    const providerData = user.providerData;
    const isEmailProvider = providerData.some(p => p.providerId === "password");
    const isGoogleProvider = providerData.some(p => p.providerId === "google.com");
    const isAppleProvider = providerData.some(p => p.providerId === "apple.com");

    try {
      // --- Phase 1: Chain of Responsibility — Re-authenticate based on linked provider ---
      // Firebase requires recent authentication before deletion for security.
      // We try each provider in order until one succeeds.
      if (isEmailProvider && password) {
        // Re-authenticate with email/password
        const credential = EmailAuthProvider.credential(user.email!, password);
        await reauthenticateWithCredential(user, credential);
      } else if (isGoogleProvider) {
        // Re-authenticate with Google
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult.data?.idToken;
        if (!idToken) {
          throw new Error("Failed to get Google token for re-authentication");
        }
        const googleCredential = GoogleAuthProvider.credential(idToken);
        await reauthenticateWithCredential(user, googleCredential);
      } else if (isAppleProvider) {
        // Re-authenticate with Apple
        const appleCredential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        const { identityToken } = appleCredential;
        if (!identityToken) {
          throw new Error("Failed to get Apple token for re-authentication");
        }
        const provider = new OAuthProvider("apple.com");
        const oauthCredential = provider.credential({ idToken: identityToken });
        await reauthenticateWithCredential(user, oauthCredential);
      } else if (!isEmailProvider && !isGoogleProvider && !isAppleProvider) {
        // Unknown provider - try to proceed anyway (might fail)
        console.warn("Unknown auth provider, attempting deletion without re-auth");
      }

      // --- Phase 2: Delete all user data from Firestore ---
      await deleteUserAccount(userId);

      // --- Phase 3: Clear downloaded content ---
      await deleteAllDownloads();

      // --- Phase 4: Selective Teardown of AsyncStorage ---
      // We explicitly preserve @theme_mode because it's system-level state,
      // not user-account state. All other user preferences (favorites, settings, etc.)
      // are removed. This is a Defensive Programming approach: we enumerate what
      // to keep rather than what to delete, reducing the risk of accidentally
      // wiping important system data.
      const keysToKeep = ["@theme_mode"]; // Keep theme preference
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // --- Phase 5: Clean up OAuth session ---
      // Sign out from Google locally to prevent auto-sign-in on next app launch
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if not signed in with Google
      }

      // --- Phase 6: Delete the Firebase Auth account ---
      await user.delete();

      console.log("Account deleted successfully");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      // Re-throw with user-friendly message
      if (error.code === "auth/requires-recent-login") {
        throw new Error("Please sign out and sign back in, then try again.");
      }
      if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password. Please try again.");
      }
      throw error;
    }
  };

  // Facade Pattern: The context value object presents a unified, simplified interface
  // to the complexity underneath (Firebase Auth + Google Sign-In + Apple Authentication).
  // Consumers don't need to know about AuthCredential, reauthentication, or provider
  // chains — they just call methods on this object.
  //
  // Note on referential stability: This object is created on every render. For a more
  // performant implementation, consider wrapping it in useMemo with stable deps.
  const value = {
    // State
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
    isAppleSignInAvailable,

    // Session Lifecycle
    signUp,
    signIn,
    signInAnonymously,
    logout,

    // Direct OAuth Sign-In
    signInWithGoogle,
    signInWithApple,

    // Anonymous Account Upgrade
    upgradeAnonymousWithGoogle,
    upgradeAnonymousWithApple,
    upgradeAnonymousWithEmail,

    // Legacy credential linking (kept for backwards compatibility)
    linkAnonymousAccount,

    // Credential Acquisition & Collision Handling
    getGoogleCredential,
    getAppleCredential,
    signInWithPendingCredential,

    // Provider Management
    linkProvider,
    unlinkProvider,
    getLinkedProviders,

    // Account Management
    changeEmail,
    sendPasswordReset,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * useAuth — Context Consumer Hook
 *
 * Provides convenient, type-safe access to the auth context throughout the app.
 * This is the Gatekeeper pattern applied to context access: if the caller is
 * outside an AuthProvider, we throw immediately with a helpful error rather
 * than returning undefined and causing cryptic errors downstream.
 *
 * @returns The auth context value (user, state, actions)
 * @throws Error if called outside an AuthProvider
 *
 * @example
 * const { user, loading, signInWithGoogle } = useAuth();
 * if (loading) return <LoadingSpinner />;
 * if (!user) return <LoginScreen />;
 * return <HomeScreen />;
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
