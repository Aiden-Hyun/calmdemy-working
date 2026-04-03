import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * Skeleton.tsx — Skeleton Screen Components (Presentational)
 * ============================================================
 *
 * Architectural Role:
 *   Implements the Skeleton Screen pattern, a Progressive Loading
 *   technique that shows placeholder shapes while real content loads.
 *   This provides visual feedback and reduces perceived latency,
 *   making the app feel faster and more responsive.
 *
 * Design Patterns:
 *   - Skeleton Screen: Placeholder views mimic the shape of content
 *     (cards, text lines, avatars) with a subtle shimmer animation.
 *   - Composite Components: SkeletonCard, SkeletonText, etc. are
 *     pre-composed variations for common layout patterns.
 *   - Progressive Loading: Skeleton shows while content loads via
 *     React Query. Once data arrives, real content replaces skeleton.
 *   - Shimmer Effect: Animated opacity pulse (interpolation) creates
 *     a gentle "loading" sensation without heavy motion.
 *
 * Key Dependencies:
 *   - useTheme() (theme colors for placeholder styling)
 *   - Animated API (shimmer loop)
 * ============================================================
 */

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton — Base Placeholder Component
 *
 * Renders a placeholder rectangle with optional border radius.
 * The shimmer animation gives the illusion of loading activity.
 * Used as the building block for all skeleton variations.
 */
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // --- Shimmer Loop Animation ---
  useEffect(() => {
    const animation = Animated.loop(
      // --- Sequence: Fade Up, then Down ---
      // Creates a pulsing effect: 0.3 → 0.7 → 0.3
      // This mimics a "shimmer" or "breathing" sensation, signaling
      // that content is still loading without being distracting.
      Animated.sequence([
        // Fade to bright (0.7 opacity)
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        // Fade to dim (0.3 opacity)
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  // --- Opacity Interpolation ---
  // Maps the 0-1 value from shimmerAnim to 0.3-0.7 opacity range.
  // At 0 (dim), opacity is 0.3. At 1 (bright), opacity is 0.7.
  // This creates a perceptible but subtle pulsing effect.
  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.container, { width, height, borderRadius }, style]}>
      {/* --- Shimmer Overlay ---
          The animated view that pulses. Its opacity changes while the
          background container stays stable, creating the shimmer illusion. */}
      <Animated.View
        style={[styles.shimmer, { opacity, borderRadius }]}
      />
    </View>
  );
}

// --- Preset Skeleton Variations ---
// These composite components provide common skeleton patterns,
// reducing boilerplate when building loading states.

/**
 * SkeletonText — Multi-Line Text Placeholder
 *
 * Renders multiple horizontal bars to simulate paragraph text.
 * The last line is 70% width if there are multiple lines, creating
 * a natural text-wrapping appearance.
 */
export function SkeletonText({
  lines = 1,
  style,
}: {
  lines?: number;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={14}
          // --- Last Line Width ---
          // If there are multiple lines, the last one is shorter (70% width).
          // This mimics how wrapped text naturally ends before the margin.
          width={index === lines - 1 && lines > 1 ? '70%' : '100%'}
          style={{
            marginBottom: index < lines - 1 ? theme.spacing.sm : 0,
          }}
        />
      ))}
    </View>
  );
}

/**
 * SkeletonCard — Content Card Placeholder
 *
 * Mimics the layout of a typical content card:
 * [Image/Thumbnail]
 * [Title Skeleton]
 * [Subtitle Skeleton]
 */
export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);

  return (
    <View style={[styles.card, style]}>
      {/* Thumbnail placeholder */}
      <Skeleton height={120} borderRadius={theme.borderRadius.lg} />
      <View style={styles.cardContent}>
        {/* Title skeleton (80% width) */}
        <Skeleton
          height={18}
          width="80%"
          style={{ marginBottom: theme.spacing.sm }}
        />
        {/* Subtitle skeleton (60% width) */}
        <Skeleton height={14} width="60%" />
      </View>
    </View>
  );
}

/**
 * SkeletonAvatar — Circular Avatar Placeholder
 *
 * Simple circle, commonly used to represent user profile pictures
 * or small icons in list items.
 */
export function SkeletonAvatar({ size = 48 }: { size?: number }) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={size / 2}
    />
  );
}

/**
 * SkeletonListItem — List Row Placeholder
 *
 * Typical pattern: [Avatar] [Title] [Subtitle]
 * Mimics a list item layout common in feeds, contacts, or message lists.
 */
export function SkeletonListItem({ style }: { style?: ViewStyle }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, false), [theme]);

  return (
    <View style={[styles.listItem, style]}>
      {/* Avatar skeleton on the left */}
      <Skeleton width={56} height={56} borderRadius={12} />
      <View style={styles.listItemContent}>
        {/* Title skeleton */}
        <Skeleton
          height={16}
          width="70%"
          style={{ marginBottom: theme.spacing.xs }}
        />
        {/* Subtitle skeleton */}
        <Skeleton height={12} width="50%" />
      </View>
    </View>
  );
}

// --- Stylesheet Factory ---

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Skeleton Container ---
    // The background is a placeholder color. In dark mode, we use
    // a lighter gray; in light mode, an even lighter gray.
    container: {
      backgroundColor: isDark
        ? theme.colors.gray[200]
        : theme.colors.gray[200],
      overflow: 'hidden',
    },
    // --- Shimmer Overlay ---
    // Slightly darker/lighter than the container, creating contrast.
    // The pulsing opacity creates the shimmer effect.
    shimmer: {
      flex: 1,
      backgroundColor: isDark
        ? theme.colors.gray[300]
        : theme.colors.gray[100],
    },
    // --- Card Skeleton ---
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...theme.shadows.sm,
    },
    cardContent: {
      padding: theme.spacing.lg,
    },
    // --- List Item Skeleton ---
    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    // --- List Item Text Container ---
    // Flex: 1 allows the text area to expand and fill available space.
    listItemContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
  });

