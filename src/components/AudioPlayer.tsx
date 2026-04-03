import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';

/**
 * ============================================================
 * AudioPlayer.tsx — Controlled Audio Playback Component
 * ============================================================
 *
 * Architectural Role:
 *   A presentational, fully controlled component that renders a media player UI
 *   with progress tracking, playback controls (play/pause, skip, speed, loop),
 *   and a modal speed picker. This is a classic Controlled Component — the parent
 *   owns all state (isPlaying, position, duration, etc.) and the AudioPlayer
 *   merely invokes callbacks (onPlay, onPause, onSeek, onPlaybackRateChange).
 *
 * Design Patterns:
 *   - Controlled Component: All state lives in the parent (useAudioPlayer hook).
 *     This component is stateless except for UI-local concerns like the speed
 *     picker modal visibility and temp speed value during adjustment.
 *   - Feature Toggles: showSpeedControl, showLoopControl, showSkipControls
 *     allow conditional rendering of optional controls, useful for different
 *     content types or subscription tiers.
 *   - Compound Component principles: The component composes Slider, Icons, and
 *     a Modal picker — each focused on a specific UI concern.
 *
 * Key Dependencies:
 *   - ThemeContext: For theme-aware styling (colors, fonts, spacing)
 *   - @react-native-community/slider: Progress and speed adjustment sliders
 *   - Ionicons: Icon glyphs for play/pause, speed, loop states
 *
 * Consumed By:
 *   MediaPlayer.tsx and other screens that need a standalone audio player UI
 *   (not tied to lifecycle/state management).
 *
 * Note on State:
 *   The speed picker modal manages two bits of local state:
 *   - showSpeedPicker: visibility flag (UI-local concern)
 *   - tempSpeed: intermediate value during slider adjustment (avoids thrashing
 *     the parent's playback rate on every drag event)
 * ============================================================
 */

// Speed range
const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;

