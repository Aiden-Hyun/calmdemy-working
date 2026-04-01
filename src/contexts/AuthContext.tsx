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
 * Error thrown when attempting to link a credential that's already
 * associated with another Firebase account.
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

// Configure Google Sign In
GoogleSignin.configure({
  webClientId: "1012641376582-d37ir0jp1r9a4hb4r82dbn5nemaddnki.apps.googleusercontent.com",
  iosClientId: "1012641376582-q3b2a8q3k1qlvgqokaq229aujeat7hme.apps.googleusercontent.com",
});

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);

  // Check Apple Sign In availability on mount
  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setIsAppleSignInAvailable);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

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

  /**
   * Get a Google credential without signing in.
   * Useful for linking or upgrading anonymous accounts.
   */
  const getGoogleCredential = async (): Promise<AuthCredential | null> => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:getGoogleCredential:beforeSignIn',message:'About to call GoogleSignin.signIn',data:{currentUserId:auth.currentUser?.uid,isAnonymous:auth.currentUser?.isAnonymous},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AuthContext.tsx:getGoogleCredential:afterSignIn',message:'GoogleSignin.signIn returned',data:{currentUserId:auth.currentUser?.uid,isAnonymous:auth.currentUser?.isAnonymous,hasIdToken:!!signInResult.data?.idToken},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
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
   * Get an Apple credential without signing in.
   * Useful for linking or upgrading anonymous accounts.
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

  /**
   * Upgrade anonymous account by linking Google credential.
   * UID remains the same after successful linking.
   * Throws CredentialCollisionError if credential belongs to another account.
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
      if (error.code === "auth/credential-already-in-use") {
        // Get the email from the Google user that was just signed in
        const googleUser = await GoogleSignin.getCurrentUser();
        const email = googleUser?.user?.email || null;
        throw new CredentialCollisionError(credential, "google.com", email);
      }
      throw error;
    }
  };

  /**
   * Upgrade anonymous account by linking Apple credential.
   * UID remains the same after successful linking.
   * Throws CredentialCollisionError if credential belongs to another account.
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
   * UID remains the same after successful linking.
   * Throws CredentialCollisionError if email is already in use.
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
   * Used when user chooses to switch to the account that owns the credential.
   */
  const signInWithPendingCredential = async (
    credential: AuthCredential
  ): Promise<void> => {
    await signInWithCredential(auth, credential);
  };

  /**
   * Link a new provider to the current account.
   * Throws CredentialCollisionError if credential belongs to another account.
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
   * Throws error if trying to remove the last provider.
   */
  const unlinkProvider = async (providerId: string): Promise<void> => {
    if (!user) {
      throw new Error("No user is currently signed in");
    }
    const providers = user.providerData.map((p) => p.providerId);
    if (providers.length <= 1) {
      throw new Error("Cannot remove the last sign-in method");
    }
    await unlink(user, providerId);
  };

  /**
   * Change the email address for the current account.
   * Requires re-authentication with password.
   */
  const changeEmail = async (
    newEmail: string,
    password: string
  ): Promise<void> => {
    if (!user || !user.email) {
      throw new Error("No user with email is currently signed in");
    }
    // Re-authenticate first
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);
    // Then update email
    await updateEmail(user, newEmail);
  };

  /**
   * Send a password reset email.
   */
  const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email);
  };

  /**
   * Get list of linked provider IDs.
   */
  const getLinkedProviders = (): string[] => {
    if (!user) return [];
    return user.providerData.map((p) => p.providerId);
  };

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

  const logout = async () => {
    // Sign out from Google as well
    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore if not signed in with Google
    }
    await signOut(auth);
  };

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
      // Re-authenticate based on sign-in method
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

      // Delete all user data from Firestore
      await deleteUserAccount(userId);

      // Clear downloaded content
      await deleteAllDownloads();

      // Clear AsyncStorage preferences
      const keysToKeep = ["@theme_mode"]; // Keep theme preference
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }

      // Sign out from Google if applicable
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore
      }

      // Delete the Firebase Auth account
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

  const value = {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
    signUp,
    signIn,
    signInAnonymously,
    signInWithGoogle,
    signInWithApple,
    linkAnonymousAccount,
    isAppleSignInAvailable,
    logout,
    deleteAccount,
    // New methods for credential management
    upgradeAnonymousWithGoogle,
    upgradeAnonymousWithApple,
    upgradeAnonymousWithEmail,
    signInWithPendingCredential,
    getGoogleCredential,
    getAppleCredential,
    linkProvider,
    unlinkProvider,
    changeEmail,
    sendPasswordReset,
    getLinkedProviders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
