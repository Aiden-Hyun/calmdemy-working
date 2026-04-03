import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import {
  useSubscription,
  PurchasesPackage,
} from "../contexts/SubscriptionContext";
import { AccountPromptModal } from "./AccountPromptModal";
import { RecoveryWizard } from "./RecoveryWizard";
import { Theme } from "../theme";

/**
 * ============================================================
 * PaywallModal.tsx — Subscription Purchase & Recovery UI
 * ============================================================
 *
 * Architectural Role:
 *   A modal that presents subscription options and handles purchase/recovery flows.
 *   This is a Compound Component: it orchestrates multiple sub-modals (AccountPromptModal,
 *   RecoveryWizard) based on user actions. It implements a State Machine with
 *   conditional UI rendering for different scenarios:
 *   1. Standard purchase flow (choose plan → purchase)
 *   2. Recovery flow (Apple ID has subscription → restore/recover)
 *   3. Loading state (fetching offerings)
 *   4. Error state (no plans available)
 *
 * Design Patterns:
 *   - State Machine: shouldShowRecoveryFirst determines which UI path to show.
 *     This is a Gatekeeper pattern — if Apple ID has a subscription, guide the
 *     user to recovery before showing purchase options.
 *   - Controlled Component: Package selection state (selectedPackage) is local
 *     but synchronous with purchase/restore actions.
 *   - Compound Component: AccountPromptModal and RecoveryWizard are child modals
 *     triggered by parent actions. This implements the Inversion of Control pattern:
 *     the parent modal controls when child modals appear based on flow state.
 *
 * Key Dependencies:
 *   - useSubscription() hook: RevenueCat integration (offerings, purchase, restore)
 *   - useAuth() hook: Check if user is anonymous
 *   - SubscriptionContext: Subscription state and actions
 *
 * Consumed By:
 *   Premium gate screens, paywall entry points (when user taps "Unlock Premium")
 *
 * Note on Recovery-First UI:
 *   If hasActiveSubscriptionOnAppleId() is true AND user is not premium,
 *   the modal shows a special recovery prompt first. This guides the user to
 *   recover their lost subscription before offering new purchase options.
 *   This is a Gatekeeper checkpoint: recovery takes priority over new purchases.
 * ============================================================
 */

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * Feature list for the premium tier — displayed as benefits in the modal.
 * This is a data-driven presentation: if the feature list changes, just update
 * this array; the component renders it generically.
 */
const FEATURES = [
  { icon: "infinite-outline", text: "Unlimited meditations & courses" },
  { icon: "moon-outline", text: "All sleep content & stories" },
  { icon: "musical-notes-outline", text: "Full music & sound library" },
  { icon: "cloud-download-outline", text: "Offline downloads" },
  { icon: "sparkles-outline", text: "New content weekly" },
];

/**
 * PaywallModal — Modal UI for subscription purchase and recovery.
 *
 * This modal handles multiple flows:
 *   1. Standard purchase: User browses plans and subscribes
 *   2. Recovery-first: User's Apple ID has a subscription → guide them to recover it first
 *   3. Account prompt: After purchase, anonymous users are prompted to create an account
 *   4. Loading/error states: Offerings not yet loaded, or no plans available
 *
 * @param visible - Whether the modal is shown
 * @param onClose - Callback to close the modal (does not trigger success flow)
 * @param onSuccess - Optional callback when purchase/recovery succeeds
 */
