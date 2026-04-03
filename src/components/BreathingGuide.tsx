/**
 * ============================================================
 * BreathingGuide.tsx — Interactive Breathing Exercise Visualizer
 * ============================================================
 *
 * Architectural Role:
 *   A presentation component that visualizes guided breathing exercises.
 *   Receives state from a ViewModel (breathing exercise logic) and renders
 *   animated circle feedback synchronized with breathing phases (inhale/exhale).
 *   This is a pure View in the MVVM pattern — no business logic.
 *
 * Design Patterns:
 *   - Controlled Component: All state (isActive, isPaused, currentPhase, etc.)
 *     is passed as props. The component has no local state except animations.
 *   - Observer Pattern (React Hooks): useEffect watches currentPhase and
 *     triggers animation updates reactively.
 *   - Animation Composition: Animated.parallel runs scale+opacity animations
 *     in sync for smooth breathing circle expansion/contraction.
 *   - State Machine (Enum): currentPhase is a discriminated union
 *     (inhale|hold|exhale|pause|idle) that drives color and animation logic.
 *
 * Key Dependencies:
 *   - React.Animated (RN native driver animations for 60fps smoothness)
 *   - useTheme (color values for breathing phases)
 *
 * Consumed By:
 *   Breathing exercise screens that manage the breathing state machine
 * ============================================================
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

interface BreathingGuideProps {
  isActive: boolean;
  isPaused: boolean;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'pause' | 'idle';
  phaseProgress: number;
  currentCycle: number;
  totalCycles: number;
  instructions: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

// --- Dynamic circle size based on viewport width ---
const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;

/**
 * BreathingGuide — Animated breathing exercise visualizer.
 *
 * This component is a Pure Presentation Component (View layer in MVVM).
 * It receives all state as props and renders animated visuals to guide
 * the user through a breathing exercise. The actual breathing state machine
 * (timing, phase transitions) is managed upstream by a ViewModel.
 *
 * Animation Strategy:
 *   - scaleAnim: Circle expands (inhale 1.2x) and contracts (exhale 0.8x)
 *   - opacityAnim: Opacity brightens on inhale, dims on exhale
 *   - rotateAnim: Decorative outer ring rotates continuously during exercise
 *   - useNativeDriver: true ensures 60fps smooth animation using native thread
 *
 * All animations are triggered by currentPhase changes. The parent ViewModel
 * updates currentPhase based on timing, and this component reacts with animation.
 * This is the Reactive/Observable pattern in action.
 */
