/**
 * ============================================================
 * features/routines/components/PriorityPicker.tsx — Priority 1–3 (feat 5)
 * ============================================================
 *
 * Low / Medium / High selector. Priority weights the Green Light score (feat 14)
 * and orders the Today list. Controlled: value + onChange.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { Priority } from "../types";

const ACCENT = "#8FA98C";

const OPTIONS: { value: Priority; label: string }[] = [
  { value: 1, label: "Low" },
  { value: 2, label: "Medium" },
  { value: 3, label: "High" },
];

interface PriorityPickerProps {
  value: Priority;
  onChange: (next: Priority) => void;
}

export function PriorityPicker({ value, onChange }: PriorityPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.segment}>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <AnimatedPressable
            key={option.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(option.value)}
          >
            <View style={styles.dots}>
              {[1, 2, 3].map((dot) => (
                <View
                  key={dot}
                  style={[
                    styles.dot,
                    { backgroundColor: dot <= option.value ? ACCENT : theme.colors.border },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {option.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      gap: 6,
    },
    optionActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    dots: {
      flexDirection: "row",
      gap: 3,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    optionText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    optionTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
  });
