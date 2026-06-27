/**
 * ============================================================
 * core/ui/BackButton.tsx — Standard header back affordance
 * ============================================================
 *
 * A left-aligned chevron that pops the navigation stack. Renders ONLY when
 * there's somewhere to go back to (router.canGoBack()), so it's safe to drop at
 * the top of any screen — it stays hidden on tab roots and shows on pushed
 * screens. Use it on screens that draw their own header (the app hides the
 * native one app-wide).
 * ============================================================
 */

import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "./AnimatedPressable";
import { useTheme } from "../theme/ThemeContext";

interface BackButtonProps {
  /** Override the icon tint (defaults to the theme text color). */
  color?: string;
}

export function BackButton({ color }: BackButtonProps) {
  const router = useRouter();
  const { theme } = useTheme();

  if (!router.canGoBack()) return null;

  return (
    <AnimatedPressable onPress={() => router.back()} style={styles.button}>
      <Ionicons name="chevron-back" size={24} color={color ?? theme.colors.text} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    // Pull the chevron to the screen's left edge despite the 40px tap target.
    marginLeft: -8,
  },
});
