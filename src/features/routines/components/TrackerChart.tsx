/**
 * ============================================================
 * features/routines/components/TrackerChart.tsx — Trend line (feat 10)
 * ============================================================
 *
 * A LineChart of a tracker's recent readings (react-native-chart-kit, already
 * installed). Entries come in newest-first; we chart them chronologically.
 * Needs at least two points — otherwise shows a gentle placeholder.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { TrackerEntry } from "../types";

interface TrackerChartProps {
  entries: TrackerEntry[];
  color: string;
}

export function TrackerChart({ entries, color }: TrackerChartProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const chrono = useMemo(() => [...entries].reverse(), [entries]);

  if (chrono.length < 2) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>Log at least two days to see your trend.</Text>
      </View>
    );
  }

  const values = chrono.map((e) => e.value);
  const step = Math.max(1, Math.ceil(chrono.length / 6));
  const labels = chrono.map((e, i) => (i % step === 0 ? String(Number(e.dateKey.slice(8, 10))) : ""));
  const decimalPlaces = values.every(Number.isInteger) ? 0 : 1;
  const width = Dimensions.get("window").width - theme.spacing.lg * 2 - theme.spacing.md * 2;

  return (
    <LineChart
      data={{ labels, datasets: [{ data: values }] }}
      width={width}
      height={190}
      withInnerLines={false}
      withOuterLines={false}
      bezier
      chartConfig={{
        backgroundGradientFrom: theme.colors.surface,
        backgroundGradientTo: theme.colors.surface,
        decimalPlaces,
        color: () => color,
        labelColor: () => theme.colors.textMuted,
        propsForDots: { r: "3" },
      }}
      style={styles.chart}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chart: {
      borderRadius: theme.borderRadius.lg,
      marginLeft: -theme.spacing.sm,
    },
    placeholder: {
      height: 120,
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
  });
