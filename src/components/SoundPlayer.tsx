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

const TIMER_PRESETS = [
  { label: '15', value: 15 },
  { label: '30', value: 30 },
  { label: '45', value: 45 },
  { label: 'Off', value: null },
];

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

  const formatTimer = (seconds: number): string => {
    if (seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Sound Icon */}
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={64}
          color={iconColor}
        />
      </View>

      {/* Title & Description */}
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        {timerMinutes !== null ? (
          <>
            <Ionicons name="time-outline" size={20} color={theme.colors.sleepTextMuted} />
            <Text style={styles.timerText}>{formatTimer(remainingSeconds)}</Text>
          </>
        ) : (
          <>
            <Ionicons name="infinite" size={20} color={theme.colors.sleepTextMuted} />
            <Text style={styles.timerText}>Continuous</Text>
          </>
        )}
      </View>

      {/* Timer Presets */}
      <View style={styles.timerPresets}>
        {TIMER_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.label}
            style={[
              styles.presetButton,
              timerMinutes === preset.value && styles.presetButtonActive,
            ]}
            onPress={() => onSetTimer(preset.value)}
          >
            <Text
              style={[
                styles.presetText,
                timerMinutes === preset.value && styles.presetTextActive,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Playback Controls */}
      <View style={styles.controls}>
        {/* Repeat Button */}
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

        {/* Play/Pause Button */}
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
              style={isPlaying ? {} : { marginLeft: 6 }}
            />
          )}
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={styles.controlButton}>
          <Ionicons name="moon" size={28} color={theme.colors.sleepTextMuted} />
        </View>
      </View>

      {/* Loop indicator */}
      {isLooping && (
        <Text style={styles.loopIndicator}>
          Looping until timer ends
        </Text>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.xxl,
    },
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

