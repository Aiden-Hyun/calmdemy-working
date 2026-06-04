/**
 * ============================================================
 * AccountSwitchWarning.tsx — Account Switch Confirmation (Modal Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   The single confirmation gate before executing an account switch. It
 *   emphasizes data-loss risk and, when handed an email/providerType, names
 *   the destination account. The sole survivor of the AccountSwitch* pair
 *   (the former AccountSwitchConfirmModal was folded in via optional props).
 *
 * Design Patterns:
 *   - Modal Pattern: Transient confirmation dialog
 *   - State Machine: Part of the credential collision flow:
 *     1. Collision error -> CredentialCollisionModal
 *     2. "Sign in to other" -> This AccountSwitchWarning
 *     3. Confirm -> execute actual account switch
 *   - Gatekeeper: Requires explicit confirmation before proceeding
 *
 * Key Dependencies:
 *   - useTheme (style injection)
 *   - useSafeAreaInsets (notch-aware layout)
 *
 * Consumed By:
 *   - AccountPromptModal — generic switch during the account-link flow
 *   - AccountSecurityScreen — generic switch between linked providers
 *   - LoginScreen — targeted switch from a credential collision (passes
 *     email + providerType for personalized copy)
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";

interface AccountSwitchWarningProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSwitch: () => Promise<void>;
  /**
   * When provided, the modal personalizes its copy to the destination
   * account (the login credential-collision flow). When omitted, it shows
   * the generic data-loss warning (the account-link and security flows).
   */
  email?: string | null;
  providerType?: "google.com" | "apple.com" | "password";
}

/**
 * Adapter: Maps Firebase provider ID to a human-readable display name.
 */
const getProviderDisplayName = (
  providerType: "google.com" | "apple.com" | "password"
): string => {
  switch (providerType) {
    case "google.com":
      return "Google";
    case "apple.com":
      return "Apple";
    case "password":
      return "email";
    default:
      return "account";
  }
};

/**
 * AccountSwitchWarning — Confirmation gate before switching the active account.
 *
 * Serves two flows with one component:
 *   - Generic (no email/providerType): warns about data loss before the
 *     account-link (AccountPromptModal) and account-security switch flows.
 *   - Targeted (email/providerType provided): the login credential-collision
 *     flow, where the copy names the destination account and warns that the
 *     guest subscription won't transfer.
 *
 * In both flows the parent owns the actual switch (signInWithPendingCredential
 * or a provider switch fn); this modal only gates it behind explicit confirmation.
 */
export function AccountSwitchWarning({
  visible,
  onClose,
  onConfirmSwitch,
  email,
  providerType,
}: AccountSwitchWarningProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  // --- Loading state during account switch execution ---
  const [isLoading, setIsLoading] = useState(false);

  // --- Personalized (collision) vs generic (link/security) presentation ---
  const isTargeted = providerType != null;
  const providerName = providerType ? getProviderDisplayName(providerType) : null;
  const displayAccount =
    email || (providerName ? `this ${providerName} account` : null);

  /**
   * Handles the confirmation: executes the account switch and closes modal.
   * Wraps the parent callback with loading state and error handling.
   */
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirmSwitch();
      onClose();
    } catch (error) {
      console.error("Error switching accounts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
          {/* Icon: swap symbol for the targeted collision flow, warning otherwise */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={isTargeted ? "swap-horizontal-outline" : "warning-outline"}
              size={32}
              color={theme.colors.warning}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isTargeted ? "Switch Account?" : "Switch Accounts?"}
          </Text>

          {/*
            --- Description ---
            Targeted: names the destination account so the user knows exactly
            which account they're signing into.
            Generic: highlights data-loss risk when switching accounts.
          */}
          {isTargeted ? (
            <Text style={styles.description}>
              Sign in to{" "}
              <Text style={styles.emailHighlight}>{displayAccount}</Text>?
            </Text>
          ) : (
            <Text style={styles.description}>
              If you switch accounts, you may not see data from your current
              account unless it's backed up or synced.
            </Text>
          )}

          {/*
            --- Warning note ---
            Targeted: the destructive caveat — current guest account is
            replaced and the subscription won't transfer.
            Generic: clarifies favorites/history/preferences follow the account.
          */}
          <View style={styles.warningNote}>
            <Ionicons
              name={isTargeted ? "warning-outline" : "information-circle-outline"}
              size={18}
              color={isTargeted ? theme.colors.warning : theme.colors.textMuted}
            />
            <Text style={styles.warningNoteText}>
              {isTargeted
                ? "This will replace your current guest account. Your subscription will remain on the guest account and won't transfer."
                : "Your favorites, history, and preferences will be associated with the new account."}
            </Text>
          </View>

          {/*
            --- Confirm Button: Proceed with account switch ---
            Warning color (orange/red) to emphasize destructive nature.
            After confirmation, the parent executes signInWithPendingCredential
            to complete the account switch.
          */}
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Switch Account</Text>
            )}
          </Pressable>

          {/* Cancel: Return without switching */}
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/**
 * createStyles — Theme-aware stylesheet factory.
 *
 * Memoized to ensure style object stability across renders.
 */
const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Semi-transparent overlay covering screen ---
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    // --- Centered modal card with elevation ---
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
      backgroundColor: `${theme.colors.warning}15`,
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
      marginBottom: 16,
    },
    emailHighlight: {
      fontFamily: theme.fonts.ui.semiBold,
      color: theme.colors.text,
    },
    warningNote: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.warning}10`,
      borderRadius: theme.borderRadius.md,
      padding: 12,
      marginBottom: 24,
      gap: 8,
    },
    warningNoteText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
      lineHeight: 18,
    },
    primaryButton: {
      backgroundColor: theme.colors.warning,
      paddingVertical: 14,
      paddingHorizontal: 32,
      borderRadius: theme.borderRadius.lg,
      width: "100%",
      alignItems: "center",
      marginBottom: 12,
    },
    primaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "#fff",
    },
    cancelButton: {
      paddingVertical: 14,
      paddingHorizontal: 32,
      width: "100%",
      alignItems: "center",
    },
    cancelButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
