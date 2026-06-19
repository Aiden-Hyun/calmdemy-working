/**
 * ============================================================
 * features/mood/components/MoodDot.tsx — History day dot
 * ============================================================
 *
 * One day in the 14-day history row: a filled colored dot when the day has a
 * check-in, a muted outline when it doesn't. Filled dots are tappable to reveal
 * that day's note. Presentational.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { MoodValue } from "../types";
import { moodVisuals } from "../data/moodVisuals";

interface MoodDotProps {
  /** The day's mood, or undefined when there was no check-in. */
  value?: MoodValue;
  /** Short label under the dot (e.g. day of month). */
  dayLabel: string;
  selected?: boolean;
  onPress?: () => void;
}

export function MoodDot({ value, dayLabel, selected, onPress }: MoodDotProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const color = value ? moodVisuals[value].color : undefined;

  return (
    <AnimatedPressable
      style={styles.wrap}
      onPress={onPress}
      disabled={!value || !onPress}
    >
      <View
        style={[
          styles.dot,
          value
            ? { backgroundColor: color }
            : { backgroundColor: "transparent", borderWidth: 1.5, borderColor: theme.colors.border },
          selected && styles.dotSelected,
        ]}
      />
      <Text style={styles.dayLabel}>{dayLabel}</Text>
    </AnimatedPressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      gap: 4,
      width: 30,
    },
    dot: {
      width: 22,
      height: 22,
      borderRadius: theme.borderRadius.full,
    },
    dotSelected: {
      borderWidth: 2,
      borderColor: theme.colors.text,
    },
    dayLabel: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 10,
      color: theme.colors.textMuted,
    },
  });
