import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "./AnimatedPressable";
import { useTheme } from "../contexts/ThemeContext";
import { useSubscription } from "../contexts/SubscriptionContext";
import { Theme } from "../theme";

/**
 * ============================================================
 * ContentCard.tsx — Multi-Purpose Content Grid Card
 * ============================================================
 *
 * Architectural Role:
 *   A versatile card component used across multiple feature pages to display
 *   content items in a horizontal scrolling grid (meditation courses, sleep stories,
 *   wellness modules). Unlike MeditationCard (rich, full-featured), ContentCard
 *   is simpler and more flexible, supporting optional badges, codes, and subtitle
 *   labels. It integrates with SubscriptionContext to gate premium content.
 *
 * Design Patterns:
 *   - Controlled Theming: Accepts darkMode prop (for sleep page) and adapts
 *     colors accordingly. Uses useTheme() for system dark mode awareness.
 *   - Premium Gating: Reads hasSubscription from SubscriptionContext and
 *     displays a lock badge if content is locked (isFree=false).
 *   - Dynamic Color Tinting: Uses hexToRgba() to colorize card backgrounds
 *     with the fallbackColor at varying opacities, creating visual cohesion.
 *
 * Key Features:
 *   - Thumbnail with fallback icon
 *   - Optional code badge (e.g., "CBT101")
 *   - Optional subtitle label
 *   - Premium lock indicator
 *   - Sleep-page color theme support
 *   - AnimatedPressable for spring feedback on tap
 * ============================================================
 */

/**
 * hexToRgba — Hex Color to RGBA Converter
 *
 * Converts #RRGGBB hex color to rgba(r, g, b, opacity) string.
 * Used to dynamically tint card backgrounds with fallback colors
 * at varying opacity levels for visual cohesion.
 *
 * @param hex - Hex color string (e.g., "#FF5733")
 * @param opacity - Opacity value 0-1 (e.g., 0.07 = 7% opacity)
 * @returns rgba string or original hex if parsing fails
 */
function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export interface ContentCardProps {
  title: string;
  thumbnailUrl?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  fallbackColor?: string;
  meta?: string; // e.g., "10 min" or "3 tracks"
  code?: string; // e.g., "CBT101", "ACT101" - displayed as badge
  subtitle?: string; // e.g., "Module 1 Lesson" - displayed below code badge
  onPress: () => void;
  // For sleep page only (uses sleep-specific colors)
  darkMode?: boolean;
  // Content access: true means free, false means subscription required
  isFree?: boolean;
}

export function ContentCard({
  title,
  thumbnailUrl,
  fallbackIcon = "musical-notes",
  fallbackColor,
  meta,
  code,
  subtitle,
  onPress,
  darkMode = false,
  isFree,
}: ContentCardProps) {
  const { theme, isDark } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();

  // --- Theme Selection Logic ---
  // darkMode = sleep page (uses dedicated sleep color tokens)
  // isDark = system/app-wide dark mode (uses regular dark tokens)
  // These are independent: sleep can be light or dark mode, but always uses sleep colors.
  const isSleepPage = darkMode;
  const isRegularDark = isDark && !darkMode;

  // --- Premium Gate ---
  // Show a lock badge if content requires subscription and user doesn't have it.
  // This is the Gatekeeper pattern applied at the card level.
  const showLock = isFree === false && !hasSubscription;

  const styles = React.useMemo(
    () => createStyles(theme, isSleepPage, isRegularDark),
    [theme, isSleepPage, isRegularDark]
  );

  const accentColor = fallbackColor || theme.colors.primary;

  // --- Card Background Color Selection ---
  // Three distinct strategies depending on context:
  // 1. Sleep page: Use dedicated sleepSurface color for cohesive sleep branding
  // 2. Regular dark mode: Use standard surface (light gray on dark background)
  // 3. Light mode: Use subtle accent tint (7% opacity) for visual hierarchy
  let cardBgColor: string;
  if (isSleepPage) {
    // Sleep page: dedicated surface color
    cardBgColor = theme.colors.sleepSurface;
  } else if (isRegularDark) {
    // Dark mode: standard surface (slightly lighter than background)
    cardBgColor = theme.colors.surface;
  } else {
    // Light mode: subtle tint of the accent color (7% opacity)
    // This creates a gentle, cohesive color hierarchy without overwhelming the design.
    cardBgColor = hexToRgba(accentColor, 0.07);
  }

  return (
    // --- Animated Pressable Wrapper ---
    // Wraps the card with AnimatedPressable for a subtle scale feedback
    // on tap, creating tactile-like interaction feedback.
    <AnimatedPressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: cardBgColor }]}
    >
      {/* --- Thumbnail Container ---
          Position: relative allows the lock badge to overlap absolutely. */}
      <View style={styles.thumbnailContainer}>
        {/* --- Thumbnail or Fallback ---
            If a thumbnail URL is available, display it via Expo Image
            (handles caching and optimization). Otherwise, show a fallback
            icon in a tinted background. */}
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.thumbnail,
              styles.thumbnailPlaceholder,
              { backgroundColor: hexToRgba(accentColor, 0.125) },
            ]}
          >
            <Ionicons name={fallbackIcon} size={40} color={accentColor} />
          </View>
        )}

        {/* --- Premium Lock Badge ---
            Displayed absolutely in the top-right corner if content is
            locked (premium-only). Dark semi-transparent background ensures
            visibility over any thumbnail. */}
        {showLock && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={12} color="#fff" />
          </View>
        )}
      </View>

      {/* --- Code Badge ---
          Optional badge displaying a course code (e.g., "CBT101").
          Tinted background matches the accent color for visual cohesion.
          Only rendered if code prop is provided. */}
      {code && (
        <View style={[styles.codeBadge, { backgroundColor: hexToRgba(accentColor, 0.15) }]}>
          <Text style={[styles.codeText, { color: accentColor }]}>{code}</Text>
        </View>
      )}

      {/* --- Subtitle ---
          Optional label (e.g., "Module 1 Lesson"). Displayed above the title.
          Single-line with ellipsis truncation. Only rendered if subtitle prop
          is provided. */}
      {subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}

      {/* --- Title ---
          Main content label. Centered and bold. Two-line limit to fit
          most titles while preventing extreme truncation. */}
      <Text style={styles.title}>{title}</Text>

      {/* --- Metadata ---
          Secondary information (e.g., "10 min", "3 tracks").
          Aligned below title. Defaults to a space if not provided
          to maintain consistent card height. */}
      <Text style={styles.meta} numberOfLines={1}>
        {meta || " "}
      </Text>
    </AnimatedPressable>
  );
}

