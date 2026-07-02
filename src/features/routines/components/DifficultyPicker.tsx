/**
 * ============================================================
 * features/routines/components/DifficultyPicker.tsx — Mini/Plus/Max (feat 4)
 * ============================================================
 *
 * Segmented control for a habit's effort tier, with a one-line description of
 * the current choice. Controlled: value + onChange.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { DIFFICULTY_META, DIFFICULTY_ORDER } from "../data/difficulty";
import type { Difficulty } from "../types";

const ACCENT = "#8FA98C";

interface DifficultyPickerProps {
  value: Difficulty;
  onChange: (next: Difficulty) => void;
}

export function DifficultyPicker({ value, onChange }: DifficultyPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <View style={styles.segment}>
        {DIFFICULTY_ORDER.map((level) => {
          const active = level === value;
          return (
            <AnimatedPressable
              key={level}
              style={[styles.option, active && styles.optionActive]}
              onPress={() => onChange(level)}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>
                {DIFFICULTY_META[level].label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
      <Text style={styles.description}>{DIFFICULTY_META[value].description}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: theme.spacing.sm,
    },
    segment: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    option: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    optionActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    optionText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    optionTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    description: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
