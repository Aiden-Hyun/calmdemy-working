/**
 * ============================================================
 * PremiumGate.tsx — Content Gatekeeper for Premium Features (Gatekeeper Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   Implements the Gatekeeper pattern to restrict premium content from
 *   non-subscribed users. Provides three modes:
 *     1. Transparent pass-through for free content or subscribed users
 *     2. Badge-only mode: shows small lock badge on content
 *     3. Full block: prevents content preview, shows unlock CTA
 *
 * Design Patterns:
 *   - Gatekeeper Pattern: Single checkpoint that validates subscription
 *     status before rendering premium content
 *   - Wrapper/Decorator: PremiumGate wraps any content and modifies its
 *     presentation based on subscription state (transparent, badge, or overlay)
 *   - Higher-Order Component: Could be refactored to HOC for composition
 *   - Strategy Pattern: Different render strategies (passthrough, badge, overlay)
 *     based on isPremium and showBadgeOnly props
 *
 * Key Dependencies:
 *   - usePremiumAccess (subscription context: checks access via subscription)
 *   - useSubscription (global subscription state)
 *   - PaywallModal (component for purchase flow)
 *
 * Consumed By:
 *   Any content that should be restricted to premium subscribers
 *   (library items, advanced meditation guides, etc.)
 * ============================================================
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSubscription, usePremiumAccess } from "../contexts/SubscriptionContext";
import { useTheme } from "../contexts/ThemeContext";
import { PaywallModal } from "./PaywallModal";
import { Theme } from "../theme";

interface PremiumGateProps {
  children: React.ReactNode;
  isPremium?: boolean;
  /** Show inline lock badge instead of blocking content */
  showBadgeOnly?: boolean;
  /** Callback when premium content is accessed */
  onAccessGranted?: () => void;
  style?: ViewStyle;
}

/**
 * PremiumGate — Content access controller for subscription features.
 *
 * This is a Gatekeeper/Decorator pattern implementation. It wraps content
 * and modifies its presentation based on subscription status:
 *
 *   1. If !isPremium OR canAccess: render children as-is (free content or subscriber)
 *   2. If isPremium && !canAccess && showBadgeOnly: render children + lock badge
 *   3. If isPremium && !canAccess && !showBadgeOnly: show full lock overlay
 *
 * The PaywallModal is conditionally rendered in both restricted cases to
 * allow users to upgrade when they tap a premium feature.
 */
export function PremiumGate({
  children,
  isPremium = false,
  showBadgeOnly = false,
  onAccessGranted,
  style,
}: PremiumGateProps) {
  // --- Check if user has access based on subscription status ---
  const { canAccess, isLoading } = usePremiumAccess(isPremium);
  // --- Local state to control paywall visibility ---
  const [showPaywall, setShowPaywall] = useState(false);

  /*
    --- Strategy 1: Free content or subscriber has access ---
    Render children directly without any gating. This is the happy path
    for both free content and users with active subscriptions.
  */
  if (!isPremium || canAccess) {
    return <>{children}</>;
  }

  /*
    --- Strategy 2: Premium content, no access, badge-only mode ---
    Render the content with a small lock badge overlay. This allows users
    to see a preview of what they're missing and tap the badge to unlock.
    Used for library cards, content previews, etc.
  */
  if (showBadgeOnly) {
    return (
      <View style={style}>
        {children}
        <PremiumBadge onPress={() => setShowPaywall(true)} />
        <PaywallModal
          visible={showPaywall}
          onClose={() => setShowPaywall(false)}
          onSuccess={onAccessGranted}
        />
      </View>
    );
  }

  /*
    --- Strategy 3: Premium content, no access, full block ---
    Show a lock overlay that prevents content preview. Users must
    tap to see the paywall. Used for full-screen premium features
    that shouldn't show a preview.
  */
  return (
    <View style={style}>
      <PremiumLockOverlay onUnlock={() => setShowPaywall(true)} />
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onSuccess={onAccessGranted}
      />
    </View>
  );
}

/**
 * PremiumBadge — Small lock badge for premium content cards.
 *
 * A small, tappable badge that appears in the corner of a card to indicate
 * premium content. Tapping opens the paywall. Only shown to non-premium users
 * (premium subscribers never see the badge).
 *
 * Props:
 *   - size: "small" (icon only, 10px) or "medium" (icon + text, 14px)
 *   - onPress: callback when user taps the badge
 */
