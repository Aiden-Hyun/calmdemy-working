import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * LoadingScreen.tsx — Full-Screen Loading Indicator
 * ============================================================
 *
 * Architectural Role:
 *   A full-screen overlay component shown during app initialization
 *   phases (auth check, content preload, navigation setup). It provides
 *   visual feedback and brand identity while the user waits.
 *
 * Design Patterns:
 *   - Animated Entrance: The content fades in on mount, signaling
 *     that the app is responsive and loading.
 *   - Multi-Animation Composition: Orchestrates multiple animations:
 *     1. Fade-in of entire content (400ms)
 *     2. Subtle pulse on the logo (1.2s loop)
 *     3. Sequential dot "loading" indicator (3 dots × 300ms each)
 *   - Polished Perception: The various animations give the illusion
 *     of activity and progress, reducing perceived wait time.
 *
 * Key Dependencies:
 *   - useTheme() (background gradient, colors)
 *   - Animated API (all animations use native driver)
 * ============================================================
 */

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = 'Loading your content...',
}: LoadingScreenProps) {
  const { theme, isDark } = useTheme();

  // --- Animation Values ---
  // Five separate Animated.Values orchestrate different animations:
  // pulseAnim: scales the logo subtly
  // fadeAnim: fades in the entire content area
  // dot*Anim: three dots that light up sequentially
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // --- Initial Fade-In ---
    // Content fades in from transparent to opaque over 400ms.
    // This gives the loading screen a smooth entrance.
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // --- Logo Pulse Loop ---
    // The logo subtly expands and contracts (scale 1 → 1.05 → 1)
    // in a smooth, breathing motion. inOut easing makes the scale
    // change feel natural and organic, not mechanical.
    Animated.loop(
      Animated.sequence([
        // Expand phase
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        // Contract phase
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // --- Sequential Dot Animation ---
    // Three dots light up in sequence, creating a "typing" or "loading"
    // indicator. Each dot goes 0.3 (dim) → 1 (bright) → 0.3 (dim),
    // with a 300ms timing. By chaining them in sequence, we create
    // a wave effect: dot1 flashes, then dot2, then dot3, then repeat.
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          // --- Dot 1 Pulse ---
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          // --- Dot 2 Pulse ---
          Animated.timing(dot2Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Anim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
          // --- Dot 3 Pulse ---
          Animated.timing(dot3Anim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Anim, {
            toValue: 0.3,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    animateDots();
  }, []);

  const styles = createStyles(theme, isDark);

  return (
    <View style={styles.container}>
      {/* --- Gradient Background ---
          Adapts to theme: dark mode uses background → surface,
          light mode uses background → subtle primary tint.
          This creates visual continuity with the app's theme. */}
      <LinearGradient
        colors={
          isDark
            ? [theme.colors.background, theme.colors.surface]
            : [theme.colors.background, `${theme.colors.primary}08`]
        }
        style={StyleSheet.absoluteFill}
      />

      {/* --- Main Content (Logo + Text) ---
          Animated.View applies fade-in opacity and pulse scale.
          This entire section rises and falls subtly as pulseAnim changes. */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* --- Logo with Gradient Badge ---
            The icon sits inside a gradient circle. The gradient background
            adds visual depth and brand identity. */}
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            style={styles.logoGradient}
          >
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </LinearGradient>
        </View>

        {/* --- App Name ---
            Bold, large text with letter spacing for elegance. */}
        <Text style={styles.appName}>Calmdemy</Text>

        {/* --- Tagline ---
            Brand messaging that reinforces the app's purpose:
            meditation and inner peace. */}
        <Text style={styles.tagline}>Find your inner peace</Text>
      </Animated.View>

      {/* --- Loading Indicator Section ---
          Positioned absolutely at the bottom. Contains the sequential
          dot animation and a contextual loading message. */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        {/* --- Animated Dots ---
            Three dots that light up in sequence. Creates the iconic
            "typing" or "loading" sensation. */}
        <View style={styles.loadingDots}>
          <Animated.View style={[styles.dot, { opacity: dot1Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot2Anim }]} />
          <Animated.View style={[styles.dot, { opacity: dot3Anim }]} />
        </View>
        {/* --- Loading Message ---
            Contextual text (e.g., "Checking authentication..." or
            "Loading your content...") informs the user about what's happening. */}
        <Text style={styles.loadingText}>{message}</Text>
      </Animated.View>
    </View>
  );
}

// --- Stylesheet ---
const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Full Screen Container ---
    // flex: 1 fills the entire screen. Centered alignment positions
    // content in the middle of the screen.
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    // --- Centered Content ---
    // The main logo and text group, centered on screen.
    content: {
      alignItems: 'center',
    },
    // --- Logo Container ---
    // Wrapper for the gradient circle. Margin below creates space
    // before the app name.
    logoContainer: {
      marginBottom: 24,
    },
    // --- Logo Gradient Badge ---
    // Circular background with a gradient. The large shadow makes it
    // appear to float above the background. borderRadius: 32 makes it
    // a perfect circle (half of 120pt width/height).
    logoGradient: {
      width: 120,
      height: 120,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.lg,
    },
    // --- Logo Image ---
    // Icon itself, slightly smaller than the badge (80pt in 120pt badge).
    logo: {
      width: 80,
      height: 80,
    },
    // --- App Name ---
    // Bold, large, brand-prominent text. Negative letterSpacing (-0.5)
    // tightens the character spacing for a modern, upscale appearance.
    appName: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 32,
      color: theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: 8,
    },
    // --- Tagline ---
    // Secondary text reinforcing brand messaging.
    tagline: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: theme.colors.textLight,
      marginBottom: 48,
    },
    // --- Loading Container ---
    // Positioned absolutely at the bottom of the screen (120pt from bottom).
    // Contains the animated dots and loading text.
    loadingContainer: {
      position: 'absolute',
      bottom: 120,
      alignItems: 'center',
    },
    // --- Loading Dots Wrapper ---
    // Horizontal flex row with 8pt gaps between dots.
    loadingDots: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    // --- Individual Dot ---
    // Small circles (10pt) with full border radius to be perfect circles.
    // Opacity animates to create the pulsing effect.
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
    },
    // --- Loading Text ---
    // Contextual message (e.g., "Loading your content...").
    // Muted color for visual hierarchy.
    loadingText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
  });
