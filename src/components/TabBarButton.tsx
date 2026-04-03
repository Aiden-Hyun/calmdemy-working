import { Pressable, StyleSheet, GestureResponderEvent } from "react-native";
import type { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

/**
 * ============================================================
 * TabBarButton.tsx — Accessible Tab Bar Button (Presentational Component)
 * ============================================================
 *
 * Architectural Role:
 *   A custom button component for the bottom tab bar that wraps
 *   React Navigation's BottomTabBarButtonProps. It enforces Apple's
 *   Human Interface Guidelines (minimum 44x44pt touch target) and adds
 *   visual feedback to ensure accessibility and discoverability.
 *
 * Design Patterns:
 *   - Presentational Component: Pure UI wrapper with minimal logic;
 *     delegates press handling to the parent navigator.
 *   - Web/Mobile Bridge: Converts web-style props (aria-label, href)
 *     to React Native equivalents (accessibilityLabel, onPress).
 *
 * Key Features:
 *   - Minimum 44x44pt touch target (Apple HIG requirement)
 *   - hitSlop for 12pt expanded touch area (helps smaller devices)
 *   - Opacity feedback on press (visual confirmation)
 *   - Accessibility role and label support
 * ============================================================
 */

export function TabBarButton(props: BottomTabBarButtonProps) {
  // --- Props Deconstruction ---
  // Expo Router passes web-compatible props (aria-label instead of
  // accessibilityLabel). We extract these and adapt them for React Native.
  const { children, style, onPress, testID, ...rest } = props;
  const ariaLabel = (props as any)["aria-label"] as string | undefined;

  // --- Press Handling ---
  const handlePress = (e: GestureResponderEvent) => {
    onPress?.(e);
  };

  return (
    <Pressable
      {...rest}
      onPress={handlePress}
      accessibilityLabel={ariaLabel}
      accessibilityRole="tab"
      testID={testID}
      // --- Expanded Touch Area ---
      // hitSlop extends the pressable area by 12pt in all directions.
      // Combined with the 44x44 minimum size, this ensures even users
      // with larger fingers or reduced dexterity can reliably tap tabs.
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={({ pressed }) => [styles.button, style, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    // --- Minimum Touch Target ---
    // Apple HIG requires at least 44x44pt (approximately 11x11mm).
    // This is the standard accessible touch size for mobile.
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  // --- Visual Feedback on Press ---
  // Opacity reduction confirms to the user that the tap was registered,
  // providing tactile-like feedback in the absence of vibration.
  pressed: {
    opacity: 0.7,
  },
});
