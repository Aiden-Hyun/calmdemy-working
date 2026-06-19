/**
 * ============================================================
 * features/journal/components/PromptChip.tsx — Selectable prompt chip
 * ============================================================
 *
 * A single tappable prompt in the new-entry modal's prompt row. Tinted with the
 * journal accent when selected. Presentational — selection state and handler are
 * owned by the parent.
 * ============================================================
 */

import React, { useMemo } from "react";
import { Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";

interface PromptChipProps {
  text: string;
  selected: boolean;
  onPress: () => void;
}

export function PromptChip({ text, selected, onPress }: PromptChipProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AnimatedPressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text
        style={[styles.text, selected && styles.textSelected]}
        numberOfLines={2}
      >
        {text}
      </Text>
    </AnimatedPressable>
  );
}

const JOURNAL_ACCENT = "#B4A7C7";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      width: 220,
      padding: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipSelected: {
      backgroundColor: `${JOURNAL_ACCENT}22`,
      borderColor: JOURNAL_ACCENT,
    },
    text: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    textSelected: {
      color: theme.colors.text,
      fontFamily: theme.fonts.ui.medium,
    },
  });
