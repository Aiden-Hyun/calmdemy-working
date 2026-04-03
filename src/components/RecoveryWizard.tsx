import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { Theme } from "../theme";

/**
 * ============================================================
 * RecoveryWizard.tsx — Multi-Step Subscription Recovery Flow
 * ============================================================
 *
 * Architectural Role:
 *   A multi-step modal (State Machine) that guides users through subscription recovery.
 *   Triggered when the device has an active subscription but the current app account
 *   doesn't own it. The wizard lets users sign in with the account that has the
 *   subscription, proving they own it.
 *
 * Design Patterns:
 *   - State Machine: The wizard has four discrete steps (methods, email_login, tips, success),
 *     each with completely different UI. Navigation is explicit: each render function
 *     returns JSX for that step only. Transitions are controlled by setStep().
 *   - Render Props / Step Rendering: Instead of a monolithic JSX tree with deep
 *     conditional nesting, separate functions (renderMethods, renderEmailLogin, etc.)
 *     handle each step's UI. This keeps logic organized and step-specific.
 *   - Controlled Component: Form inputs (email, password, showPassword toggle) are
 *     local state. The component syncs with auth hooks (signInWithGoogle, signInWithApple, etc.)
 *     and checks isPremium to determine success.
 *
 * Key Dependencies:
 *   - useAuth() hook: Multiple sign-in methods (Google, Apple, email/password)
 *   - useSubscription(): Subscription state (isPremium), checkSubscriptionStatus()
 *   - useSafeAreaInsets: Safe area awareness for notch/status bar insets
 *
 * Consumed By:
 *   PaywallModal (when user taps "Recover My Subscription" or restore fails)
 *
 * Note on Success Criteria:
 *   After any sign-in attempt, the wizard calls checkSubscriptionStatus() to update
 *   the subscription state. If isPremium becomes true, it shows the success screen.
 *   If isPremium is still false, it shows an error ("Not the Right Account").
 *   This is an observable verification: the subscription state is the source of truth.
 * ============================================================
 */

interface RecoveryWizardProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * State machine: The wizard navigates through these discrete steps.
 * Each step has its own UI rendered by a dedicated function.
 */
type RecoveryStep = "methods" | "email_login" | "tips" | "success";

/**
 * RecoveryWizard — Multi-step modal for subscription account recovery.
 *
 * This wizard helps users sign in with the account that owns their subscription
 * (discovered on the device via App Store/Play Store). The four steps are:
 *   1. "methods" — Choose sign-in method (Apple, Google, or Email)
 *   2. "email_login" — Email/password form (only if user chooses email)
 *   3. "tips" — Recovery tips (help if user forgot their account details)
 *   4. "success" — Confirmation screen (shown after successful sign-in)
 *
 * @param visible - Whether the wizard modal is shown
 * @param onClose - Callback to close the wizard and reset step to "methods"
 * @param onSuccess - Optional callback when recovery succeeds (user is now premium)
 */
