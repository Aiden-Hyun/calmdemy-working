import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * StatsCard.tsx — Statistics Display Card (Presentational Component)
 * ============================================================
 *
 * Architectural Role:
 *   A reusable card component that displays a single statistic metric
 *   (e.g., "Total Meditations: 42", "Streak Days: 7"). It's designed
 *   to be laid out in a row or grid alongside other stat cards to
 *   provide a quick overview of user progress.
 *
 * Design Patterns:
 *   - Presentational Component: Receives data via props and renders
 *     a styled view. Contains no business logic or state.
 *   - Compound Component: Often used alongside other StatsCards in
 *     a flex container (flexDirection: 'row') for a dashboard layout.
 *
 * Key Features:
 *   - Dynamic icon and color (customizable per stat)
 *   - Icon background with 20% opacity (tinted accent color)
 *   - Optional unit label (e.g., "days", "minutes")
 *   - Responsive sizing via flex: 1
 * ============================================================
 */

interface StatsCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}

export function StatsCard({ icon, label, value, unit, color }: StatsCardProps) {
  const { theme } = useTheme();
  // --- Memoized Styles ---
  // Recompute styles only when theme changes. This avoids recreating
  // the entire StyleSheet object on every render.
  const styles = useMemo(() => createStyles(theme), [theme]);
  const iconColor = color || theme.colors.primary;

  return (
    <View style={styles.container}>
      {/* --- Icon Container ---
          Displays the icon in a circular, tinted background. The hex color
          is appended with "20" (hex for ~13% opacity) to create a soft,
          cohesive accent that matches the icon color without overwhelming. */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>

      {/* --- Label ---
          Descriptive text (e.g., "Total Meditations"). Uses textLight color
          for visual hierarchy. */}
      <Text style={styles.label}>{label}</Text>

      {/* --- Value with Optional Unit ---
          Main metric displayed prominently. If a unit is provided,
          it's appended inline (e.g., "42 times" or "7 days"). */}
      <View style={styles.valueContainer}>
        <Text style={[styles.value, { color: iconColor }]}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      // --- Flex Layout ---
      // flex: 1 makes the card share space equally with siblings in a row.
      // This is the standard pattern for a multi-stat dashboard.
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      minHeight: 120,
      ...theme.shadows.sm,
    },
    // --- Icon Container ---
    // Circular badge (borderRadius: 24 = half of 48pt size).
    // Centered alignment via flexbox.
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
    },
    label: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      marginBottom: theme.spacing.xs,
    },
    // --- Value Container ---
    // Baseline alignment ensures that the unit text (smaller font size)
    // aligns with the baseline of the main value text, not its bottom.
    // This creates a cleaner, more professional appearance (like "42 days"
    // where "days" sits slightly higher than "42").
    valueContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 2,
    },
    value: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 24,
    },
    unit: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
    },
  });