interface PremiumBadgeProps {
  onPress?: () => void;
  size?: "small" | "medium";
}

export function PremiumBadge({ onPress, size = "small" }: PremiumBadgeProps) {
  const { theme } = useTheme();
  const { isPremium } = useSubscription();

  // --- Hide badge for premium subscribers (they have access) ---
  if (isPremium) return null;

  // --- Responsive sizing based on card context ---
  const iconSize = size === "small" ? 10 : 14;
  const padding = size === "small" ? 4 : 6;

  return (
    <TouchableOpacity
      style={[
        styles.badge,
        {
          padding,
          backgroundColor: theme.colors.secondary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="lock-closed" size={iconSize} color="#fff" />
      {/*
        --- Conditional label: shown only in "medium" mode ---
        Small badges are icon-only; medium badges include text label
      */}
      {size === "medium" && (
        <Text style={[styles.badgeText, { marginLeft: 4 }]}>Premium</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * PremiumLockOverlay — Full-screen lock overlay blocking premium content.
 *
 * This overlay blocks content completely, showing a gradient background,
 * lock icon, and "Unlock Premium" button. Used when the content is premium
 * and the user should not see a preview (full blocking strategy).
 *
 * The gradient background (primary color faded) ties visually to the app's
 * premium feature theme.
 */
interface PremiumLockOverlayProps {
  onUnlock: () => void;
}

function PremiumLockOverlay({ onUnlock }: PremiumLockOverlayProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createOverlayStyles(theme, isDark), [theme, isDark]);

  return (
    // --- Gradient background: visual premium treatment ---
    <LinearGradient
      colors={[`${theme.colors.primary}15`, `${theme.colors.primary}30`]}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Lock icon in a circular container */}
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={32} color={theme.colors.primary} />
        </View>
        <Text style={styles.title}>Premium Content</Text>
        <Text style={styles.subtitle}>
          Subscribe to unlock this content and get access to everything.
        </Text>

        {/*
          --- Unlock Button: CTA to open paywall ---
          Gradient button with sparkles icon emphasizes the premium nature
          of the feature.
        */}
        <TouchableOpacity style={styles.unlockButton} onPress={onUnlock}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            style={styles.unlockButtonGradient}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
            <Text style={styles.unlockButtonText}>Unlock Premium</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

/**
 * useContentAccess — Hook for checking content access permission.
 *
 * A convenience hook that wraps subscription state and provides a method
 * to check if premium content should be accessible. Returns a complete
 * access state object including canAccess, isLoading, and the paywall
 * visibility state for composing custom access logic.
 *
 * This is a Custom Hook pattern that encapsulates the subscription context
 * integration, reducing boilerplate in feature components.
 *
 * @param isPremiumContent - Whether this content requires a premium subscription
 * @returns Object with canAccess, isLoading, showPaywall, setShowPaywall, and handleAccess
 */
export function useContentAccess(isPremiumContent: boolean) {
  const { isPremium, isLoading } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  /**
   * Checks if the user should be allowed to access the content.
   * If content is premium and user is not premium, opens paywall and returns false.
   * Otherwise returns true.
   */
  const handleAccess = () => {
    if (isPremiumContent && !isPremium) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  return {
    canAccess: !isPremiumContent || isPremium,
    isLoading,
    showPaywall,
    setShowPaywall,
    handleAccess,
  };
}

/**
 * Static styles for premium badge.
 * Positioned absolutely in top-right corner of card.
 */
const styles = StyleSheet.create({
  // --- Small badge positioned in top-right corner of card ---
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: "DMSans-SemiBold",
    fontSize: 11,
    color: "#fff",
  },
});

/**
 * createOverlayStyles — Stylesheet factory for lock overlay.
 *
 * Creates theme-aware styles for the PremiumLockOverlay component.
 * Memoized via useMemo to ensure stable object reference.
 */
const createOverlayStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Full-screen container with gradient background ---
    container: {
      flex: 1,
      minHeight: 200,
      borderRadius: theme.borderRadius.xl,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    content: {
      alignItems: "center",
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
      color: theme.colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 20,
      paddingHorizontal: 16,
    },
    unlockButton: {
      borderRadius: theme.borderRadius.lg,
      overflow: "hidden",
    },
    unlockButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 24,
      gap: 8,
    },
    unlockButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: "#fff",
    },
  });