export function RecoveryWizard({
  visible,
  onClose,
  onSuccess,
}: RecoveryWizardProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const {
    signInWithGoogle,
    signInWithApple,
    signIn,
    sendPasswordReset,
    isAppleSignInAvailable,
  } = useAuth();
  const { isPremium, checkSubscriptionStatus } = useSubscription();

  // State machine: tracks current wizard step
  const [step, setStep] = useState<RecoveryStep>("methods");

  // Loading flag during async sign-in (prevents double-taps)
  const [isLoading, setIsLoading] = useState(false);

  // Form state: email and password for email sign-in method
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Password visibility toggle (eye icon to show/hide password)
  const [showPassword, setShowPassword] = useState(false);

  /**
   * Handles Google Sign-In flow.
   * 1. Initiates Google authentication (via useAuth hook)
   * 2. Checks if subscription is now active (Observer pattern: check isPremium)
   * 3. If successful (isPremium = true), shows success screen
   * 4. If unsuccessful, shows error alert (anti-enumeration: generic message)
   *
   * The delay before checking isPremium allows state to propagate from Firebase.
   */
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      // Check if premium is now active (sync subscription state from Firebase)
      await checkSubscriptionStatus();
      // Small delay to let React state update from checkSubscriptionStatus
      setTimeout(() => {
        if (isPremium) {
          setStep("success");
          onSuccess?.();
        } else {
          // Still not premium, show message (this is the wrong account)
          Alert.alert(
            "Not the Right Account",
            "This account doesn't have an active subscription. Try another sign-in method."
          );
        }
      }, 500);
    } catch (error: any) {
      // Use generic message for anti-enumeration (prevent user enumeration attacks)
      Alert.alert("Unable to Sign In", "Please try again or use another method.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles Apple Sign-In flow (same pattern as Google, optimized for iOS).
   * Checks isAppleSignInAvailable before offering this option.
   */
  const handleAppleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      await checkSubscriptionStatus();
      setTimeout(() => {
        if (isPremium) {
          setStep("success");
          onSuccess?.();
        } else {
          Alert.alert(
            "Not the Right Account",
            "This account doesn't have an active subscription. Try another sign-in method."
          );
        }
      }, 500);
    } catch (error: any) {
      Alert.alert("Unable to Sign In", "Please try again or use another method.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles email/password sign-in flow.
   * 1. Validates form (both email and password are required)
   * 2. Calls signIn with trimmed credentials
   * 3. Checks subscription status and navigates to success if premium
   * 4. Shows error if wrong account (no active subscription)
   * 5. Generic error message for anti-enumeration (prevents attacker from
   *    discovering valid account emails via timing/error patterns)
   */
  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      await checkSubscriptionStatus();
      setTimeout(() => {
        if (isPremium) {
          setStep("success");
          onSuccess?.();
        } else {
          Alert.alert(
            "Not the Right Account",
            "This account doesn't have an active subscription. Try another sign-in method."
          );
        }
      }, 500);
    } catch (error: any) {
      // Generic message for anti-enumeration (prevent user enumeration attacks)
      Alert.alert("Unable to Sign In", "Please check your credentials and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initiates password reset flow.
   * Validates that email is entered, then sends password reset link.
   * Uses anti-enumeration message: always says "check your email" even if
   * account doesn't exist, preventing attackers from enumerating users.
   */
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address first.");
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Alert.alert(
        "Check Your Email",
        "If an account exists with this email, you'll receive a password reset link."
      );
    } catch {
      // Generic message for anti-enumeration (same as success case)
      Alert.alert(
        "Check Your Email",
        "If an account exists with this email, you'll receive a password reset link."
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Opens the device's mail app with a pre-filled support email.
   * Used when user needs manual intervention (e.g., account recovery issues).
   * This is a Facade pattern: hides the complexity of URI encoding and deep linking.
   */
  const handleContactSupport = () => {
    const subject = encodeURIComponent("Subscription Recovery Help");
    const body = encodeURIComponent(
      "Hi,\n\nI need help recovering my subscription. I have an active subscription on my Apple ID but can't find my account.\n\nPlease help me recover access.\n\nThank you"
    );
    Linking.openURL(`mailto:support@calmnest.app?subject=${subject}&body=${body}`);
  };

  /**
   * Closes the wizard and resets all state.
   * Called when user taps the close button.
   * Resets step to "methods" so next time wizard opens, it starts from the beginning.
   */
  const handleClose = () => {
    setStep("methods");
    setEmail("");
    setPassword("");
    onClose();
  };

  /**
   * Final success handler (called on the success screen).
   * Closes the wizard and triggers the parent's onSuccess callback.
   */
  const handleSuccess = () => {
    handleClose();
    onSuccess?.();
  };

  /**
   * Render Step 1: Sign-in Methods
   * Displays the available sign-in options: Apple (if available), Google, and Email.
   * Also shows help buttons for users who forgot their account details.
   *
   * This is the entry point to the recovery flow. Users choose which account
   * they signed up with, then proceed to that method's form.
   */
  const renderMethods = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* --- Render Phase 1: Header (Context) --- */}
      {/* Explains why the wizard exists: device has subscription, but current account doesn't */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Recover Your Subscription</Text>
        <Text style={styles.description}>
          We found an active subscription on this device's App Store account,
          but it's linked to a different in-app account.
        </Text>
      </View>

      {/* --- Render Phase 2: Sign-in Methods (Three options + Help) --- */}
      <Text style={styles.sectionTitle}>Try signing in with:</Text>

      {/* Apple Sign In — Only shown if iOS and device supports Sign in with Apple */}
      {isAppleSignInAvailable && (
        <Pressable
          style={({ pressed }) => [
            styles.methodButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleAppleSignIn}
          disabled={isLoading}
        >
          <View style={[styles.methodIcon, { backgroundColor: "#000" }]}>
            <Ionicons name="logo-apple" size={20} color="#fff" />
          </View>
          <Text style={styles.methodText}>Sign in with Apple</Text>
          {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
        </Pressable>
      )}

      {/* Google Sign In — Cross-platform option */}
      <Pressable
        style={({ pressed }) => [
          styles.methodButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleGoogleSignIn}
        disabled={isLoading}
      >
        <View style={[styles.methodIcon, { backgroundColor: "#4285F4" }]}>
          <Ionicons name="logo-google" size={20} color="#fff" />
        </View>
        <Text style={styles.methodText}>Sign in with Google</Text>
        {isLoading && <ActivityIndicator size="small" color={theme.colors.primary} />}
      </Pressable>

      {/* Email Sign In — Navigates to email_login step for form entry */}
      <Pressable
        style={({ pressed }) => [
          styles.methodButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => setStep("email_login")}
        disabled={isLoading}
      >
        <View style={[styles.methodIcon, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="mail-outline" size={20} color="#fff" />
        </View>
        <Text style={styles.methodText}>Sign in with Email</Text>
      </Pressable>

      {/* Visual separator between sign-in methods and help options */}
      <View style={styles.divider} />

      {/* Help options for stuck users */}
      {/* Recovery Tips — Links to tips step (recovery tips, platform-specific help) */}
      <Pressable
        style={({ pressed }) => [
          styles.helpButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={() => setStep("tips")}
      >
        <Ionicons
          name="help-circle-outline"
          size={20}
          color={theme.colors.textMuted}
        />
        <Text style={styles.helpButtonText}>Don't remember your login?</Text>
      </Pressable>

      {/* Contact Support — Opens email client with pre-filled message */}
      <Pressable
        style={({ pressed }) => [
          styles.helpButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleContactSupport}
      >
        <Ionicons
          name="chatbubble-outline"
          size={20}
          color={theme.colors.textMuted}
        />
        <Text style={styles.helpButtonText}>Contact Support</Text>
      </Pressable>
    </ScrollView>
  );

  /**
   * Render Step 2: Email Login Form
   * Allows users to enter email and password. Form inputs are controlled
   * (value from state, onChange updates state). Includes a password visibility
   * toggle and a "Forgot Password" link.
   *
   * This step is shown when the user taps "Sign in with Email" from the methods screen.
   */
  const renderEmailLogin = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Back button — Returns to methods step (State Machine transition) */}
      <Pressable
        style={styles.backButton}
        onPress={() => setStep("methods")}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </Pressable>

      <Text style={styles.title}>Sign in with Email</Text>
      <Text style={styles.description}>
        Enter the email and password you used to create your account.
      </Text>

      {/* --- Render Phase 1: Form Inputs (Controlled Component Pattern) --- */}
      {/* Email and password are controlled inputs: value from state, onChange handlers update state */}

      {/* Email input — Controlled input with icon and keyboard-optimized settings */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="mail-outline"
          size={20}
          color={theme.colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={theme.colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>

      {/* Password input — Controlled input with show/hide toggle (eye icon) */}
      <View style={styles.inputContainer}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={theme.colors.textMuted}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Password"
          placeholderTextColor={theme.colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          editable={!isLoading}
        />
        {/* Password visibility toggle — Shows/hides password based on showPassword state */}
        <Pressable onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>

      {/* --- Render Phase 2: Forgot Password Link --- */}
      {/* Initiates password reset flow. User must enter email first. */}
      <Pressable
        style={styles.forgotPassword}
        onPress={handleForgotPassword}
        disabled={isLoading}
      >
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </Pressable>

      {/* --- Render Phase 3: Sign In Button (Primary Action) --- */}
      {/* Disabled while loading to prevent double-taps. Shows spinner during async sign-in. */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
          isLoading && styles.buttonDisabled,
        ]}
        onPress={handleEmailSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </Pressable>
    </ScrollView>
  );

  /**
   * Render Step 3: Recovery Tips
   * Helpful suggestions for users who forgot their account details.
   * Tips are platform-aware (Apple tip only on iOS, generic Google/Email tips for all).
   * Last tip includes a "Contact Support" link for manual account recovery.
   *
   * This step is shown when the user taps "Don't remember your login?" from the methods screen.
   */
  const renderTips = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Back button — Returns to methods step (State Machine transition) */}
      <Pressable
        style={styles.backButton}
        onPress={() => setStep("methods")}
      >
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </Pressable>

      <Text style={styles.title}>Recovery Tips</Text>

      {/* --- Tip 1: Apple Sign in with Apple (iOS only) --- */}
      {/* Platform-specific tip: Only shown on iOS. Explains how to check
          if the user created an account with "Hide My Email" (Apple's privacy feature). */}
      {Platform.OS === "ios" && (
        <View style={styles.tipCard}>
          <View style={[styles.tipIcon, { backgroundColor: "#000" }]}>
            <Ionicons name="logo-apple" size={20} color="#fff" />
          </View>
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>Used "Hide My Email"?</Text>
            <Text style={styles.tipText}>
              Go to Settings {">"} Apple ID {">"} Sign in with Apple {">"} Apps
              Using Apple ID to see if Calmdemy is listed.
            </Text>
          </View>
        </View>
      )}

      {/* --- Tip 2: Multiple Google Accounts --- */}
      {/* Cross-platform tip: Many users have multiple Google accounts. Suggests
          trying each one until finding the right account. */}
      <View style={styles.tipCard}>
        <View style={[styles.tipIcon, { backgroundColor: "#4285F4" }]}>
          <Ionicons name="logo-google" size={20} color="#fff" />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Multiple Google Accounts?</Text>
          <Text style={styles.tipText}>
            Try signing in with each Google account you may have used when
            setting up Calmdemy.
          </Text>
        </View>
      </View>

      {/* --- Tip 3: Forgot Email Address --- */}
      {/* Email-based recovery tip: Suggests checking email inbox for messages from Calmdemy
          to figure out which email address was used for signup. */}
      <View style={styles.tipCard}>
        <View style={[styles.tipIcon, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="mail-outline" size={20} color="#fff" />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Forgot Your Email?</Text>
          <Text style={styles.tipText}>
            Check your inbox for any emails from Calmdemy to find which email
            address you used.
          </Text>
        </View>
      </View>

      {/* --- Tip 4: Manual Support --- */}
      {/* Final fallback: If all tips failed, contact support. Includes an inline button
          that opens the mail app with a pre-filled recovery request. */}
      <View style={styles.tipCard}>
        <View style={[styles.tipIcon, { backgroundColor: theme.colors.textMuted }]}>
          <Ionicons name="chatbubble-outline" size={20} color="#fff" />
        </View>
        <View style={styles.tipContent}>
          <Text style={styles.tipTitle}>Still Stuck?</Text>
          <Text style={styles.tipText}>
            Contact our support team and we'll help you recover your account.
          </Text>
          <Pressable
            style={styles.tipLink}
            onPress={handleContactSupport}
          >
            <Text style={styles.tipLinkText}>Contact Support</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );

  /**
   * Render Step 4: Success Screen
   * Shown after successful sign-in and subscription verification.
   * Displays a confirmation message and a "Continue" button to close the wizard.
   *
   * This step is reached when:
   *   1. User signs in with any method (Apple, Google, Email)
   *   2. checkSubscriptionStatus() is called and isPremium becomes true
   * This proves the user owns the subscription on this device.
   */
  const renderSuccess = () => (
    <View style={styles.successContainer}>
      {/* Success icon — Green checkmark with full-screen centering */}
      <View style={styles.successIcon}>
        <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
      </View>
      <Text style={styles.successTitle}>Welcome Back!</Text>
      <Text style={styles.successText}>
        This is the account linked to your subscription. You now have full
        access to all premium content.
      </Text>
      {/* Continue button — Closes the wizard and triggers onSuccess callback */}
      <Pressable
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={handleSuccess}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Close button — Available on all steps, resets state and closes modal */}
        <Pressable style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={24} color={theme.colors.textLight} />
        </Pressable>

        {/* --- State Machine: Render current step based on `step` state --- */}
        {/* Each render function handles a complete UI for its step.
            Conditional rendering ensures only one step is visible at a time.
            This pattern keeps each step's logic encapsulated and easy to maintain. */}
        {step === "methods" && renderMethods()}
        {step === "email_login" && renderEmailLogin()}
        {step === "tips" && renderTips()}
        {step === "success" && renderSuccess()}
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    closeButton: {
      position: "absolute",
      top: 16,
      right: 16,
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...theme.shadows.sm,
    },
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 60,
      paddingBottom: 40,
    },
    header: {
      alignItems: "center",
      marginBottom: 32,
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 24,
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
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.textMuted,
      marginBottom: 16,
    },
    methodButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    methodIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    methodText: {
      flex: 1,
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.gray[200],
      marginVertical: 24,
    },
    helpButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      gap: 12,
    },
    helpButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    backButton: {
      marginBottom: 24,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    inputIcon: {
      marginRight: 12,
    },
    input: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.text,
    },
    forgotPassword: {
      alignSelf: "flex-end",
      marginBottom: 24,
    },
    forgotPasswordText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.primary,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: "#fff",
    },
    buttonPressed: {
      opacity: 0.8,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    tipCard: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 16,
      marginBottom: 12,
      ...theme.shadows.sm,
    },
    tipIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    tipContent: {
      flex: 1,
    },
    tipTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 4,
    },
    tipText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      lineHeight: 20,
    },
    tipLink: {
      marginTop: 8,
    },
    tipLinkText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.primary,
    },
    successContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    successIcon: {
      marginBottom: 24,
    },
    successTitle: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 28,
      color: theme.colors.text,
      marginBottom: 12,
    },
    successText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
  });
