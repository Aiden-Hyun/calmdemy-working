import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';
import { GuidedMeditation } from '../types';

/**
 * ============================================================
 * MeditationCard.tsx — Featured Meditation Display Card
 * ============================================================
 *
 * Architectural Role:
 *   A rich, visually prominent card component for displaying individual
 *   meditations. Used in carousels and feature sections to showcase
 *   meditation content with category-specific gradient backgrounds,
 *   metadata (duration, instructor), and favorite toggle.
 *
 * Design Patterns:
 *   - Presentational Component: Receives meditation data and callbacks
 *     but contains no business logic. Pure view composition.
 *   - Category-Based Styling: Uses a switch statement to map meditation
 *     categories to color gradients, making content discovery more
 *     intuitive (users learn to associate colors with categories).
 *   - Compound Gradient: LinearGradient overlay creates depth and
 *     makes white text more readable over image backgrounds.
 *
 * Key Features:
 *   - Dynamic gradient background per category
 *   - Optional thumbnail with fallback icon
 *   - Premium badge indicator (isFree=false)
 *   - Favorite toggle button with heart icon
 *   - Metadata display (duration, instructor)
 * ============================================================
 */

interface MeditationCardProps {
  meditation: GuidedMeditation;
  onPress: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

export function MeditationCard({
  meditation,
  onPress,
  isFavorite = false,
  onToggleFavorite,
}: MeditationCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * getCategoryGradient — Category-to-Color Mapping
   *
   * Maps each meditation category to a cohesive gradient pair.
   * This color coding helps users intuitively recognize content types:
   * purple = focus, blue = stress, indigo = sleep, pink/yellow = gratitude.
   * The gradient creates visual hierarchy and depth on cards.
   */
  const getCategoryGradient = (): [string, string] => {
    switch (meditation.category) {
      case 'focus':
        return ['#6c5ce7', '#a29bfe']; // Purple
      case 'stress':
        return ['#74b9ff', '#a0d2ff']; // Light blue
      case 'anxiety':
        return ['#55a3ff', '#7db8ff']; // Medium blue
      case 'sleep':
        return ['#5f3dc4', '#7c5cdb']; // Deep indigo
      case 'gratitude':
        return ['#fd79a8', '#fdcb6e']; // Pink-to-yellow
      default:
        return ['#6c5ce7', '#a29bfe']; // Default: purple
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* --- Gradient Background ---
          LinearGradient creates a diagonal color wash from top-left to
          bottom-right, using category-specific colors. This provides
          visual richness and makes text more readable when content
          doesn't have a thumbnail. */}
      <LinearGradient
        colors={getCategoryGradient()}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* --- Thumbnail or Fallback Icon ---
            If the meditation has a thumbnail image, display it (Expo Image
            handles caching and optimization). Otherwise, show a leaf icon
            as a placeholder. */}
        {meditation.thumbnail_url ? (
          <Image source={{ uri: meditation.thumbnail_url }} style={styles.thumbnail} />
        ) : (
          <View style={styles.iconContainer}>
            <Ionicons name="leaf" size={40} color="white" />
          </View>
        )}

        {/* --- Card Content ---
            Flex layout containing title, description, and metadata. */}
        <View style={styles.content}>
          {/* --- Header (Title + Favorite Button) ---
              Flex row with space-between ensures title on left,
              favorite button on right. */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={2}>
              {meditation.title}
            </Text>
            {/* --- Favorite Toggle ---
                Only shown if onToggleFavorite callback is provided.
                Tapping toggles the filled/outline heart icon. */}
            {onToggleFavorite && (
              <TouchableOpacity
                onPress={onToggleFavorite}
                style={styles.favoriteButton}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* --- Description ---
              Secondary text with 2-line limit. */}
          <Text style={styles.description} numberOfLines={2}>
            {meditation.description}
          </Text>

          {/* --- Footer Metadata ---
              Row of icons + text for duration, instructor, and premium status. */}
          <View style={styles.footer}>
            {/* Duration */}
            <View style={styles.info}>
              <Ionicons name="time-outline" size={16} color="white" />
              <Text style={styles.infoText}>
                {meditation.duration_minutes} min
              </Text>
            </View>

            {/* Instructor (if available) */}
            {meditation.instructor && (
              <View style={styles.info}>
                <Ionicons name="person-outline" size={16} color="white" />
                <Text style={styles.infoText}>{meditation.instructor}</Text>
              </View>
            )}

            {/* Premium Badge (if not free) ---
                A white pill with a star and "PRO" label, signaling this
                content requires a subscription. */}
            {!meditation.isFree && (
              <View style={styles.premiumBadge}>
                <Ionicons
                  name="star"
                  size={12}
                  color={theme.colors.primary}
                />
                <Text style={[styles.premiumText, { color: theme.colors.primary }]}>
                  PRO
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// --- Stylesheet ---
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // --- Container ---
    // Outer card with shadow and rounded corners. Margin adds breathing room
    // between cards in a horizontal scroll list.
    container: {
      marginHorizontal: theme.spacing.md,
      marginVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    // --- Gradient Background ---
    // The gradient is a direct child of the container and fills it.
    gradient: {
      padding: theme.spacing.lg,
    },
    // --- Thumbnail ---
    // Full-width image. If missing, the iconContainer below replaces it.
    thumbnail: {
      width: '100%',
      height: 120,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
    },
    // --- Fallback Icon Container ---
    // When no thumbnail is available, show a semi-transparent white
    // background with a leaf icon. Creates a consistent visual placeholder.
    iconContainer: {
      width: '100%',
      height: 120,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
    },
    // --- Content Container ---
    // flex: 1 allows content to expand within the gradient.
    content: {
      flex: 1,
    },
    // --- Header (Title + Favorite) ---
    // space-between pushes title left and button right.
    // flex-start alignment prevents title from vertically centering
    // if the favorite button is taller (though it isn't).
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    // --- Title ---
    // Prominent, bold text. flex: 1 ensures it takes available space
    // before the favorite button. marginRight prevents text from
    // touching the button.
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: 'white',
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    // --- Favorite Button ---
    // Padding makes it a slightly larger tap target.
    favoriteButton: {
      padding: theme.spacing.xs,
    },
    // --- Description ---
    // Secondary text with high opacity white for contrast on gradient.
    // lineHeight improves legibility.
    description: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: theme.spacing.md,
      lineHeight: 20,
    },
    // --- Footer (Metadata Row) ---
    // Horizontal layout with icon + text pairs. gap creates space between items.
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    // --- Info Pair (Icon + Text) ---
    // Each metadata item (duration, instructor, etc.) is an icon + text pair.
    info: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    // --- Info Text ---
    // White text for contrast on gradient.
    infoText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: 'white',
    },
    // --- Premium Badge ---
    // A white pill with a star icon and "PRO" label.
    // Signals this is premium/subscription-only content.
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'white',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      gap: 2,
    },
    // --- Premium Text ---
    // Small, bold, uses theme primary color for brand consistency.
    premiumText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 10,
    },
  });
