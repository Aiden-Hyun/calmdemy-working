/**
 * ============================================================
 * AccountPromptModal.tsx — Account Linking Prompt (Modal Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   Implements the Modal Pattern to prompt anonymous users to link their
 *   subscription to a persistent account (Google, Apple, or Email).
 *   This component sits in the authentication feature and is presented
 *   when a user with an active subscription wants to secure it.
 *
 * Design Patterns:
 *   - Modal Pattern: Presents a fullscreen overlay with authentication options
 *   - State Machine: Manages collision errors and account-switch warnings
 *     through conditional state (collisionError, showSwitchWarning)
 *   - Gatekeeper: The upgrade handlers validate credential collisions and
 *     prevent users from linking to an already-registered account
 *   - Composition: Conditionally renders CredentialCollisionModal and
 *     AccountSwitchWarning as child modals based on error state
 *
 * Key Dependencies:
 *   - useAuth (upgrade methods, pending credential handling)
 *   - useTheme (style injection via createStyles)
 *   - CredentialCollisionError (custom error type from AuthContext)
 *
 * Consumed By:
 *   Authentication flows that require account linking (typically triggered
 *   when a guest user with an active subscription attempts to continue)
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth, CredentialCollisionError } from "../contexts/AuthContext";
import { Theme } from "../theme";
import { CredentialCollisionModal } from "./CredentialCollisionModal";
import { AccountSwitchWarning } from "./AccountSwitchWarning";

interface AccountPromptModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * AccountPromptModal — Prompts anonymous users to link their subscription.
 *
 * This is a controlled Modal component that manages the account-linking flow.
 * It handles credential collision errors (when a user tries to link to an
 * already-registered account) by rendering subordinate modals
 * (CredentialCollisionModal, AccountSwitchWarning).
 *
 * State Management:
 *   - isLoading: global loading state for any upgrade operation
 *   - loadingProvider: tracks which provider (google/apple) is currently loading
 *   - collisionError: stores CredentialCollisionError if linking fails due to
 *     the email being registered on another account
 *   - showSwitchWarning: flag to show the account-switch warning modal
 */
