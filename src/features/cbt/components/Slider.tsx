/**
 * ============================================================
 * features/cbt/components/Slider.tsx — 1–N likelihood slider
 * ============================================================
 *
 * Thin wrapper around @react-native-community/slider with a value readout,
 * themed to a method accent. Used by Decatastrophizing's "how likely is it?"
 * step. Presentational — value + handler owned by the parent.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import CommunitySlider from "@react-native-community/slider";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  accent?: string;
}

export function Slider({ value, onChange, min = 1, max = 10, accent }: SliderProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tint = accent ?? theme.colors.primary;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.value, { color: tint }]}>
        {value}
        <Text style={styles.outOf}> / {max}</Text>
      </Text>
      <CommunitySlider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={tint}
        maximumTrackTintColor={theme.colors.border}
        thumbTintColor={tint}
      />
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>Unlikely</Text>
        <Text style={styles.scaleLabel}>Certain</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingVertical: theme.spacing.md,
    },
    value: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 40,
      textAlign: "center",
    },
    outOf: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 18,
      color: theme.colors.textMuted,
    },
    slider: {
      width: "100%",
      height: 44,
      marginTop: theme.spacing.sm,
    },
    scaleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    scaleLabel: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
  });
