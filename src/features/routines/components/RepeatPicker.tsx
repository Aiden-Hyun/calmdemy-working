/**
 * ============================================================
 * features/routines/components/RepeatPicker.tsx — Repeat cadence picker (feat 2)
 * ============================================================
 *
 * Controlled input that produces a RepeatConfig. Four modes:
 *   - Daily            → { type: "daily" }
 *   - Weekly           → { type: "weekly" }
 *   - Specific days    → { type: "weekdays"; days }
 *   - X times / week   → { type: "times-per-week"; target }
 *
 * Presentational — no data fetching.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { RepeatConfig, RepeatType, Weekday } from "../types";

const ACCENT = "#8FA98C";
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

const MODES: { type: RepeatType; label: string }[] = [
  { type: "daily", label: "Daily" },
  { type: "weekly", label: "Weekly" },
  { type: "weekdays", label: "Specific days" },
  { type: "times-per-week", label: "X / week" },
];

interface RepeatPickerProps {
  value: RepeatConfig;
  onChange: (next: RepeatConfig) => void;
}

/** A sensible default config when switching into a mode. */
function defaultFor(type: RepeatType, prev: RepeatConfig): RepeatConfig {
  switch (type) {
    case "daily":
      return { type: "daily" };
    case "weekly":
      return { type: "weekly" };
    case "weekdays":
      return { type: "weekdays", days: prev.type === "weekdays" ? prev.days : [1, 2, 3, 4, 5] };
    case "times-per-week":
      return {
        type: "times-per-week",
        target: prev.type === "times-per-week" ? prev.target : 3,
      };
  }
}

export function RepeatPicker({ value, onChange }: RepeatPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const toggleDay = (day: Weekday) => {
    if (value.type !== "weekdays") return;
    const has = value.days.includes(day);
    const days = has ? value.days.filter((d) => d !== day) : [...value.days, day];
    onChange({ type: "weekdays", days: days.sort((a, b) => a - b) });
  };

  const bumpTarget = (delta: number) => {
    if (value.type !== "times-per-week") return;
    const target = Math.min(7, Math.max(1, value.target + delta));
    onChange({ type: "times-per-week", target });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.modes}>
        {MODES.map((mode) => {
          const active = value.type === mode.type;
          return (
            <AnimatedPressable
              key={mode.type}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(defaultFor(mode.type, value))}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {mode.label}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>

      {value.type === "weekdays" && (
        <View style={styles.daysRow}>
          {DAY_LABELS.map((label, index) => {
            const day = index as Weekday;
            const active = value.days.includes(day);
            return (
              <AnimatedPressable
                key={day}
                style={[styles.dayDot, active && styles.dayDotActive]}
                onPress={() => toggleDay(day)}
              >
                <Text style={[styles.dayText, active && styles.dayTextActive]}>{label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      {value.type === "times-per-week" && (
        <View style={styles.stepperRow}>
          <AnimatedPressable style={styles.stepBtn} onPress={() => bumpTarget(-1)}>
            <Text style={styles.stepBtnText}>−</Text>
          </AnimatedPressable>
          <Text style={styles.stepValue}>
            {value.target} {value.target === 1 ? "time" : "times"} / week
          </Text>
          <AnimatedPressable style={styles.stepBtn} onPress={() => bumpTarget(1)}>
            <Text style={styles.stepBtnText}>+</Text>
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      gap: theme.spacing.md,
    },
    modes: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    chip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    chipText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    chipTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    daysRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    dayDot: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    dayDotActive: {
      backgroundColor: ACCENT,
      borderColor: ACCENT,
    },
    dayText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    dayTextActive: {
      color: theme.colors.surface,
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepBtn: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 20,
      color: theme.colors.text,
    },
    stepValue: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
  });
