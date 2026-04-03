import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * ProgressRing.tsx — Circular Progress Indicator (Presentational Component)
 * ============================================================
 *
 * Architectural Role:
 *   A reusable circular progress visualization component. Uses SVG circles
 *   with stroke-dasharray/stroke-dashoffset to animate a progress arc,
 *   similar to iOS-style progress rings. Can optionally display text
 *   in the center for labeling (e.g., "45%", "Day 3").
 *
 * Design Patterns:
 *   - Presentational Component: Pure view, no state or business logic.
 *   - SVG Vector Rendering: Uses react-native-svg for crisp, scalable
 *     graphics that render equally well at any size.
 *   - Absolute Positioning Overlay: Text is centered via absolute
 *     positioning over the SVG, creating a layered composition.
 *
 * Key Features:
 *   - Flexible size and stroke width (all proportions scale)
 *   - SVG rotation transform to start progress from top (-90 degrees)
 *   - Stroke-dasharray technique for smooth arcs
 *   - Optional center text and subtext
 * ============================================================
 */

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  centerText?: string;
  centerSubtext?: string;
}

export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color,
  backgroundColor,
  centerText,
  centerSubtext,
}: ProgressRingProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // --- Color Configuration ---
  const ringColor = color || theme.colors.primary;
  const ringBackgroundColor = backgroundColor || theme.colors.gray[300];

  // --- SVG Circle Math ---
  // The progress ring is drawn as a circle with a stroke, not a fill.
  // circumference = 2 * pi * r tells us the full stroke length.
  // strokeDashoffset is used to "hide" a portion of the stroke, creating
  // the appearance of a filled arc. As progress increases, we show more.
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* --- SVG Coordinate System ---
            The <G> element with rotation="-90" rotates the entire group by
            -90 degrees around its center. This makes the progress start from
            the top of the ring (12 o'clock) instead of the right side (3 o'clock),
            which is the convention for circular progress indicators. */}
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {/* --- Background Ring ---
              A full circle in a light color behind the progress ring,
              providing visual reference for the total progress distance. */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringBackgroundColor}
            strokeWidth={strokeWidth}
            fill="none"
          />

          {/* --- Progress Ring ---
              Uses stroke-dasharray to draw a dashed line. When we set
              strokeDashoffset, we shift the pattern, effectively hiding
              the "off" part and showing only the "on" part. This creates
              a smooth arc effect without needing path mathematics. */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringColor}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>

      {/* --- Center Content Overlay ---
          Positioned absolutely over the SVG. flexbox centering ensures
          text aligns perfectly at the ring's center. */}
      {(centerText || centerSubtext) && (
        <View style={styles.centerContent}>
          {centerText && <Text style={styles.centerText}>{centerText}</Text>}
          {centerSubtext && <Text style={styles.centerSubtext}>{centerSubtext}</Text>}
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      position: 'relative',
    },
    // --- Absolute Centering ---
    // Position the text box absolutely with all edges at 0, then use
    // flexbox to center content within. This is a reliable pattern for
    // centering content inside a fixed-size container.
    centerContent: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
    },
    centerText: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 24,
      color: theme.colors.text,
    },
    centerSubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      marginTop: 2,
    },
  });
