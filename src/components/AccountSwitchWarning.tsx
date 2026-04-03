/**
 * ============================================================
 * AccountSwitchWarning.tsx — Account Switch Confirmation (Modal Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   Warns the user before executing an account switch that originated from
 *   a credential collision. This is the second confirmation layer in the
 *   multi-step authentication state machine. It emphasizes data loss risk.
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
 *   AccountPromptModal as the second step of account switching
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
import { useTheme } from "../contexts/ThemeContext";
import { Theme } from "../theme";

interface AccountSwitchWarningProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSwitch: () => Promise<void>;
}

/**
 * AccountSwitchWarning — Secondary confirmation before account switch.
 *
 * This warning modal is shown as a confirmation gate when a user has
 * a credential collision and chooses to sign into the other account.
 * It warns them about data loss and requires explicit confirmation
 * before executing the actual account switch operation.
 *
 * This is part of a defensive confirmation chain:
 *   1. CredentialCollisionModal: "This email is registered elsewhere"
 *   2. AccountSwitchWarning (this): "Confirm you understand the consequences"
 *   3. Actual switch: signInWithPendingCredential in AccountPromptModal
 */
export function AccountSwitchWarning({
  visible,
  onClose,
  onConfirmSwitch,
}: AccountSwitchWarningProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  // --- Loading state during account switch execution ---
  const [isLoading, setIsLoading] = useState(false);

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
          {/* Warning Icon: Alert symbol */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="warning-outline"
              size={32}
              color={theme.colors.warning}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Switch Accounts?</Text>

          {/*
            --- Description: Highlights data loss risk ---
            This is crucial information: switching accounts means losing
            access to the current account's data (favorites, history, etc.)
            unless they're synced or backed up. This prevents accidental loss.
          */}
          <Text style={styles.description}>
            If you switch accounts, you may not see data from your current
            account unless it's backed up or synced.
          </Text>

          {/*
            --- Information Note: Specifics about what transfers ---
            Clarifies that favorites, history, and preferences are tied to
            the specific account and won't follow the user to the new account.
          */}
          <View style={styles.warningNote}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={theme.colors.textMuted}
            />
            <Text style={styles.warningNoteText}>
              Your favorites, history, and preferences will be associated with
              the new account.
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
