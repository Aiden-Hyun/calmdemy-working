import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * MeditationTimer.tsx — Meditation Session Control Panel
 * ============================================================
 *
 * Architectural Role:
 *   A full-featured meditation session timer component that combines
 *   a circular progress ring with state-aware control buttons. Receives
 *   session state and timing data from a ViewModel (likely in the
 *   meditation feature), and fires callbacks on user interactions.
 *
 * Design Patterns:
 *   - Controlled Component: Parent ViewModel owns the session state
 *     (isActive, isPaused, progress) and time calculations. This component
 *     renders the state and dispatches events via callbacks.
 *   - State Machine: Three distinct UI states (not started, active & meditating,
 *     paused) drive the button layout and text display.
 *   - SVG Progress Ring: Uses stroke-dasharray/dashoffset to animate a
 *     circular progress indicator, similar to ProgressRing but with
 *     additional decorative circles and SVG transforms.
 *
 * Key Features:
 *   - Responsive sizing (defaults to 70% of window width)
 *   - SVG circles with decorative concentric rings
 *   - Context-aware button controls (Start / Pause-Resume / Stop)
 *   - Status messaging that reflects session state
 * ============================================================
 */

interface MeditationTimerProps {
  progress: number; // 0-100
  timeRemaining: string;
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  size?: number;
}

const { width } = Dimensions.get('window');
const DEFAULT_SIZE = width * 0.7;

export function MeditationTimer({
  progress,
  timeRemaining,
  isActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  size = DEFAULT_SIZE,
}: MeditationTimerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- SVG Circle Math ---
  // Same stroke-dasharray/dashoffset technique as ProgressRing.
  // The stroke width is proportional to the ring size (6% of size).
  const strokeWidth = size * 0.06;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const centerX = size / 2;
  const centerY = size / 2;

  return (
    <View style={styles.container}>
      {/* --- Timer Ring Container ---
          Fixed dimensions for the SVG. Position: relative allows the
          content overlay (time text) to be positioned absolutely on top. */}
      <View style={[styles.timerContainer, { width: size, height: size }]}>
        <Svg width={size} height={size} style={styles.svg}>
          {/* --- Background Ring ---
              Light gray circle behind the progress ring, providing
              visual reference for the full session duration. */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={theme.colors.gray[300]}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* --- Progress Ring ---
              Animated stroke-dasharray ring that fills as progress increases.
              Rotated -90 degrees to start from the top (12 o'clock).
              strokeLinecap="round" creates rounded endpoints for a polished look. */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${centerX} ${centerY})`}
          />

          {/* --- Decorative Inner Circles ---
              Two subtle concentric circles inside the main ring. These add
              visual depth and create a sophisticated, layered appearance
              without cluttering the design. Their opacity decreases (0.5 → 0.3)
              as they move toward the center, creating a sense of depth. */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.85}
            stroke={theme.colors.gray[200]}
            strokeWidth={1}
            fill="none"
            opacity={0.5}
          />

          <Circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.75}
            stroke={theme.colors.gray[200]}
            strokeWidth={1}
            fill="none"
            opacity={0.3}
          />
        </Svg>

        {/* --- Time Display Overlay ---
            Positioned absolutely on top of the SVG. Shows the remaining
            time in MM:SS format and the current session status. */}
        <View style={styles.timerContent}>
          <Text style={styles.timeText}>{timeRemaining}</Text>
          <Text style={styles.statusText}>
            {!isActive
              ? 'Ready to begin'
              : isPaused
                ? 'Paused'
                : 'Meditating'}
          </Text>
        </View>
      </View>

      {/* --- Control Buttons ---
          Layout changes based on session state:
          1. Not started: Show a single "Start" button
          2. Active (meditating or paused): Show [Stop] [Pause/Resume] [spacer]

          The layout remains balanced visually by always occupying 3 button slots. */}
      <View style={styles.controls}>
        {!isActive ? (
          // --- Initial State: Start Button ---
          <TouchableOpacity style={styles.primaryButton} onPress={onStart}>
            <Ionicons name="play" size={32} color="white" />
            <Text style={styles.primaryButtonText}>Start</Text>
          </TouchableOpacity>
        ) : (
          // --- Active State: Stop / Pause-Resume / Spacer ---
          <>
            {/* Stop Button (secondary) */}
            <TouchableOpacity style={styles.secondaryButton} onPress={onStop}>
              <Ionicons name="stop" size={24} color={theme.colors.text} />
            </TouchableOpacity>

            {/* Pause / Resume Button (primary) ---
                Dynamic button: shows play icon + "Resume" when paused,
                or pause icon + "Pause" when meditating. Clicking toggles state. */}
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

            {/* Spacer ---
                Invisible placeholder button to maintain visual balance.
                This ensures the Pause/Resume button stays centered. */}
            <View style={styles.placeholderButton} />
          </>
        )}
      </View>
    </View>
  );
}

// --- Stylesheet ---
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // --- Main Container ---
    // Centers all content vertically and horizontally.
    container: {
      alignItems: 'center',
    },
    // --- Timer Ring Container ---
    // position: relative allows the content overlay to position absolutely
    // within it. Flexbox centering ensures the SVG and text align perfectly.
    timerContainer: {
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // --- SVG Positioning ---
    // Positioned absolutely to sit behind the text content, filling the
    // entire timerContainer space.
    svg: {
      position: 'absolute',
    },
    // --- Timer Content (Time + Status) ---
    // Positioned absolutely over the SVG. Flex centering aligns text vertically.
    timerContent: {
      alignItems: 'center',
    },
    // --- Time Display ---
    // Large, monospaced-like text (display.regular font) with letter spacing
    // for a clock-like appearance. The spacing makes each digit more distinct.
    timeText: {
      fontFamily: theme.fonts.display.regular,
      fontSize: 48,
      color: theme.colors.text,
      letterSpacing: 2,
    },
    // --- Status Text ---
    // Smaller, muted text below the time. Communicates the session state
    // (Ready, Meditating, Paused).
    statusText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 18,
      color: theme.colors.textLight,
      marginTop: theme.spacing.sm,
    },
    // --- Control Buttons Row ---
    // Horizontal flex layout with centered alignment. Gap creates spacing
    // between buttons. marginTop adds breathing room below the timer ring.
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: theme.spacing.xxl,
      gap: theme.spacing.lg,
    },
    // --- Primary Button (Start / Pause-Resume) ---
    // Bold, colorful button with icon + text. Full border radius (pill shape).
    // flexDirection: row makes the icon and text sit side-by-side.
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
    // --- Primary Button Text ---
    primaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      color: 'white',
      fontSize: 18,
    },
    // --- Secondary Button (Stop) ---
    // Smaller, icon-only button. Circular (borderRadius: 28 = half of 56pt size).
    // Light background for visual distinction from primary action.
    secondaryButton: {
      backgroundColor: theme.colors.gray[200],
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    // --- Placeholder Button ---
    // Invisible spacer that maintains button row balance. Without this,
    // the Pause/Resume button would shift when toggling between not-active
    // and active states.
    placeholderButton: {
      width: 56,
      height: 56,
    },
  });