export function PaywallModal({
  visible,
  onClose,
  onSuccess,
}: PaywallModalProps) {
  const { theme, isDark } = useTheme();
  const { isAnonymous } = useAuth();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const {
    currentOffering,
    purchasePackage,
    restorePurchasesWithRecovery,
    isLoading,
    hasActiveSubscriptionOnAppleId,
    isPremium,
  } = useSubscription();

  // Local UI state: which package is currently selected
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);

  // Loading flag during purchase/restore action (prevents double-taps)
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Child modal visibility flags (Compound Component pattern)
  const [showAccountPrompt, setShowAccountPrompt] = useState(false);
  const [showRecoveryWizard, setShowRecoveryWizard] = useState(false);

  /**
   * --- State Machine: Recovery-First UI Gate (Gatekeeper Pattern) ---
   * If the user's Apple ID (device) has an active subscription, but the current
   * app account doesn't own it, we show a recovery prompt first.
   * This prevents the user from purchasing a new plan when they already have one.
   * Only show standard purchase UI if NOT in recovery-first mode.
   */
  const shouldShowRecoveryFirst = hasActiveSubscriptionOnAppleId() && !isPremium;

  /**
   * Extract monthly and annual packages from RevenueCat offering.
   * RevenueCat may provide them in standard properties (monthly, annual) or
   * we may need to search availablePackages by identifier. Try both patterns
   * for compatibility with different RevenueCat configurations.
   */
  const monthlyPackage = currentOffering?.monthly ||
    currentOffering?.availablePackages?.find(p =>
      p.identifier === '$rc_monthly' ||
      p.identifier.toLowerCase().includes('monthly')
    );
  const annualPackage = currentOffering?.annual ||
    currentOffering?.availablePackages?.find(p =>
      p.identifier === '$rc_annual' ||
      p.identifier.toLowerCase().includes('annual') ||
      p.identifier.toLowerCase().includes('yearly')
    );

  // Check if offerings are available (at least one plan to display)
  const hasPackages = monthlyPackage || annualPackage;

  // Loading state: offerings still being fetched from RevenueCat
  const isLoadingOfferings = isLoading && !currentOffering;

  /**
   * Calculate annual savings percentage as a marketing incentive.
   * Shows savings badge on annual plan if monthly * 12 > annual price.
   * Memoized because it depends on mutable package objects from RevenueCat.
   *
   * @returns Savings percentage (e.g., 17) or null if no savings or packages unavailable
   */
  const annualSavings = useMemo(() => {
    if (!monthlyPackage || !annualPackage) return null;
    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    const yearlyIfMonthly = monthlyPrice * 12;
    const savings = Math.round(((yearlyIfMonthly - annualPrice) / yearlyIfMonthly) * 100);
    return savings > 0 ? savings : null;
  }, [monthlyPackage, annualPackage]);

  /**
   * Initiates a purchase of the selected package via RevenueCat.
   * On success, triggers the onSuccess callback and potentially shows
   * an account creation prompt for anonymous users (Compound Component).
   * Loading state prevents double-taps during the async purchase.
   */
  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    const success = await purchasePackage(selectedPackage);
    setIsPurchasing(false);

    if (success) {
      onSuccess?.();
      onClose();
      // Compound Component: Show account prompt modal for anonymous users after successful purchase
      // This guides them to create a permanent account to protect their subscription
      if (isAnonymous) {
        setShowAccountPrompt(true);
      }
    }
  };

  /**
   * Attempts to restore purchases from the App Store/Play Store.
   * If successful, the user's existing subscription is claimed by the current account.
   * If a subscription exists on the device but belongs to a different account,
   * restorePurchasesWithRecovery returns showRecoveryWizard=true, triggering the
   * recovery flow (Compound Component).
   */
  const handleRestore = async () => {
    setIsPurchasing(true);
    const result = await restorePurchasesWithRecovery();
    setIsPurchasing(false);

    if (result.success) {
      // Subscription successfully restored to current account
      onSuccess?.();
      onClose();
    } else if (result.showRecoveryWizard) {
      // Subscription exists on Apple ID but belongs to different account.
      // Show recovery wizard to help user sign in with the correct account.
      // This is a State Machine transition: restore failed → recovery flow.
      setShowRecoveryWizard(true);
    }
  };

  /**
   * Callback when the recovery wizard succeeds.
   * Triggers the success callback and closes both modals.
   */
  const handleRecoverySuccess = () => {
    setShowRecoveryWizard(false);
    onSuccess?.();
    onClose();
  };

  /**
   * Opens the device's mail app with a pre-filled support email.
   * Used for users who need manual intervention (e.g., account recovery issues).
   * This is a Facade pattern: hides the complexity of URI encoding and deep linking.
   */
  const handleContactSupport = () => {
    const subject = encodeURIComponent("Subscription Help");
    const body = encodeURIComponent(
      "Hi,\n\nI need help with my subscription.\n\nThank you"
    );
    Linking.openURL(
      `mailto:support@calmnest.app?subject=${subject}&body=${body}`
    );
  };

  /**
   * Formats a package's price into a display string (e.g., "$9.99/month").
   * Handles undefined packages gracefully by returning "...".
   */
  const formatPrice = (pkg: PurchasesPackage | undefined, period: string) => {
    if (!pkg) return "...";
    return `${pkg.product.priceString}/${period}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Close button — Available in all states */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={theme.colors.textLight} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* --- Render Phase 1: Hero Section (Always shown) --- */}
          {/* Icon, title, and benefit description to set context for the offer */}
          <View style={styles.hero}>
            <LinearGradient
              colors={[theme.colors.primaryLight, theme.colors.primary]}
              style={styles.iconContainer}
            >
              <Ionicons name="leaf" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>Unlock Calmdemy Premium</Text>
            <Text style={styles.subtitle}>
              Get unlimited access to all meditations, sleep content, and more.
            </Text>
          </View>

          {/* --- Render Phase 2: Feature List (Always shown) --- */}
          {/* Data-driven list of premium benefits. Rendered generically from FEATURES array. */}
          <View style={styles.featuresContainer}>
            {FEATURES.map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon as any}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>

          {/* --- Render Phase 3: State Machine — Recovery-First Path (Gatekeeper) --- */}
          {/* If Apple ID has an active subscription but current account doesn't,
              show recovery prompt instead of purchase options. This is the Gatekeeper
              pattern: recovery takes priority to prevent duplicate purchases. */}
          {shouldShowRecoveryFirst && (
            <View style={styles.recoveryContainer}>
              <View style={styles.recoveryIconContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color={theme.colors.warning}
                />
              </View>
              <Text style={styles.recoveryTitle}>
                You already have an active subscription
              </Text>
              <Text style={styles.recoveryDescription}>
                This Apple ID has a Calmdemy subscription, but it's linked to a
                different account. Recover access to continue using premium
                features.
              </Text>
              <TouchableOpacity
                style={styles.recoveryButton}
                onPress={() => setShowRecoveryWizard(true)}
              >
                <Ionicons name="key-outline" size={20} color="#fff" />
                <Text style={styles.recoveryButtonText}>
                  Recover My Subscription
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.recoveryHelpButton}
                onPress={handleContactSupport}
              >
                <Text style={styles.recoveryHelpText}>Contact Support</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* --- Render Phase 4: State Machine — Purchase Path (Non-Recovery) --- */}
          {/* Only show purchase options if NOT in recovery-first mode.
              This section has three sub-states: loading, error, or display packages.
              Each sub-state is mutually exclusive (only one renders at a time). */}
          {!shouldShowRecoveryFirst && (
          <View style={styles.optionsContainer}>
            {/* --- Sub-State 1: Loading State --- */}
            {/* Offerings are being fetched from RevenueCat (async operation) */}
            {isLoadingOfferings && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>
                  Loading subscription plans...
                </Text>
              </View>
            )}

            {/* --- Sub-State 2: Error State (No Plans Available) --- */}
            {/* RevenueCat returned no plans, or they failed to load.
                Show error message and allow user to close or retry (contact support). */}
            {!isLoadingOfferings && !hasPackages && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
                <Text style={styles.errorTitle}>Plans Unavailable</Text>
                <Text style={styles.errorText}>
                  Subscription plans are temporarily unavailable. Please try again later or contact support.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={onClose}
                >
                  <Text style={styles.retryButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* --- Sub-State 3: Success State (Plans Available) --- */}
            {/* Annual Plan Option */}
            {annualPackage && (
              <Pressable
                style={[
                  styles.optionCard,
                  selectedPackage?.identifier === annualPackage.identifier &&
                    styles.optionCardSelected,
                ]}
                onPress={() => setSelectedPackage(annualPackage)}
              >
                {/* Savings badge — only shown if annual is cheaper than monthly*12 (marketing incentive) */}
                {annualSavings && (
                  <View style={styles.savingsBadge}>
                    <Text style={styles.savingsText}>Save {annualSavings}%</Text>
                  </View>
                )}
                <View style={styles.optionContent}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Annual</Text>
                    <Text style={styles.optionPrice}>
                      {formatPrice(annualPackage, "year")}
                    </Text>
                    {/* Trial period badge — visual affordance for the trial offer */}
                    <View style={styles.trialBadge}>
                      <Ionicons name="gift-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.trialText}>14-day free trial</Text>
                    </View>
                  </View>
                  {/* Radio button — visual selection indicator */}
                  <View
                    style={[
                      styles.radioOuter,
                      selectedPackage?.identifier === annualPackage.identifier &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {/* Inner dot only rendered when this plan is selected */}
                    {selectedPackage?.identifier === annualPackage.identifier && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </Pressable>
            )}

            {/* Monthly Plan Option */}
            {monthlyPackage && (
              <Pressable
                style={[
                  styles.optionCard,
                  selectedPackage?.identifier === monthlyPackage.identifier &&
                    styles.optionCardSelected,
                ]}
                onPress={() => setSelectedPackage(monthlyPackage)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>Monthly</Text>
                    <Text style={styles.optionPrice}>
                      {formatPrice(monthlyPackage, "month")}
                    </Text>
                    <View style={styles.trialBadge}>
                      <Ionicons name="gift-outline" size={12} color={theme.colors.primary} />
                      <Text style={styles.trialText}>7-day free trial</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedPackage?.identifier === monthlyPackage.identifier &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {selectedPackage?.identifier === monthlyPackage.identifier && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>
              </Pressable>
            )}
          </View>
          )}
        </ScrollView>

        {/* --- Render Phase 5: Bottom Action Buttons --- */}
        {/* Different button layout for recovery-first vs. purchase flow */}
        <View
          style={[styles.bottomContainer, { paddingBottom: insets.bottom + 16 }]}
        >
          {!shouldShowRecoveryFirst && (
            <>
              {/* Purchase Button — Only enabled if a plan is selected and not already purchasing */}
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (!selectedPackage || isPurchasing) &&
                    styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!selectedPackage || isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {selectedPackage ? "Subscribe Now" : "Select a Plan"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Restore Button — Allows users who already purchased to restore on a new device */}
              <TouchableOpacity
                style={styles.restoreButton}
                onPress={handleRestore}
                disabled={isPurchasing}
              >
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
              </TouchableOpacity>

              {/* Legal Text — Subscription terms */}
              <Text style={styles.legalText}>
                Cancel anytime. Subscription auto-renews until cancelled.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* --- Compound Component: Account Prompt Modal --- */}
      {/* Shown to anonymous users after successful purchase.
          This prompts them to create an account to protect their subscription.
          Child modal is controlled by this parent's state. */}
      <AccountPromptModal
        visible={showAccountPrompt}
        onClose={() => setShowAccountPrompt(false)}
      />

      {/* --- Compound Component: Recovery Wizard Modal --- */}
      {/* Shown when:
          1. User taps "Recover My Subscription" in recovery-first UI
          2. Or when "Restore Purchases" finds a subscription on device
             but belonging to a different account.
          This is a multi-step modal that guides the user to sign in
          with the correct account. Child modal is controlled by parent. */}
      <RecoveryWizard
        visible={showRecoveryWizard}
        onClose={() => setShowRecoveryWizard(false)}
        onSuccess={handleRecoverySuccess}
      />
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
      paddingBottom: 24,
    },
    hero: {
      alignItems: "center",
      marginBottom: 32,
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    title: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 28,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: 16,
    },
    featuresContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 20,
      marginBottom: 24,
      ...theme.shadows.sm,
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    featureText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
    },
    optionsContainer: {
      gap: 12,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 16,
    },
    loadingText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textLight,
    },
    errorContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      gap: 12,
    },
    errorTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    errorText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 20,
    },
    retryButton: {
      marginTop: 8,
      paddingVertical: 10,
      paddingHorizontal: 24,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    retryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: "#fff",
    },
    optionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: 20,
      borderWidth: 2,
      borderColor: "transparent",
      ...theme.shadows.sm,
    },
    optionCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}08`,
    },
    optionContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    optionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: 4,
    },
    optionInfo: {
      flex: 1,
    },
    optionPrice: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textLight,
    },
    trialBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 8,
      gap: 4,
    },
    trialText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.primary,
    },
    savingsBadge: {
      position: "absolute",
      top: -10,
      right: 16,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    savingsText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 12,
      color: "#fff",
    },
    radioOuter: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.colors.gray[300],
      alignItems: "center",
      justifyContent: "center",
    },
    radioOuterSelected: {
      borderColor: theme.colors.primary,
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme.colors.primary,
    },
    bottomContainer: {
      paddingHorizontal: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.gray[200],
      backgroundColor: theme.colors.background,
    },
    purchaseButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 18,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 12,
    },
    purchaseButtonDisabled: {
      backgroundColor: theme.colors.gray[300],
    },
    purchaseButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: "#fff",
    },
    restoreButton: {
      paddingVertical: 12,
      alignItems: "center",
    },
    restoreButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.primary,
    },
    legalText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: "center",
      marginTop: 8,
    },
    // Recovery-first styles
    recoveryContainer: {
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: 32,
      ...theme.shadows.sm,
    },
    recoveryIconContainer: {
      marginBottom: 16,
    },
    recoveryTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: theme.colors.text,
      textAlign: "center",
      marginBottom: 12,
    },
    recoveryDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 24,
    },
    recoveryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.lg,
      paddingVertical: 16,
      paddingHorizontal: 24,
      width: "100%",
      gap: 8,
      marginBottom: 12,
    },
    recoveryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "#fff",
    },
    recoveryHelpButton: {
      paddingVertical: 12,
    },
    recoveryHelpText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
  });
