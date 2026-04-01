import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuth } from "../src/contexts/AuthContext";
import { useProviderManagement } from "../src/hooks/useProviderManagement";
import { CredentialCollisionModal } from "../src/components/CredentialCollisionModal";
import { AccountSwitchWarning } from "../src/components/AccountSwitchWarning";
import { Theme } from "../src/theme";

export default function AccountSecurityScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const { user } = useAuth();
  const {
    linkedProviders,
    availableProviders,
    isLoading,
    collisionError,
    clearCollisionError,
    linkGoogleProvider,
    linkAppleProvider,
    linkEmailProvider,
    unlinkProviderById,
    switchGoogleAccount,
    switchAppleAccount,
    changeEmailAddress,
    resetPassword,
    signInWithCollisionCredential,
  } = useProviderManagement();

  // Modal states
  const [showAddEmailModal, setShowAddEmailModal] = useState(false);
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false);
  const [showSwitchWarning, setShowSwitchWarning] = useState(false);
  const [pendingSwitchAction, setPendingSwitchAction] = useState<
    (() => Promise<void>) | null
  >(null);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const hasEmailProvider = linkedProviders.some((p) => p.providerId === "password");
  const hasGoogleProvider = linkedProviders.some(
    (p) => p.providerId === "google.com"
  );
  const hasAppleProvider = linkedProviders.some(
    (p) => p.providerId === "apple.com"
  );
  const currentEmail =
    linkedProviders.find((p) => p.providerId === "password")?.email ||
    user?.email;

  const handleAddEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter both email and password.");
      return;
    }
    await linkEmailProvider(email.trim(), password);
    if (!collisionError) {
      setShowAddEmailModal(false);
      setEmail("");
      setPassword("");
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter your new email and current password.");
      return;
    }
    await changeEmailAddress(newEmail.trim(), password);
    setShowChangeEmailModal(false);
    setNewEmail("");
    setPassword("");
  };

  const handleResetPassword = () => {
    if (currentEmail) {
      Alert.alert(
        "Reset Password",
        `Send password reset email to ${currentEmail}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Send",
            onPress: () => resetPassword(currentEmail),
          },
        ]
      );
    }
  };

  const handleRemoveProvider = (providerId: string, displayName: string) => {
    Alert.alert(
      "Remove Sign-in Method",
      `Are you sure you want to remove ${displayName} from your account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => unlinkProviderById(providerId),
        },
      ]
    );
  };

  const handleSwitchProvider = (providerType: "google" | "apple") => {
    const switchFn =
      providerType === "google" ? switchGoogleAccount : switchAppleAccount;
    setPendingSwitchAction(() => switchFn);
    setShowSwitchWarning(true);
  };

  const handleConfirmSwitch = async () => {
    if (pendingSwitchAction) {
      await pendingSwitchAction();
    }
    setShowSwitchWarning(false);
    setPendingSwitchAction(null);
  };

  const handleCollisionSignIn = async () => {
    setShowSwitchWarning(true);
    setPendingSwitchAction(() => signInWithCollisionCredential);
  };

  const handleCollisionDifferentMethod = () => {
    clearCollisionError();
    // User can choose a different method from the available options
  };

  const renderLinkedProvider = (provider: {
    providerId: string;
    displayName: string;
    email?: string | null;
    icon: string;
  }) => {
    const canRemove = linkedProviders.length > 1;
    const canSwitch =
      provider.providerId === "google.com" || provider.providerId === "apple.com";

    return (
      <View key={provider.providerId} style={styles.providerCard}>
        <View style={styles.providerInfo}>
          <View
            style={[
              styles.providerIcon,
              {
                backgroundColor:
                  provider.providerId === "google.com"
                    ? "#4285F4"
                    : provider.providerId === "apple.com"
                    ? "#000"
                    : theme.colors.primary,
              },
            ]}
          >
            <Ionicons name={provider.icon as any} size={20} color="#fff" />
          </View>
          <View style={styles.providerText}>
            <Text style={styles.providerName}>{provider.displayName}</Text>
            {provider.email && (
              <Text style={styles.providerEmail}>{provider.email}</Text>
            )}
          </View>
        </View>

        <View style={styles.providerActions}>
          {canSwitch && (
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() =>
                handleSwitchProvider(
                  provider.providerId === "google.com" ? "google" : "apple"
                )
              }
              disabled={isLoading}
            >
              <Text style={styles.actionButtonText}>Change</Text>
            </Pressable>
          )}
          {canRemove && (
            <Pressable
              style={({ pressed }) => [
                styles.removeButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() =>
                handleRemoveProvider(provider.providerId, provider.displayName)
              }
              disabled={isLoading}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={theme.colors.error}
              />
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderAvailableProvider = (provider: {
    providerId: string;
    displayName: string;
    icon: string;
  }) => {
    const handleAdd = async () => {
      if (provider.providerId === "google.com") {
        await linkGoogleProvider();
      } else if (provider.providerId === "apple.com") {
        await linkAppleProvider();
      } else if (provider.providerId === "password") {
        setShowAddEmailModal(true);
      }
    };

    return (
      <Pressable
        key={provider.providerId}
        style={({ pressed }) => [
          styles.addProviderButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleAdd}
        disabled={isLoading}
      >
        <View
          style={[
            styles.addProviderIcon,
            { backgroundColor: `${theme.colors.primary}15` },
          ]}
        >
          <Ionicons
            name={provider.icon as any}
            size={20}
            color={theme.colors.primary}
          />
        </View>
        <Text style={styles.addProviderText}>Add {provider.displayName}</Text>
        <Ionicons
          name="add-circle-outline"
          size={22}
          color={theme.colors.primary}
        />
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "Account Security",
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={[styles.container, { paddingBottom: insets.bottom }]}
        contentContainerStyle={styles.content}
      >
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        {/* Linked Sign-in Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINKED SIGN-IN METHODS</Text>
          <Text style={styles.sectionDescription}>
            These are the ways you can sign into your account.
          </Text>

          {linkedProviders.map(renderLinkedProvider)}
        </View>

        {/* Add Sign-in Method */}
        {availableProviders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ADD SIGN-IN METHOD</Text>
            <Text style={styles.sectionDescription}>
              Add more ways to sign into your account for backup.
            </Text>

            {availableProviders.map(renderAvailableProvider)}
          </View>
        )}

        {/* Email & Password Options */}
        {hasEmailProvider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EMAIL & PASSWORD</Text>

            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setShowChangeEmailModal(true)}
            >
              <Ionicons
                name="mail-outline"
                size={22}
                color={theme.colors.text}
              />
              <Text style={styles.optionText}>Change Email Address</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.optionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleResetPassword}
            >
              <Ionicons
                name="key-outline"
                size={22}
                color={theme.colors.text}
              />
              <Text style={styles.optionText}>Reset Password</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textMuted}
              />
            </Pressable>
          </View>
        )}

        {/* Security Note */}
        <View style={styles.noteContainer}>
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={theme.colors.textMuted}
          />
          <Text style={styles.noteText}>
            We recommend having at least two sign-in methods linked to your
            account for security and recovery purposes.
          </Text>
        </View>
      </ScrollView>

      {/* Add Email Modal */}
      <Modal
        visible={showAddEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Email & Password</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddEmailModal(false);
                  setEmail("");
                  setPassword("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmButton, isLoading && styles.buttonDisabled]}
                onPress={handleAddEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Add</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal
        visible={showChangeEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangeEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Change Email Address</Text>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color={theme.colors.textMuted}
              />
              <TextInput
                style={styles.input}
                placeholder="New email address"
                placeholderTextColor={theme.colors.textMuted}
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={theme.colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Current password"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowChangeEmailModal(false);
                  setNewEmail("");
                  setPassword("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmButton, isLoading && styles.buttonDisabled]}
                onPress={handleChangeEmail}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Update</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credential Collision Modal */}
      {collisionError && (
        <CredentialCollisionModal
          visible={!!collisionError}
          onClose={clearCollisionError}
          providerType={collisionError.providerType}
          pendingCredential={collisionError.pendingCredential}
          onSignInToOtherAccount={handleCollisionSignIn}
          onUseDifferentMethod={handleCollisionDifferentMethod}
        />
      )}

      {/* Account Switch Warning */}
      <AccountSwitchWarning
        visible={showSwitchWarning}
        onClose={() => {
          setShowSwitchWarning(false);
          setPendingSwitchAction(null);
        }}
        onConfirmSwitch={handleConfirmSwitch}
      />
    </>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 20,
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.3)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 100,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 12,
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    sectionDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      marginBottom: 16,
    },
    providerCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    providerInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    providerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    providerText: {
      flex: 1,
    },
    providerName: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    providerEmail: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    providerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    actionButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: `${theme.colors.primary}15`,
      borderRadius: theme.borderRadius.md,
    },
    actionButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.primary,
    },
    removeButton: {
      padding: 4,
    },
    addProviderButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    addProviderIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    addProviderText: {
      flex: 1,
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: theme.colors.text,
    },
    optionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      gap: 12,
      ...theme.shadows.sm,
    },
    optionText: {
      flex: 1,
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: theme.colors.text,
    },
    noteContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.primary}08`,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      gap: 12,
    },
    noteText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    buttonPressed: {
      opacity: 0.7,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 24,
      width: "100%",
      maxWidth: 340,
      ...theme.shadows.lg,
    },
    modalTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: "center",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: 12,
      gap: 10,
    },
    input: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.text,
    },
    modalActions: {
      flexDirection: "row",
      marginTop: 8,
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
    },
    modalCancelText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: theme.colors.textMuted,
    },
    modalConfirmButton: {
      flex: 1,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
    },
    modalConfirmText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "#fff",
    },
  });
