/**
 * ============================================================
 * SoundPlayer.tsx — Sleep/Ambient Sound Player (Controlled Component)
 * ============================================================
 *
 * Architectural Role:
 *   A fully controlled presentation component for playing ambient/sleep sounds.
 *   Displays player UI (play/pause, loop toggle, timer presets) and delegates
 *   all state changes to parent callbacks. This is a pure View in MVVM.
 *
 * Design Patterns:
 *   - Controlled Component: All state (isPlaying, isLooping, timerMinutes,
 *     remainingSeconds) is passed as props; no local state except UI-only.
 *   - Strategy Pattern: TIMER_PRESETS provides preset durations to avoid
 *     free-form time entry, making the UI simpler and faster to use.
 *   - Factory Pattern: formatTimer utility encapsulates time formatting logic
 *
 * Key Dependencies:
 *   - useTheme (color/style injection)
 *   - Parent component manages audio playback state (via props callbacks)
 *
 * Consumed By:
 *   Sleep/meditation content screens that play ambient sounds
 * ============================================================
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

interface SoundPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  isLooping: boolean;
  timerMinutes: number | null; // null = no timer (infinite when looping)
  remainingSeconds: number;
  onPlay: () => void;
  onPause: () => void;
  onToggleLoop: () => void;
  onSetTimer: (minutes: number | null) => void;
  title?: string;
  description?: string;
  iconName?: string;
  iconColor?: string;
}

/**
 * Preset timer durations (in minutes).
 *
 * Provides common sleep timer lengths. 'Off' sets timerMinutes to null,
 * allowing infinite looping. This is the Strategy pattern — predefined options
 * reduce decision fatigue and simplify the UI.
 */
const TIMER_PRESETS = [
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '45', value: 45 },
  { label: 'Off', value: null },
];

/**
 * SoundPlayer — Sleep/ambient sound player UI component.
 *
 * A Controlled Component that receives all state as props and calls parent
 * callbacks for state changes. Displays:
 *   - Sound icon and title/description
 *   - Timer display (countdown or "Continuous")
 *   - Timer preset buttons (15, 30, 45 min, Off)
 *   - Playback controls (Repeat toggle, Play/Pause, Moon icon)
 *   - Optional loop indicator
 *
 * All audio control logic is delegated to the parent; this component
 * is purely presentation and user input routing.
 */
export function SoundPlayer({
  isPlaying,
  isLoading,
  isLooping,
  timerMinutes,
  remainingSeconds,
  onPlay,
  onPause,
  onToggleLoop,
  onSetTimer,
  title,
  description,
  iconName = 'musical-notes',
  iconColor = '#C9B896',
}: SoundPlayerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  /**
   * Formats remaining seconds into MM:SS display format.
   *
   * Pads seconds with leading zero (e.g., 65 seconds -> "1:05").
   * Returns "0:00" for zero or negative values.
   */
  const formatTimer = (seconds: number): string => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* --- Sound Icon: Visual representation of the content --- */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={64}
          color={iconColor}
        />
      </View>

      {/* --- Content Metadata: Title and description --- */}
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}

      {/*
        --- Timer Display: Shows remaining time or "Continuous" ---
        Conditional rendering based on timerMinutes:
        - null: No timer set, plays indefinitely ("Continuous")
        - number: Countdown timer in MM:SS format
      */}
      <View style={styles.timerContainer}>
        {timerMinutes !== null ? (
          // --- Active timer: show countdown ---
          <>
            <Ionicons name="time-outline" size={20} color={theme.colors.sleepTextMuted} />
            <Text style={styles.timerText}>{formatTimer(remainingSeconds)}</Text>
          </>
        ) : (
          // --- No timer: show infinite loop indicator ---
          <>
            <Ionicons name="infinite" size={20} color={theme.colors.sleepTextMuted} />
            <Text style={styles.timerText}>Continuous</Text>
          </>
        )}
      </View>

      {/*
        --- Timer Preset Buttons: Quick selection strategy ---
        Provides predefined timer durations (15, 30, 45, Off) to avoid
        forcing users into a time-picker. The active preset is highlighted.
        This is the Strategy pattern — reduce user input to taps.
      */}
      <View style={styles.timerPresets}>
        {TIMER_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={[
              styles.presetButton,
              // --- Highlight the active timer preset ---
              timerMinutes === preset.value && styles.presetButtonActive,
            ]}
            onPress={() => onSetTimer(preset.value)}
          >
            <Text
              style={[
                styles.presetText,
                // --- Text color changes when preset is active ---
                timerMinutes === preset.value && styles.presetTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/*
        --- Playback Controls: Repeat, Play/Pause, Placeholder ---
        Three-button layout for symmetry:
          Left: Repeat toggle (active when isLooping = true)
          Center: Large Play/Pause (shows spinner while loading)
          Right: Placeholder (moon icon) for visual balance
      */}
      <View style={styles.controls}>
        {/*
          --- Repeat Toggle: Cycles through loop modes ---
          Color changes when looping is active. Clicking toggles loop on/off.
        */}
        <TouchableOpacity
          style={[styles.controlButton, isLooping && styles.controlButtonActive]}
          onPress={onToggleLoop}
        >
          <Ionicons
            name="repeat"
            size={28}
            color={isLooping ? theme.colors.sleepAccent : theme.colors.sleepTextMuted}
          />
        </TouchableOpacity>

        {/*
          --- Play/Pause Main Button ---
          Large button toggles between play and pause.
          While loading, shows spinner instead of icon.
          The marginLeft: 6 on play icon is a visual alignment hack
          to account for the play triangle's visual center.
        */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={isPlaying ? onPause : onPlay}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.sleepBackground} size="large" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={48}
              color={theme.colors.sleepBackground}
              // --- Visual alignment: play icon needs slight right offset ---
              style={isPlaying ? {} : { marginLeft: 6 }}
            />
          )}
        </TouchableOpacity>

        {/*
          --- Placeholder Button: Visual symmetry ---
          A non-interactive placeholder to balance the three-button layout.
          Shows a moon icon to thematically tie to sleep content.
        */}
        <View style={styles.controlButton}>
          <Ionicons name="moon" size={28} color={theme.colors.sleepTextMuted} />
        </View>
      </View>

      {/*
        --- Loop Status Indicator ---
        Shown only when looping is active. Provides extra clarity that
        the sound will repeat until the timer expires.
      */}
      {isLooping && (
        <Text style={styles.loopIndicator}>
          Looping until timer ends
        </Text>
      )}
    </View>
  );
}

/**
 * createStyles — Theme-aware stylesheet factory for sound player.
 *
 * Provides responsive spacing and color system based on theme.
 * Memoized to ensure stable references across renders.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // --- Main container: centers all elements vertically ---
    container: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
    // --- Circular container for sound icon ---
    iconContainer: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.sleepText,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    description: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: theme.colors.sleepTextMuted,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    timerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    timerText: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 32,
      color: theme.colors.sleepText,
    },
    timerPresets: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xxl,
    },
    presetButton: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.sleepSurface,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    presetButtonActive: {
      borderColor: theme.colors.sleepAccent,
      backgroundColor: `${theme.colors.sleepAccent}20`,
    },
    presetText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.sleepTextMuted,
    },
    presetTextActive: {
      color: theme.colors.sleepAccent,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
    },
    playButton: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.sleepAccent,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.colors.sleepSurface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    controlButtonActive: {
      backgroundColor: `${theme.colors.sleepAccent}30`,
    },
    loopIndicator: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
      marginTop: theme.spacing.sm,
    },
  });