export function AccountPromptModal({
  visible,
  onClose,
}: AccountPromptModalProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const {
    upgradeAnonymousWithGoogle,
    upgradeAnonymousWithApple,
    isAppleSignInAvailable,
    signInWithPendingCredential,
  } = useAuth();

  // --- Global loading state across all upgrade providers ---
  const [isLoading, setIsLoading] = useState(false);
  // --- Tracks which provider is currently being processed for UI feedback ---
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  // --- Stores credential collision error when email is already registered ---
  const [collisionError, setCollisionError] =
    useState<CredentialCollisionError | null>(null);
  // --- Flag to display the account-switch warning modal ---
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);

  /**
   * Attempts to upgrade the anonymous account with Google Sign-In.
   * If the email collides with an existing account, sets collisionError
   * which triggers the CredentialCollisionModal. On success, closes this modal.
   *
   * This implements the Try-Recover pattern: attempts the operation, catches
   * the CredentialCollisionError specifically, and lets it bubble to the UI
   * for user decision (switch accounts or use different method).
   */
  const handleGoogleLink = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AccountPromptModal.tsx:handleGoogleLink:entry',message:'handleGoogleLink called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    setIsLoading(true);
    setLoadingProvider("google");
    try {
      await upgradeAnonymousWithGoogle();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AccountPromptModal.tsx:handleGoogleLink:success',message:'upgradeAnonymousWithGoogle succeeded - THIS SHOULD NOT HAPPEN for collision',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      Alert.alert(
        "Account Secured!",
        "Your subscription is now linked to your Google account."
      );
      onClose();
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/abd8d170-6f53-45be-bd37-3634e6180c4d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'AccountPromptModal.tsx:handleGoogleLink:catch',message:'Caught error',data:{errorType:error?.constructor?.name,isCollisionError:error instanceof CredentialCollisionError,errorMessage:error?.message,errorCode:error?.code},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,D'})}).catch(()=>{});
      // #endregion
      if (error instanceof CredentialCollisionError) {
        setCollisionError(error);
      } else if (error.message !== "User cancelled") {
        Alert.alert("Error", error.message || "Failed to link Google account");
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  /**
   * Attempts to upgrade the anonymous account with Apple Sign-In.
   * Mirrors handleGoogleLink behavior: catches collision errors and
   * shows appropriate error alerts or modals.
   */
  const handleAppleLink = async () => {
    setIsLoading(true);
    setLoadingProvider("apple");
    try {
      await upgradeAnonymousWithApple();
      Alert.alert(
        "Account Secured!",
        "Your subscription is now linked to your Apple account."
      );
      onClose();
    } catch (error: any) {
      // --- Credential collision: email already registered elsewhere ---
      if (error instanceof CredentialCollisionError) {
        setCollisionError(error);
      } else if (error.message !== "User cancelled") {
        // --- Generic error alert (exclude user cancellation) ---
        Alert.alert("Error", error.message || "Failed to link Apple account");
      }
    } finally {
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  /**
   * Handles the user's choice to sign in to the other account
   * (where their email is already registered). Shows a warning modal
   * before proceeding with the account switch.
   */
  const handleCollisionSignIn = () => {
    // --- Display the account-switch warning modal before committing to switch ---
    setShowSwitchWarning(true);
  };

  /**
   * Confirms the account switch using the pending credential from the
   * collision error. This signs the user into the other account and
   * closes both this modal and the collision modal.
   *
   * This is an asynchronous operation that may fail if the pending
   * credential has expired or been invalidated.
   */
  const handleConfirmSwitch = async () => {
    if (!collisionError?.pendingCredential) return;
    try {
      await signInWithPendingCredential(collisionError.pendingCredential);
      setCollisionError(null);
      onClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to sign in");
    }
  };

  /**
   * Clears the collision error when the user chooses to try a different
   * authentication method. Re-renders the primary modal so they can
   * pick Google, Apple, or skip for now.
   */
  const handleCollisionDifferentMethod = () => {
    setCollisionError(null);
    // --- Modal re-renders to show provider buttons again ---
  };

  /**
   * Closes this modal without linking any account (dismisses with "Maybe later").
   * The user's subscription remains on the guest account.
   */
  const handleContinue = () => {
    onClose();
  };

  return (
    <>
      {/*
        --- Main Account Linking Modal ---
        Shown only when visible AND no collision error. The collision error
        state triggers the CredentialCollisionModal instead (visible && !collisionError).
        This implements a State Machine pattern: only one of three states shows:
        1. Main modal (visible && !collisionError && !showSwitchWarning)
        2. Collision modal (collisionError)
        3. Switch warning modal (showSwitchWarning)
      */}
      <Modal
        visible={visible && !collisionError}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View
            style={[styles.container, { paddingBottom: insets.bottom + 24 }]}
          >
            {/* Icon: Gradient shield to emphasize account security */}
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primaryDark]}
              style={styles.iconContainer}
            >
              <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
            </LinearGradient>

            {/* Title */}
            <Text style={styles.title}>Secure Your Subscription</Text>

            {/* Description: Explains value proposition */}
            <Text style={styles.description}>
              Link an account to keep your subscription safe and sync your
              favorites across devices.
            </Text>

            {/*
              --- Platform-Conditional: Apple Sign-In (iOS only) ---
              Apple Sign-In is only available on iOS 13+. We check both the platform
              and isAppleSignInAvailable (determined at app startup) before rendering.
              This is a Capability Detection pattern — gracefully skip iOS-only auth
              on Android and older iOS versions.
            */}
            {Platform.OS === "ios" && isAppleSignInAvailable && (
              <Pressable
                style={({ pressed }) => [
                  styles.providerButton,
                  { backgroundColor: "#000" },
                  pressed && styles.buttonPressed,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleAppleLink}
                disabled={isLoading}
              >
                {/*
                  --- Loading Spinner or Button Content (Controlled Component) ---
                  When loadingProvider === "apple", show spinner to give user feedback
                  that this specific provider is being processed. Otherwise show icon + text.
                */}
                {loadingProvider === "apple" ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="logo-apple" size={20} color="#fff" />
                    <Text style={styles.providerButtonText}>
                      Continue with Apple
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Google Sign-In: Always available, shown on all platforms */}
            <Pressable
              style={({ pressed }) => [
                styles.providerButton,
                { backgroundColor: "#4285F4" },
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleGoogleLink}
              disabled={isLoading}
            >
              {loadingProvider === "google" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#fff" />
                  <Text style={styles.providerButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>

            {/* Dismiss button: User can skip linking for now */}
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleContinue}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Maybe later</Text>
            </Pressable>

            {/*
              --- Warning Note: Explains risk of not linking ---
              This is a Graceful Degradation pattern. The app will continue to work
              without linking, but the user may lose data if they reinstall or switch
              devices. We surface this risk upfront so the user makes an informed choice.
            */}
            <View style={styles.warningNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.warning}
              />
              <Text style={styles.warningNoteText}>
                Without linking, you may lose access if you reinstall the app or
                switch devices.
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/*
        --- Credential Collision Modal (Composite Pattern) ---
        Conditionally rendered as a child modal when collisionError is set.
        This handles the case where the user tries to link to an email that's
        already registered on another Calmdemy account. The user can then choose
        to sign into that other account or try a different method.
      */}
      {collisionError && (
        <CredentialCollisionModal
          visible={!!collisionError}
          onClose={() => setCollisionError(null)}
          providerType={collisionError.providerType}
          pendingCredential={collisionError.pendingCredential}
          onSignInToOtherAccount={handleCollisionSignIn}
          onUseDifferentMethod={handleCollisionDifferentMethod}
        />
      )}

      {/*
        --- Account Switch Warning Modal (Composite Pattern) ---
        Shown after the user confirms they want to switch to the other account.
        This warns them about data loss and asks for final confirmation before
        committing to the account switch with signInWithPendingCredential.
      */}
      <AccountSwitchWarning
        visible={showSwitchWarning}
        onClose={() => setShowSwitchWarning(false)}
        onConfirmSwitch={handleConfirmSwitch}
      />
    </>
  );
}

/**
 * createStyles — Dynamically generates StyleSheet based on theme.
 *
 * This factory function is called with useMemo dependencies [theme, isDark]
 * to prevent style object recreation on every render. The returned object
 * is stable (same reference) until theme or isDark changes.
 *
 * This is a textbook application of the Factory Method pattern combined
 * with the Memoization strategy to optimize React rendering.
 */
const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Semi-transparent dark overlay behind the modal ---
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    // --- Main modal container: centered card with rounded corners ---
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 32,
      alignItems: "center",
      width: "100%",
      maxWidth: 340,
      ...theme.shadows.lg,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    description: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    providerButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: theme.borderRadius.lg,
      width: "100%",
      marginBottom: 12,
      gap: 10,
    },
    providerButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "#fff",
    },
    secondaryButton: {
      paddingVertical: 12,
      paddingHorizontal: 32,
      width: "100%",
      alignItems: "center",
    },
    secondaryButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    warningNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.warning}10`,
      borderRadius: theme.borderRadius.md,
      padding: 12,
      marginTop: 16,
      gap: 8,
    },
    warningNoteText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
      lineHeight: 16,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
