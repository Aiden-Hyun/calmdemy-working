/**
 * ============================================================
 * features/routines/components/HabitRow.tsx — One habit on the Today list
 * ============================================================
 *
 * A single checkable row: a state circle, the habit's icon + name, and a
 * subtitle (its time or moment). Tap toggles done; long-press opens the
 * state menu (Done / Rest day / Clear) handled by the parent.
 *
 * Presentational only — no data fetching. State + handlers come from props.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { CompletionState, Habit } from "../types";

interface HabitRowProps {
  habit: Habit;
  state?: CompletionState;
  subtitle?: string;
  onToggle: () => void;
  onLongPress: () => void;
}

/** The check-circle glyph + intent color for a given completion state. */
function stateVisual(state: CompletionState | undefined, theme: Theme, accent: string) {
  switch (state) {
    case "done":
      return { icon: "checkmark-circle" as const, color: accent, muted: true };
    case "rest":
      return { icon: "moon" as const, color: theme.colors.textSecondary, muted: true };
    case "shielded":
      return { icon: "shield-checkmark" as const, color: accent, muted: true };
    case "skipped":
      return { icon: "close-circle" as const, color: theme.colors.textMuted, muted: true };
    default:
      return { icon: "ellipse-outline" as const, color: theme.colors.border, muted: false };
  }
}

export function HabitRow({ habit, state, subtitle, onToggle, onLongPress }: HabitRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const visual = stateVisual(state, theme, habit.color);
  const isDone = state === "done" || state === "shielded";

  return (
    <AnimatedPressable style={styles.row} onPress={onToggle} onLongPress={onLongPress}>
      <Ionicons name={visual.icon} size={28} color={visual.color} />
      <View style={[styles.iconWrap, { backgroundColor: `${habit.color}22` }]}>
        <Ionicons name={habit.icon} size={20} color={habit.color} />
      </View>
      <View style={styles.textWrap}>
        <Text
          style={[styles.name, isDone && styles.nameDone]}
          numberOfLines={1}
        >
          {habit.name}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    textWrap: {
      flex: 1,
    },
    name: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    nameDone: {
      color: theme.colors.textMuted,
      textDecorationLine: "line-through",
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
  });