// --- Constants ---
// CARD_WIDTH is the fixed width for horizontal scrolling grids.
// Cards are sized for readability in a carousel while allowing multiple
// cards to be visible simultaneously on most devices.
const CARD_WIDTH = 190;
const THUMBNAIL_HEIGHT = 130;

// --- Stylesheet Factory ---
const createStyles = (
  theme: Theme,
  isSleepPage: boolean,
  isRegularDark: boolean
) =>
  StyleSheet.create({
    // --- Card Container ---
    // Fixed width and flexShrink: 0 makes this card a non-flexible item
    // in a horizontal scroll view. Padding centers the content.
    card: {
      width: CARD_WIDTH,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      alignItems: "center",
      flexShrink: 0,
      ...theme.shadows.sm,
    },
    // --- Thumbnail Container ---
    // Fixed height with position: relative to allow absolute positioning
    // of the lock badge. overflow: hidden ensures the thumbnail and badge
    // respect the rounded corners.
    thumbnailContainer: {
      width: "100%",
      height: THUMBNAIL_HEIGHT,
      borderRadius: theme.borderRadius.lg,
      overflow: "hidden",
      position: "relative",
    },
    // --- Lock Badge ---
    // Positioned absolutely in the top-right corner (top: 8, right: 8).
    // Dark semi-transparent background ensures visibility over thumbnails.
    // borderRadius: 12 (half of 24) makes it a perfect circle.
    lockBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
      justifyContent: "center",
    },
    // --- Thumbnail ---
    // Full width and height. When using a real image, contentFit="cover"
    // ensures the image fills the container without distortion.
    thumbnail: {
      width: "100%",
      height: "100%",
    },
    // --- Thumbnail Placeholder ---
    // When no thumbnail URL is provided, this fallback shows an icon
    // centered in a tinted background. Flexbox centering aligns the icon.
    thumbnailPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    // --- Code Badge ---
    // Optional badge displaying a course or content code (e.g., "CBT101").
    // Pill-shaped with horizontal padding. Color is dynamic via inline style.
    codeBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.borderRadius.full,
      marginTop: theme.spacing.sm,
    },
    // --- Code Text ---
    // Small, bold, with letter spacing for a monospaced feel. Color is
    // dynamic (matches the accent color).
    codeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 10,
      letterSpacing: 0.5,
    },
    // --- Subtitle ---
    // Optional label below the thumbnail (e.g., "Module 1 Lesson").
    // Single-line with ellipsis truncation. Color adapts to sleep/dark/light mode.
    subtitle: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 11,
      color: isSleepPage
        ? theme.colors.sleepTextMuted
        : isRegularDark
          ? theme.colors.textLight
          : theme.colors.textMuted,
      textAlign: "center",
      marginTop: 2,
    },
    // --- Title ---
    // Main content label. Centered and bold with line spacing for multi-line text.
    // Color adapts to context (sleep/dark/light).
    title: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      lineHeight: 20,
      color: isSleepPage
        ? theme.colors.sleepText
        : isRegularDark
          ? theme.colors.text
          : theme.colors.text,
      textAlign: "center",
      marginTop: theme.spacing.xs,
    },
    // --- Metadata ---
    // Secondary information (e.g., duration, track count). Smaller and muted.
    // Color adapts to context. Top margin separates from title.
    meta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: isSleepPage
        ? theme.colors.sleepTextMuted
        : isRegularDark
          ? theme.colors.textLight
          : theme.colors.textLight,
      textAlign: "center",
      marginTop: 4,
    },
  });
