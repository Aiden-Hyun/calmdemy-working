/**
 * ============================================================
 * features/cbt/components/MethodTile.tsx — CBT method picker tile
 * ============================================================
 *
 * One method on the CBT home picker: tinted icon, label, and blurb. Tapping
 * routes to the method's exercise. Presentational.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { CbtMethodInfo } from "../types";

interface MethodTileProps {
  method: CbtMethodInfo;
  onPress: () => void;
}

export function MethodTile({ method, onPress }: MethodTileProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AnimatedPressable style={styles.tile} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${method.color}22` }]}>
        <Ionicons name={method.icon} size={24} color={method.color} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{method.label}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {method.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </AnimatedPressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    tile: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      marginBottom: 12,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      flex: 1,
    },
    label: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
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
