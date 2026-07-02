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
import { DIFFICULTY_META } from "../data/difficulty";
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
        <View style={styles.nameRow}>
          <Text
            style={[styles.name, isDone && styles.nameDone]}
            numberOfLines={1}
          >
            {habit.name}
          </Text>
          {habit.difficulty !== "plus" && (
            <View style={styles.diffBadge}>
              <Text style={styles.diffBadgeText}>
                {DIFFICULTY_META[habit.difficulty].label}
              </Text>
            </View>
          )}
        </View>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.priorityDots}>
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[
              styles.pDot,
              { backgroundColor: dot <= habit.priority ? habit.color : theme.colors.border },
            ]}
          />
        ))}
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
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    name: {
      flexShrink: 1,
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    diffBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    diffBadgeText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 10,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    priorityDots: {
      flexDirection: "row",
      gap: 3,
      alignItems: "center",
    },
    pDot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
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
