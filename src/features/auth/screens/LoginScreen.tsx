import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { googleIconSvg } from "../assets/googleIcon";
import { useAuth, CredentialCollisionError } from "../../../core/auth/AuthContext";
import { useTheme } from "../../../core/theme/ThemeContext";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { CredentialCollisionModal } from "../components/CredentialCollisionModal";
import { AccountSwitchConfirmModal } from "../components/AccountSwitchConfirmModal";
import { router, useLocalSearchParams } from "expo-router";
import { Theme } from "../../../core/theme";

export function LoginScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isLinkMode = mode === 'link'; // true when user tapped "Link Account" from Settings
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const {
    user,
    isAnonymous,
    signUp,
    signIn,
    signInAnonymously,
    signInWithGoogle,
    signInWithApple,
    upgradeAnonymousWithGoogle,
    upgradeAnonymousWithApple,
    upgradeAnonymousWithEmail,
    signInWithPendingCredential,
    isAppleSignInAvailable,
    loading,
  } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [collisionError, setCollisionError] = useState<CredentialCollisionError | null>(null);
  const [showSwitchConfirm, setShowSwitchConfirm] = useState(false);
  const { theme, isDark } = useTheme();

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Button loading animation
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(buttonScale, {
            toValue: 0.98,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(buttonScale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      buttonScale.setValue(1);
    }
  }, [loading, buttonScale]);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      // Link mode: link email/password to anonymous account
      if (isLinkMode && isAnonymous) {
        await upgradeAnonymousWithEmail(email, password);
        Alert.alert("Success", "Email linked to your account!");
        router.replace('/home');
        return;
      }
      
      // Normal sign up/sign in
      if (isSignUp) {
        await signUp(email, password);
        Alert.alert(
          "Success",
          "Account created! Please check your email to verify.",
        );
        router.replace('/home');
      } else {
        await signIn(email, password);
        router.replace('/home');
      }
    } catch (error: any) {
      // Handle collision in link mode
      if (error instanceof CredentialCollisionError) {
        setCollisionError(error);
      } else {
        Alert.alert("Error", error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      
      // Only use upgrade (link) when user explicitly tapped "Link Account" (mode=link)
      // Otherwise, use regular sign-in which replaces the anonymous user
      if (isLinkMode && isAnonymous) {
        await upgradeAnonymousWithGoogle();
        router.replace('/home');
      } else {
        await signInWithGoogle();
        router.replace('/home');
      }
    } catch (error: any) {
      if (error instanceof CredentialCollisionError) {
        setCollisionError(error);
      } else if (error.message && error.message !== "User cancelled") {
        Alert.alert("Error", error.message);
      }
      // User cancelled - do nothing, stay on current page
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true);
      
      // Only use upgrade (link) when user explicitly tapped "Link Account" (mode=link)
      // Otherwise, use regular sign-in which replaces the anonymous user
      if (isLinkMode && isAnonymous) {
        await upgradeAnonymousWithApple();
        router.replace('/home');
      } else {
        await signInWithApple();
        router.replace('/home');
      }
    } catch (error: any) {
      if (error instanceof CredentialCollisionError) {
        setCollisionError(error);
      } else if (error.message && error.message !== "User cancelled") {
        Alert.alert("Error", error.message);
      }
      // User cancelled - do nothing, stay on current page
    } finally {
      setAppleLoading(false);
    }
  };

  const handleSkipLogin = async () => {
    // If user is already signed in (anonymous or otherwise), just go back
    if (user) {
      router.back();
      return;
    }

    try {
      await signInAnonymously();
      // Navigate to main app after successful anonymous sign-in
      router.replace('/home');
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  // Collision modal handler - show switch confirmation modal
  const handleCollisionSignIn = () => {
    setShowSwitchConfirm(true);
  };

  // Handle confirmed account switch - auto sign in with pending credential
  const handleConfirmSwitch = async () => {
    if (!collisionError?.pendingCredential) return;
    try {
      await signInWithPendingCredential(collisionError.pendingCredential);
      setCollisionError(null);
      setShowSwitchConfirm(false);
      router.replace('/home');
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to sign in");
    }
  };

  // Cancel switch - go back to collision modal
  const handleCancelSwitch = () => {
    setShowSwitchConfirm(false);
  };

  const heroGradient = isDark
    ? ([theme.colors.gray[100], theme.colors.background] as [string, string])
    : ([theme.colors.primaryLight, theme.colors.background] as [
        string,
        string,
      ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={heroGradient}
          style={styles.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <AnimatedView delay={0} duration={600}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="leaf" size={40} color={theme.colors.primary} />
              </View>
            </View>
          </AnimatedView>

          <AnimatedView delay={100} duration={600}>
            <Text style={styles.title}>Calmdemy</Text>
          </AnimatedView>

          <AnimatedView delay={200} duration={600}>
            <Text style={styles.subtitle}>Find your inner peace</Text>
          </AnimatedView>
        </LinearGradient>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <AnimatedView delay={300} duration={500}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {isLinkMode
                  ? "Link Your Account"
                  : isSignUp
                  ? "Create Account"
                  : "Welcome Back"}
              </Text>
              <Text style={styles.formSubtitle}>
                {isLinkMode
                  ? "Connect a sign-in method to secure your subscription"
                  : isSignUp
                  ? "Start your mindfulness journey today"
                  : "Continue your mindfulness journey"}
              </Text>
            </View>
          </AnimatedView>

          {/* Google Sign In Button */}
          <AnimatedView delay={400} duration={500}>
            <AnimatedPressable
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
              style={styles.googleButton}
            >
              <View style={styles.googleButtonInner}>
                {googleLoading ? (
                  <ActivityIndicator color={theme.colors.text} size="small" />
                ) : (
                  <>
                    <View style={styles.googleIconContainer}>
                      <SvgXml xml={googleIconSvg} width={35} height={35} />
                    </View>
                    <Text style={styles.googleButtonText}>
                      {isLinkMode ? "Link with Google" : "Continue with Google"}
                    </Text>
                  </>
                )}
              </View>
            </AnimatedPressable>
          </AnimatedView>

          {/* Apple Sign In Button - iOS only */}
          {isAppleSignInAvailable && (
            <AnimatedView delay={500} duration={500}>
              <AnimatedPressable
                onPress={handleAppleSignIn}
                disabled={appleLoading}
                style={styles.appleButton}
              >
                <View style={styles.appleButtonInner}>
                  {appleLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="logo-apple" size={20} color="#fff" />
                      <Text style={styles.appleButtonText}>
                        {isLinkMode ? "Link with Apple" : "Continue with Apple"}
                      </Text>
                    </>
                  )}
                </View>
              </AnimatedPressable>
            </AnimatedView>
          )}

          {/* Link mode info banner */}
          {isLinkMode && (
            <AnimatedView delay={600} duration={500}>
              <View style={styles.linkInfoBanner}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.linkInfoText}>
                  Linking preserves your subscription and data. Choose a sign-in method you'll remember.
                </Text>
              </View>
            </AnimatedView>
          )}

          {/* Divider */}
          <AnimatedView delay={600} duration={500}>
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </AnimatedView>

          {/* Email / Password */}
          <AnimatedView delay={700} duration={500}>
                <View
                  style={[
                    styles.inputContainer,
                    emailFocused && styles.inputContainerFocused,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={
                      emailFocused ? theme.colors.primary : theme.colors.textMuted
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </AnimatedView>

              <AnimatedView delay={800} duration={500}>
                <View
                  style={[
                    styles.inputContainer,
                    passwordFocused && styles.inputContainerFocused,
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={
                      passwordFocused
                        ? theme.colors.primary
                        : theme.colors.textMuted
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </View>
              </AnimatedView>

          <AnimatedView delay={900} duration={500}>
            <AnimatedPressable
              onPress={handleAuth}
              disabled={loading}
              style={styles.authButton}
            >
              <Animated.View
                style={[
                  styles.authButtonInner,
                  { transform: [{ scale: buttonScale }] },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Text style={styles.authButtonText}>
                      {isLinkMode
                        ? "Link with Email"
                        : isSignUp
                        ? "Create Account"
                        : "Sign In"}
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </>
                )}
              </Animated.View>
            </AnimatedPressable>
          </AnimatedView>

          {/* Toggle between Sign Up / Sign In - hide in link mode */}
          {!isLinkMode && (
            <AnimatedView delay={1000} duration={500}>
              <AnimatedPressable
                onPress={() => setIsSignUp(!isSignUp)}
                style={styles.switchButton}
              >
                <Text style={styles.switchText}>
                  {isSignUp
                    ? "Already have an account? "
                    : "Don't have an account? "}
                  <Text style={styles.switchTextHighlight}>
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </Text>
                </Text>
              </AnimatedPressable>
            </AnimatedView>
          )}
          
          {/* Link mode helper text */}
          {isLinkMode && (
            <AnimatedView delay={1000} duration={500}>
              <Text style={styles.linkHelperText}>
                Enter a new email and password to secure your account. If the email is already in use, you'll be prompted to sign in to that account instead.
              </Text>
            </AnimatedView>
          )}
        </View>
      </ScrollView>

      {/* Skip/Close Button - rendered AFTER ScrollView to ensure it's on top */}
      <View style={styles.skipButton}>
        <AnimatedPressable
          onPress={handleSkipLogin}
          style={styles.skipButtonInner}
        >
          <Ionicons name="close" size={24} color={theme.colors.textMuted} />
        </AnimatedPressable>
      </View>
      
      {/* Credential collision modal */}
      {collisionError && !showSwitchConfirm && (
        <CredentialCollisionModal
          visible={!!collisionError && !showSwitchConfirm}
          onClose={() => setCollisionError(null)}
          providerType={collisionError.providerType}
          pendingCredential={collisionError.pendingCredential}
          email={collisionError.email}
          onSignInToOtherAccount={handleCollisionSignIn}
          onUseDifferentMethod={() => setCollisionError(null)}
        />
      )}

      {/* Account switch confirmation modal */}
      {collisionError && showSwitchConfirm && (
        <AccountSwitchConfirmModal
          visible={showSwitchConfirm}
          email={collisionError.email}
          providerType={collisionError.providerType}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    skipButton: {
      position: "absolute",
      top: 60,
      right: 20,
      zIndex: 100,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      elevation: 10,
      ...theme.shadows.sm,
    },
    skipButtonInner: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    scrollContent: {
      flexGrow: 1,
    },
    hero: {
      paddingTop: 80,
      paddingBottom: 60,
      alignItems: "center",
    },
    logoContainer: {
      marginBottom: theme.spacing.lg,
    },
    logoCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      ...theme.shadows.md,
    },
    title: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 36,
      color: theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: theme.spacing.xs,
    },
    subtitle: {
      fontFamily: theme.fonts.body.italic,
      fontSize: 16,
      color: theme.colors.textLight,
    },
    formContainer: {
      flex: 1,
      padding: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
    },
    formHeader: {
      marginBottom: theme.spacing.xl,
    },
    formTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 24,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    formSubtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textLight,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      borderWidth: 2,
      borderColor: "transparent",
      ...theme.shadows.sm,
    },
    inputContainerFocused: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark
        ? theme.colors.gray[100]
        : theme.colors.surfaceElevated,
    },
    inputIcon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.text,
      paddingVertical: theme.spacing.md,
    },
    authButton: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    authButtonInner: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
      ...theme.shadows.md,
    },
    authButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "white",
    },
    switchButton: {
      alignItems: "center",
      paddingVertical: theme.spacing.md,
    },
    switchText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
    },
    switchTextHighlight: {
      fontFamily: theme.fonts.ui.semiBold,
      color: theme.colors.primary,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: theme.spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textMuted,
      paddingHorizontal: theme.spacing.md,
    },
    googleButton: {
      marginBottom: theme.spacing.md,
      alignSelf: "stretch",
    },
    googleButtonInner: {
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.full,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      ...theme.shadows.sm,
    },
    googleIconContainer: {
      width: 35,
      height: 35,
      borderRadius: 16,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      ...theme.shadows.sm,
    },
    googleButtonText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 17,
      color: theme.colors.text,
    },
    appleButton: {
      marginBottom: theme.spacing.sm,
      alignSelf: "stretch",
    },
    appleButtonInner: {
      backgroundColor: "#000",
      paddingVertical: theme.spacing.md + 2,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.full,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    appleButtonText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 17,
      color: "#fff",
    },
    linkInfoBanner: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: `${theme.colors.primary}10`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    linkInfoText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      lineHeight: 20,
    },
    linkHelperText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
      marginTop: theme.spacing.md,
    },
  });
