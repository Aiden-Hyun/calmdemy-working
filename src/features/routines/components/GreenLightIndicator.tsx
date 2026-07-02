/**
 * ============================================================
 * features/routines/components/GreenLightIndicator.tsx — Traffic light (feat 14)
 * ============================================================
 *
 * A calm three-circle traffic light + status label. The active light is full
 * color; the others fade to the border tone. Vectors/shapes only — no emoji.
 * Presentational: takes the computed GreenLight.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { GreenLight } from "../types";

const COLORS: Record<GreenLight, string> = {
  green: "#8FA98C",
  yellow: "#D9B36A",
  red: "#D08A8A",
};

const ORDER: GreenLight[] = ["red", "yellow", "green"];

const LABELS: Record<GreenLight, string> = {
  green: "On track",
  yellow: "Getting there",
  red: "Take it gently",
};

export function GreenLightIndicator({ light }: { light: GreenLight }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <View style={styles.lights}>
        {ORDER.map((level) => {
          const active = level === light;
          return (
            <View
              key={level}
              style={[
                styles.dot,
                { backgroundColor: active ? COLORS[level] : theme.colors.border },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.label}>{LABELS[light]}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      alignSelf: "flex-start",
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    lights: {
      flexDirection: "row",
      gap: 5,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    label: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.text,
    },
  });