interface AudioPlayerProps {
  isPlaying: boolean;
  isLoading: boolean;
  duration: number;
  position: number;
  progress: number;
  formattedPosition: string;
  formattedDuration: string;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (position: number) => void;
  title?: string;
  subtitle?: string;
  // Playback controls
  playbackRate?: number;
  isLooping?: boolean;
  onPlaybackRateChange?: (rate: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onToggleLoop?: () => void;
  // Feature toggles
  showSpeedControl?: boolean;
  showLoopControl?: boolean;
  showSkipControls?: boolean;
}

/**
 * AudioPlayer — Renders a controlled audio playback interface with progress,
 * speed control, loop toggle, and skip buttons. All state is owned by the parent;
 * this component is a pure presentational layer that fires callbacks.
 *
 * @param isPlaying - Whether audio is currently playing
 * @param isLoading - Whether audio is buffering
 * @param duration - Total duration in seconds
 * @param position - Current playback position in seconds
 * @param progress - Normalized progress (0–1)
 * @param formattedPosition - Pre-formatted position string (e.g., "2:45")
 * @param formattedDuration - Pre-formatted duration string (e.g., "10:30")
 * @param onPlay - Callback to start playback
 * @param onPause - Callback to pause playback
 * @param onSeek - Callback to seek to a position (receives position in seconds)
 * @param onPlaybackRateChange - Callback when user confirms a new playback rate
 * @param onToggleLoop - Callback to toggle loop state
 * @param onSkipBack - Callback to skip backward (typically 15s)
 * @param onSkipForward - Callback to skip forward (typically 15s)
 * @param showSpeedControl - Feature flag to show/hide speed button (default: true)
 * @param showLoopControl - Feature flag to show/hide loop button (default: true)
 * @param showSkipControls - Feature flag to show/hide skip buttons (default: true)
 */
export function AudioPlayer({
  isPlaying,
  isLoading,
  duration,
  position,
  formattedPosition,
  formattedDuration,
  onPlay,
  onPause,
  onSeek,
  title,
  subtitle,
  playbackRate = 1.0,
  isLooping = false,
  onPlaybackRateChange,
  onSkipBack,
  onSkipForward,
  onToggleLoop,
  showSpeedControl = true,
  showLoopControl = true,
  showSkipControls = true,
}: AudioPlayerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [showSpeedPicker, setShowSpeedPicker] = useState(false);

  // Temporary speed during slider adjustment — synced to parent on "Done" press.
  // This prevents thrashing the parent's playback rate on every drag event (Optimistic Updates pattern).
  const [tempSpeed, setTempSpeed] = useState(playbackRate);

  /**
   * Handles continuous slider movement in the speed picker modal.
   * Rounds to nearest 0.1x increment for a snappy feel.
   */
  const handleSpeedChange = (value: number) => {
    // Round to nearest 0.1
    const rounded = Math.round(value * 10) / 10;
    setTempSpeed(rounded);
  };

  /**
   * Confirms the speed adjustment and closes the modal.
   * Fires the parent's onPlaybackRateChange callback to persist the change.
   */
  const handleSpeedConfirm = () => {
    onPlaybackRateChange?.(tempSpeed);
    setShowSpeedPicker(false);
  };

  /**
   * Resets playback speed to 1.0x (normal) and confirms immediately.
   * Useful for quick "back to normal" gesture without slider adjustment.
   */
  const handleResetSpeed = () => {
    setTempSpeed(1.0);
    onPlaybackRateChange?.(1.0);
  };

  /**
   * Opens the speed picker modal and syncs the temporary speed value
   * to the current playback rate, ensuring the slider starts at the
   * correct position. This prevents the slider from jumping unexpectedly.
   */
  const handleOpenSpeedPicker = () => {
    setTempSpeed(playbackRate);
    setShowSpeedPicker(true);
  };

  return (
    <View style={styles.container}>
      {/* --- Render Phase 1: Optional Title/Subtitle --- */}
      {(title || subtitle) && (
        <View style={styles.infoContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}

      {/* --- Render Phase 2: Progress Bar & Time Display --- */}
      <View style={styles.progressContainer}>
        <Text style={styles.timeText}>{formattedPosition}</Text>
        <Slider
          style={styles.slider}
          value={position}
          minimumValue={0}
          maximumValue={duration}
          onSlidingComplete={onSeek}
          minimumTrackTintColor="white"
          maximumTrackTintColor="rgba(255,255,255,0.3)"
          thumbTintColor="white"
          disabled={isLoading || duration === 0}
        />
        <Text style={styles.timeText}>{formattedDuration}</Text>
      </View>

      {/* --- Render Phase 3: Large Play/Pause Button --- */}
      {/* This is the primary control. The toggle is direct: if isPlaying, show pause;
          otherwise show play. Disabled while loading to prevent double-taps during buffering. */}
      <View style={styles.playButtonContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={isPlaying ? onPause : onPlay}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="large" />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={44}
              color="white"
              style={isPlaying ? {} : { marginLeft: 6 }}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* --- Render Phase 4: Secondary Controls (Loop, Skip, Speed) --- */}
      {/* This row conditionally renders optional controls based on feature flags.
          Each control independently checks its own flag and callback availability. */}
      <View style={styles.secondaryControls}>
        {/* Loop Button — Conditional rendering: only show if feature enabled and callback exists */}
        {showLoopControl && onToggleLoop && (
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onToggleLoop}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityLabel={isLooping ? 'Loop on' : 'Loop off'}
          >
            <Ionicons
              name="repeat"
              size={22}
              // Color changes on toggle: white when active, muted when inactive (visual feedback)
              color={isLooping ? 'white' : 'rgba(255,255,255,0.5)'}
            />
            {/* Small dot indicator appears when loop is on (additional visual feedback) */}
            {isLooping && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        )}

        {/* Skip Back 15s — Conditional rendering: only show if feature enabled and callback exists */}
        {showSkipControls && onSkipBack && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipBack}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityLabel="Rewind 15 seconds"
          >
            <Text style={styles.skipButtonText}>−15s</Text>
          </TouchableOpacity>
        )}

        {/* Skip Forward 15s — Conditional rendering: only show if feature enabled and callback exists */}
        {showSkipControls && onSkipForward && (
          <TouchableOpacity
            style={styles.skipButton}
            onPress={onSkipForward}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityLabel="Forward 15 seconds"
          >
            <Text style={styles.skipButtonText}>+15s</Text>
          </TouchableOpacity>
        )}

        {/* Speed Button — Opens modal for fine-grained speed adjustment.
            Shows the current rate; highlights if non-default (1.0x).
            Conditional rendering: only show if feature enabled and callback exists. */}
        {showSpeedControl && onPlaybackRateChange && (
          <TouchableOpacity
            style={styles.speedButton}
            onPress={handleOpenSpeedPicker}
            disabled={isLoading}
            activeOpacity={0.7}
            accessibilityLabel={`Playback speed ${playbackRate}x`}
          >
            <Text style={[styles.speedText, playbackRate !== 1.0 && styles.speedTextActive]}>
              {playbackRate === 1.0 ? '1x' : `${playbackRate.toFixed(1)}x`}
            </Text>
            {/* Indicator dot shows when speed is non-default (visual affordance) */}
            {playbackRate !== 1.0 && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        )}
      </View>

      {/* --- Render Phase 5: Speed Picker Modal --- */}
      {/* Modal with slider for fine-grained speed control (0.5x–2.0x in 0.1x increments).
          Separate from the main render because it's a secondary interaction modal.
          The temporary speed state (tempSpeed) allows smooth slider interaction
          without thrashing the parent's playback rate on every movement. */}
      <Modal
        visible={showSpeedPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSpeedPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSpeedPicker(false)}
        >
          {/* Inner container with stopPropagation to prevent closing modal when tapping inside the picker */}
          <Pressable style={styles.speedPickerContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.speedPickerTitle}>Playback Speed</Text>

            {/* --- Speed Display Section --- */}
            {/* Large display of the current (or being adjusted) speed.
                "Normal" label appears at 1.0x as a affordance hint. */}
            <View style={styles.speedDisplayContainer}>
              <Text style={styles.speedDisplayValue}>{tempSpeed.toFixed(1)}x</Text>
              {tempSpeed === 1.0 && (
                <Text style={styles.speedDisplayLabel}>Normal</Text>
              )}
            </View>

            {/* --- Slider Section --- */}
            {/* Horizontal slider with labeled endpoints (MIN_SPEED to MAX_SPEED).
                Uses tempSpeed (intermediate state) to avoid parent re-renders on every drag.
                The parent only updates when user taps "Done". */}
            <View style={styles.speedSliderContainer}>
              <Text style={styles.speedSliderLabel}>{MIN_SPEED}x</Text>
              <Slider
                style={styles.speedSlider}
                value={tempSpeed}
                minimumValue={MIN_SPEED}
                maximumValue={MAX_SPEED}
                step={0.1}
                onValueChange={handleSpeedChange}
                minimumTrackTintColor={theme.colors.primary}
                maximumTrackTintColor={theme.colors.gray[300]}
                thumbTintColor={theme.colors.primary}
              />
              <Text style={styles.speedSliderLabel}>{MAX_SPEED}x</Text>
            </View>

            {/* --- Action Buttons --- */}
            {/* Two buttons: "Reset to 1x" (instantly applies 1.0x) and "Done" (confirms current tempSpeed).
                This dual-action pattern lets users quickly reset or confirm custom speeds. */}
            <View style={styles.speedActions}>
              <TouchableOpacity
                style={styles.speedResetButton}
                onPress={handleResetSpeed}
                activeOpacity={0.7}
              >
                <Text style={styles.speedResetText}>Reset to 1x</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.speedConfirmButton}
                onPress={handleSpeedConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.speedConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.md,
    },
    infoContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: 'white',
      textAlign: 'center',
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: 'rgba(255,255,255,0.7)',
      marginTop: theme.spacing.xs,
      textAlign: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.sm,
    },
    slider: {
      flex: 1,
      height: 40,
      marginHorizontal: theme.spacing.sm,
    },
    timeText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: 'rgba(255,255,255,0.7)',
      minWidth: 42,
      textAlign: 'center',
    },
    // Large Play Button
    playButtonContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    playButton: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Secondary Controls
    secondaryControls: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xl,
    },
    controlButton: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeIndicator: {
      position: 'absolute',
      bottom: 2,
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: 'white',
    },
    // Skip Buttons
    skipButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    skipButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: 'rgba(255,255,255,0.9)',
      letterSpacing: 0.5,
    },
    // Speed Button
    speedButton: {
      height: 48,
      paddingHorizontal: theme.spacing.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    speedText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: 'rgba(255,255,255,0.5)',
    },
    speedTextActive: {
      color: 'white',
    },
    // Speed Picker Modal
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    speedPickerContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.xl,
      width: '85%',
      maxWidth: 340,
      ...theme.shadows.lg,
    },
    speedPickerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    speedDisplayContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    speedDisplayValue: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 48,
      color: theme.colors.primary,
    },
    speedDisplayLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.textLight,
      marginTop: theme.spacing.xs,
    },
    speedSliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
    },
    speedSlider: {
      flex: 1,
      height: 40,
      marginHorizontal: theme.spacing.sm,
    },
    speedSliderLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.textLight,
      minWidth: 32,
      textAlign: 'center',
    },
    speedActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    speedResetButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.gray[100],
      alignItems: 'center',
    },
    speedResetText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.text,
    },
    speedConfirmButton: {
      flex: 1,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    speedConfirmText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: 'white',
    },
  });
