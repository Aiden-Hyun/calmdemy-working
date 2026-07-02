/**
 * ============================================================
 * features/routines/components/StreakBadge.tsx — Streak + shields (feat 6)
 * ============================================================
 *
 * Presentational card: a flame with the current streak, and (when the habit
 * grants shields) a row of shield pips showing how many remain this period.
 * Vectors only — no emoji.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";

const FLAME = "#E08A5B";
const SHIELD = "#8FA98C";

interface StreakBadgeProps {
  value: number;
  unit: "day" | "week";
  shieldsRemaining: number;
  shieldsMax: number;
}

export function StreakBadge({ value, unit, shieldsRemaining, shieldsMax }: StreakBadgeProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const active = value > 0;
  const unitLabel = `${unit}${value === 1 ? "" : "s"}`;

  return (
    <View style={styles.card}>
      <View style={styles.streakRow}>
        <Ionicons
          name={active ? "flame" : "flame-outline"}
          size={30}
          color={active ? FLAME : theme.colors.textMuted}
        />
        <View>
          <Text style={styles.value}>{value}</Text>
          <Text style={styles.label}>
            {active ? `${unitLabel} streak` : "Start your streak today"}
          </Text>
        </View>
      </View>

      {shieldsMax > 0 && (
        <View style={styles.shieldSection}>
          <View style={styles.shieldPips}>
            {Array.from({ length: shieldsMax }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < shieldsRemaining ? "shield-checkmark" : "shield-outline"}
                size={18}
                color={i < shieldsRemaining ? SHIELD : theme.colors.border}
              />
            ))}
          </View>
          <Text style={styles.shieldLabel}>
            {shieldsRemaining} of {shieldsMax} shields left this week
          </Text>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    streakRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    value: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 30,
      color: theme.colors.text,
      lineHeight: 34,
    },
    label: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    shieldSection: {
      gap: 6,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.md,
    },
    shieldPips: {
      flexDirection: "row",
      gap: 6,
    },
    shieldLabel: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
