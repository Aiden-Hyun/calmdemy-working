import React, { useRef } from 'react';
import { Animated, Pressable, ViewStyle, StyleProp } from 'react-native';

/**
 * ============================================================
 * AnimatedPressable.tsx — Spring & Bounce Button Components
 * ============================================================
 *
 * Architectural Role:
 *   Two specialized Presentational Components that wrap Pressable
 *   with smooth scale animations. AnimatedPressable provides a subtle
 *   spring-based scale effect on press/release. BounceButton adds a
 *   more pronounced "squash and bounce" sequence that fires after
 *   the callback. Both use React Native's Animated API with native
 *   driver for 60fps performance.
 *
 * Design Patterns:
 *   - Animation Timing: AnimatedPressable uses Animated.spring() for
 *     natural-feeling feedback. BounceButton chains Animated.sequence()
 *     to create a multi-phase interaction (compression → bounce → callback).
 *   - Native Driver Optimization: useNativeDriver: true offloads
 *     animations to the native thread, decoupling from the JS thread
 *     and ensuring smooth 60fps even under JS load.
 *   - State Machine: handlePressIn/Out map to Pressable lifecycle,
 *     triggering specific animations at each phase.
 *
 * Key Dependencies:
 *   - Animated API (React Native native animations)
 *   - Pressable component (touch handling)
 * ============================================================
 */

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  activeOpacity?: number;
}

/**
 * AnimatedPressable — Subtle Spring-Based Scale Button
 *
 * Implements a subtle "press down" effect: when the user presses,
 * the component scales to 0.97 with a gentle spring animation.
 * On release, it bounces back to 1. This provides haptic-like feedback
 * on touchscreen devices.
 *
 * @param scaleValue - Target scale on press (default 0.97 = 3% shrink)
 * @param activeOpacity - Opacity when disabled (not currently used, but available)
 */
export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  scaleValue = 0.97,
  activeOpacity = 0.9,
}: AnimatedPressableProps) {
  // --- Animated Value ---
  // A single Animated.Value drives the scale transform. useRef ensures
  // the value persists across re-renders without recreating it.
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // --- Press Down Animation ---
  // Triggered by onPressIn. Uses Animated.spring for natural deceleration.
  // speed: 50 and bounciness: 4 create a subtle, quick bounce (not bouncy-bouncy).
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // --- Release Animation ---
  // Triggered by onPressOut. Animates back to scale 1.
  // The spring parameters match handlePressIn for visual consistency.
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          style,
          {
            // --- Scale Transform ---
            // The scaleAnim value drives the transform, creating the shrink effect.
            transform: [{ scale: scaleAnim }],
            // --- Disabled State ---
            // When disabled, opacity drops to 0.5 as a visual indicator.
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// --- Specialized Button with Bounce Effect ---

interface BounceButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

/**
 * BounceButton — Pronounced Squash-and-Bounce Effect
 *
 * More dramatic than AnimatedPressable. Creates a two-phase animation:
 * 1. Instant compression to 0.92 (squash phase, 100ms)
 * 2. Spring bounce back to 1 (elastic recovery, 20ms speed, 12 bounciness)
 *
 * The onPress callback fires at the end of the animation sequence,
 * creating the illusion that the button "bounces" in response to the tap.
 */
export function BounceButton({
  children,
  onPress,
  style,
  disabled = false,
}: BounceButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // --- Multi-Phase Press Animation ---
  const handlePress = () => {
    Animated.sequence([
      // --- Phase 1: Squash ---
      // Linear compression to 0.92 over 100ms.
      // Creates the illusion that the button is being pressed into the screen.
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      // --- Phase 2: Bounce ---
      // Spring back to 1 with high bounciness (12) and slow speed (20).
      // This creates a pronounced oscillation, like a rubber button.
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 12,
      }),
    ]).start(() => {
      // --- Callback on Completion ---
      // Fire the onPress callback after the animation completes.
      // This decouples the visual feedback from the action, creating
      // a sense of "the button responded to my tap."
      if (onPress) onPress();
    });
  };

  return (
    <Pressable onPress={handlePress} disabled={disabled}>
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

