import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

/**
 * ============================================================
 * AnimatedView.tsx — Entrance Animation Utilities (Presentational)
 * ============================================================
 *
 * Architectural Role:
 *   Three specialized animation wrapper components that apply entrance
 *   animations (fade + slide, staggered fade, or fade-only) to child
 *   content. These are used to create polished, progressive disclosure
 *   transitions as screens load or lists render.
 *
 * Design Patterns:
 *   - Animated Entrance: AnimatedView combines fade and slide-up,
 *     creating a "pop-in from below" effect common in modern apps.
 *   - Staggered Animation: StaggeredList maps over children and applies
 *     progressive delays, creating a "cascade" effect that's visually
 *     appealing and communicates sequential content.
 *   - Composition: FadeView is a simplified variant of AnimatedView
 *     that removes the slide, useful for text or overlays.
 *
 * Key Features:
 *   - Delay support for sequencing multiple animations
 *   - Configurable duration and slide distance
 *   - Animation cleanup in useEffect return (prevent memory leaks)
 * ============================================================
 */

interface AnimatedViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  slideDistance?: number;
  style?: ViewStyle;
}

/**
 * AnimatedView — Fade + Slide-Up Entrance Animation
 *
 * Combines opacity and translateY transforms into a single parallel
 * animation. Creates the effect of content fading in while sliding up
 * from below. Common pattern for progressive disclosure as a screen loads.
 *
 * @param delay - Milliseconds to wait before starting animation (default 0)
 * @param duration - Animation duration in ms (default 400)
 * @param slideDistance - Distance to slide from (px, default 20)
 */
export function AnimatedView({
  children,
  delay = 0,
  duration = 400,
  slideDistance = 20,
  style,
}: AnimatedViewProps) {
  // --- Animation Values ---
  // Two separate Animated.Values for decoupled control of fade and slide.
  // Initialized to their "before" state (0 opacity, offset by slideDistance).
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(slideDistance)).current;

  useEffect(() => {
    // --- Parallel Animation ---
    // Both fade and slide happen simultaneously, starting after the delay.
    // This creates a smooth, unified entrance effect.
    const animation = Animated.parallel([
      // --- Fade In ---
      // opacity: 0 → 1
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      // --- Slide Up ---
      // translateY: slideDistance → 0 (moves up from "below")
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    // --- Cleanup ---
    // Stop the animation if the component unmounts or the effect reruns.
    // This prevents animating a component that's no longer visible.
    return () => {
      animation.stop();
    };
  }, [fadeAnim, slideAnim, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// --- Staggered List Animation ---

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  duration?: number;
  style?: ViewStyle;
}

/**
 * StaggeredList — Cascading Entrance Animation for Array Content
 *
 * Maps over an array of children and wraps each in AnimatedView with
 * a progressive delay. Creates a "cascade" or "waterfall" effect where
 * each item enters slightly after the previous one.
 *
 * Common use case: Rendering a list of cards or items where each card
 * fades in and slides up in sequence, rather than all at once.
 *
 * @param staggerDelay - Delay between each child's animation start (ms, default 50)
 * @param duration - Duration of each animation (ms, default 400)
 *
 * Example:
 *   <StaggeredList>
 *     <Card title="First" />
 *     <Card title="Second" />
 *     <Card title="Third" />
 *   </StaggeredList>
 *
 *   Result: First card starts immediately, second at 50ms, third at 100ms.
 */
export function StaggeredList({
  children,
  staggerDelay = 50,
  duration = 400,
  style,
}: StaggeredListProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        // --- Progressive Delay ---
        // index * staggerDelay ensures the Nth child starts N*staggerDelay ms later.
        <AnimatedView
          delay={index * staggerDelay}
          duration={duration}
          style={style}
        >
          {child}
        </AnimatedView>
      ))}
    </>
  );
}

// --- Fade-Only Animation ---

interface FadeViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
}

/**
 * FadeView — Opacity-Only Entrance Animation
 *
 * Simpler variant of AnimatedView that only animates opacity,
 * with no slide. Useful for overlays, text, or cases where you want
 * a gentler entrance without motion.
 *
 * @param duration - Animation duration (default 300ms, slightly faster than AnimatedView)
 */
export function FadeView({
  children,
  delay = 0,
  duration = 300,
  style,
}: FadeViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, delay, duration]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