export function BreathingGuide({
  isActive,
  isPaused,
  currentPhase,
  phaseProgress,
  currentCycle,
  totalCycles,
  instructions,
  onStart,
  onPause,
  onResume,
  onStop,
}: BreathingGuideProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- Animated value for circle scale (1.0 = base, 1.2 = expanded, 0.8 = contracted) ---
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  // --- Animated value for circle opacity (0.3 = dim, 0.8 = bright) ---
  const opacityAnim = useRef(new Animated.Value(0.3)).current;
  // --- Animated value for decorative ring rotation (0 = 0deg, 1 = 360deg) ---
  const rotateAnim = useRef(new Animated.Value(0)).current;

  /**
   * Effect: Animate breathing circle scale and opacity based on phase.
   *
   * When phase changes to 'inhale', scale up (1.2x) and brighten (0.8 opacity)
   * over 4 seconds. When phase changes to 'exhale', scale down (0.8x) and dim
   * (0.3 opacity) over 4 seconds. This creates the visual feedback of breathing.
   *
   * Animated.parallel ensures scale and opacity change in sync for a cohesive
   * visual effect. The useNativeDriver: true flag makes these animations run
   * on the native thread, avoiding JS thread blocking and achieving 60fps.
   */
  useEffect(() => {
    if (currentPhase === 'inhale') {
      // --- Inhale: expand circle and brighten ---
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (currentPhase === 'exhale') {
      // --- Exhale: contract circle and dim ---
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 4000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentPhase, scaleAnim, opacityAnim]);

  /**
   * Effect: Animate decorative ring rotation when exercise is active.
   *
   * When isActive && !isPaused, spin the outer ring continuously (20s per rotation).
   * When paused or stopped, freeze the rotation. This is a continuous loop animation
   * — Animated.loop restarts the animation when it completes.
   *
   * The rotation is purely decorative (no semantic meaning) but provides visual
   * continuity and keeps the user engaged during the breathing exercise.
   */
  useEffect(() => {
    if (isActive && !isPaused) {
      // --- Continuous rotation: one full 360deg turn in 20 seconds ---
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 20000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // --- Pause/stop: freeze rotation at current position ---
      rotateAnim.setValue(0);
    }
  }, [isActive, isPaused, rotateAnim]);

  /**
   * Animation Interpolation: Maps animated value (0-1) to degree string.
   *
   * The animated value (0 to 1) is transformed to '0deg' to '360deg' for
   * the CSS-like transform string. This is necessary because react-native
   * Animated uses numeric values, but transforms need degree strings.
   */
  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  /**
   * Color Selection: Maps breathing phase to theme color.
   *
   * This implements the Strategy pattern — different phases have distinct
   * colors to provide visual feedback to the user. Secondary (blue) for
   * inhale, primary (teal) for hold, calm (green) for exhale, sleep (purple)
   * for pause, and gray default for idle.
   */
  const getPhaseColor = () => {
    switch (currentPhase) {
      case 'inhale':
        return theme.colors.secondary;
      case 'hold':
        return theme.colors.primary;
      case 'exhale':
        return theme.colors.calm;
      case 'pause':
        return theme.colors.sleep;
      default:
        return theme.colors.gray[400];
    }
  };

  return (
    <View style={styles.container}>
      {/* --- Visual Feedback: Animated breathing circles --- */}
      <View style={styles.visualContainer}>
        {/*
          --- Decorative Ring: Rotating circle with 4 position indicators ---
          This outer ring rotates continuously during the exercise, providing
          visual motion feedback. The 4 dots (top/right/bottom/left) mark cardinal
          positions and help track the rotation. Purely decorative but enhances
          user engagement during breathing.
        */}
        <Animated.View
          style={[
            styles.outerCircle,
            {
              // --- Continuous 360-degree rotation animation ---
              transform: [{ rotate: rotation }],
            },
          ]}
        >
          {/* Position markers: dots at cardinal compass points */}
          <View style={[styles.dot, styles.dotTop]} />
          <View style={[styles.dot, styles.dotRight]} />
          <View style={[styles.dot, styles.dotBottom]} />
          <View style={[styles.dot, styles.dotLeft]} />
        </Animated.View>

        {/*
          --- Main Breathing Circle: Expands/contracts with phase ---
          This is the primary visual feedback. Color changes based on breathing
          phase (inhale/hold/exhale/pause), scale oscillates between 0.8x and 1.2x,
          and opacity follows the same curve. These synchronized animations create
          a hypnotic, calming visual that guides the user's breath.
        */}
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              // --- Dynamic color based on current breathing phase ---
              backgroundColor: getPhaseColor(),
              // --- Scale animation: 0.8x (exhale) to 1.2x (inhale) ---
              transform: [{ scale: scaleAnim }],
              // --- Opacity animation: synchronized with scale ---
              opacity: opacityAnim,
            },
          ]}
        />

        {/*
          --- Inner Center Circle: Shows instructions and cycle count ---
          The text overlays are centered on the breathing circle. Instructions
          (e.g., "Inhale", "Hold", "Exhale") come from the parent ViewModel.
          The cycle counter (e.g., "3 / 10") shows progress through the exercise.
        */}
        <View style={styles.innerCircle}>
          <Text style={styles.instructionText}>{instructions}</Text>
          {/* Cycle counter: displays current progress or "Ready" if not started */}
          <Text style={styles.cycleText}>
            {currentCycle > 0 ? `${currentCycle} / ${totalCycles}` : 'Ready'}
          </Text>
        </View>
      </View>

      {/*
        --- Control Buttons: Start/Pause/Stop/Resume ---
        Conditional rendering based on isActive and isPaused state.
        Two layouts:
          1. Not active: Single "Start" button
          2. Active: Stop, Pause/Resume, and placeholder for symmetry
      */}
      <View style={styles.controls}>
        {!isActive ? (
          // --- Initial state: Show only Start button ---
          <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
            <Ionicons name="play" size={32} color="white" />
            <Text style={styles.primaryButtonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          // --- Active state: Show Stop, Pause/Resume, and placeholder ---
          <>
            {/* Stop button: Terminates the exercise */}
            <TouchableOpacity style={styles.secondaryButton} onPress={onStop}>
              <Ionicons name="stop" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/*
              --- Pause/Resume Toggle ---
              Conditional button: shows "Pause" icon when actively breathing,
              shows "Play" icon when paused. This toggle provides UX feedback
              about the current exercise state.
            */}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={isPaused ? onResume : onPause}
            >
              <Ionicons
                name={isPaused ? 'play' : 'pause'}
                size={32}
                color="white"
              />
              <Text style={styles.primaryButtonText}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>

            {/*
              --- Placeholder Button: Visual symmetry ---
              An empty spacer to balance the three-button layout (Stop, Pause/Resume, Empty).
              This maintains visual alignment when the exercise is active.
            */}
            <View style={styles.placeholderButton} />
          </>
        )}
      </View>
    </View>
  );
}

/**
 * createStyles — Theme-aware stylesheet factory for breathing guide.
 *
 * Memoized to ensure style objects have stable references across renders.
 * Provides responsive sizing (CIRCLE_SIZE derives from window width),
 * ensuring the breathing circle scales appropriately on different devices.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // --- Main container: centers content with flex layout ---
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // --- Visual feedback area: contains animated circles ---
    visualContainer: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xxl,
    },
    // --- Decorative outer ring: rotates during exercise ---
    outerCircle: {
      position: 'absolute',
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: CIRCLE_SIZE / 2,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  dotTop: {
    top: -4,
    left: '50%',
    marginLeft: -4,
  },
  dotRight: {
    right: -4,
    top: '50%',
    marginTop: -4,
  },
  dotBottom: {
    bottom: -4,
    left: '50%',
    marginLeft: -4,
  },
  dotLeft: {
    left: -4,
    top: '50%',
    marginTop: -4,
  },
  breathingCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE * 0.8,
    height: CIRCLE_SIZE * 0.8,
    borderRadius: (CIRCLE_SIZE * 0.8) / 2,
  },
  innerCircle: {
    width: CIRCLE_SIZE * 0.5,
    height: CIRCLE_SIZE * 0.5,
    borderRadius: (CIRCLE_SIZE * 0.5) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  instructionText: {
      fontFamily: theme.fonts.display.semiBold,
    fontSize: 28,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  cycleText: {
      fontFamily: theme.fonts.ui.regular,
    fontSize: 18,
    color: theme.colors.textLight,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.sm,
    ...theme.shadows.md,
  },
  primaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
    color: 'white',
    fontSize: 18,
  },
  secondaryButton: {
    backgroundColor: theme.colors.gray[200],
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  placeholderButton: {
    width: 56,
    height: 56,
  },
});
