/**
 * ============================================================
 * features/cbt/components/DistortionChip.tsx — Selectable distortion
 * ============================================================
 *
 * A full-width selectable card for one cognitive distortion (label + short
 * description). Tinted with a check when selected. Used in the A-B-C distortion
 * step. Presentational.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";

interface DistortionChipProps {
  label: string;
  description: string;
  selected: boolean;
  accent: string;
  onPress: () => void;
}

export function DistortionChip({
  label,
  description,
  selected,
  accent,
  onPress,
}: DistortionChipProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AnimatedPressable
      style={[
        styles.chip,
        selected && { backgroundColor: `${accent}1A`, borderColor: accent },
      ]}
      onPress={onPress}
    >
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? accent : theme.colors.textMuted}
      />
    </AnimatedPressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    text: {
      flex: 1,
    },
    label: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    description: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
