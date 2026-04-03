/**
 * ============================================================
 * SleepTimerPicker.tsx — Sleep Timer Duration Selector (Modal Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   Provides a modal UI for starting a new sleep timer or managing
 *   an existing one. When a timer is active, shows remaining time and
 *   extend/cancel buttons. When no timer is active, shows preset duration
 *   options for the user to select from.
 *
 * Design Patterns:
 *   - Modal Pattern: Bottom-sheet style modal for timer management
 *   - State Machine: Two distinct UI states:
 *     1. Active: Shows timer display, extend/cancel actions
 *     2. Inactive: Shows preset duration selection and start button
 *   - Strategy Pattern: PRESET_DURATIONS provides predefined options
 *     to reduce user input burden (vs. free-form time entry)
 *   - Observer Pattern: useSleepTimer subscribes to global timer state
 *     via context, re-renders reactively when remaining time changes
 *
 * Key Dependencies:
 *   - useSleepTimer (context hook for timer state and actions)
 *   - formatTimerDisplay (utility for MM:SS formatting)
 *   - useTheme (style injection)
 *
 * Consumed By:
 *   Sleep/meditation content screens with sleep timer affordances
 * ============================================================
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useSleepTimer, formatTimerDisplay } from '../contexts/SleepTimerContext';
import { Theme } from '../theme';

interface SleepTimerPickerProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Preset duration options in minutes.
 *
 * Provides common sleep timer durations to avoid forcing users to
 * enter custom times. These are typical durations for meditation
 * and sleep content.
 */
const PRESET_DURATIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '60 min', minutes: 60 },
  { label: '90 min', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

/**
 * SleepTimerPicker — Modal for sleep timer selection and management.
 *
 * This component uses the useSleepTimer context hook to synchronize with
 * global timer state. It presents two distinct UIs:
 *
 *   1. When isActive: Shows running timer, extend buttons, and cancel
 *   2. When !isActive: Shows preset duration selection and start button
 *
 * The selectedMinutes local state tracks which duration the user has tapped
 * in the duration list (before starting). This is separate from the global
 * timer state managed by useSleepTimer.
 */
export function SleepTimerPicker({ visible, onClose }: SleepTimerPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // --- Global timer state from context: isActive, remainingSeconds ---
  const { isActive, remainingSeconds, startTimer, cancelTimer, extendTimer } = useSleepTimer();
  // --- Local state: tracks which preset duration is selected in the UI ---
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  /**
   * Selects a duration from the preset list.
   * Updates local state; actual timer starts when handleStartTimer is called.
   */
  const handleSelectDuration = (minutes: number) => {
    setSelectedMinutes(minutes);
  };

  /**
   * Starts the timer with the selected duration.
   * Converts minutes to seconds (startTimer expects seconds).
   * Resets local selection state and closes the modal.
   */
  const handleStartTimer = () => {
    if (selectedMinutes) {
      startTimer(selectedMinutes * 60);
      setSelectedMinutes(null);
      onClose();
    }
  };

  /**
   * Cancels an active timer and closes this modal.
   * Delegates to useSleepTimer.cancelTimer to update global state.
   */
  const handleCancelTimer = () => {
    cancelTimer();
    onClose();
  };

  /**
   * Extends the current running timer by the specified minutes.
   * Useful for "just 5 more minutes" interactions.
   * Takes minutes, converts to seconds for the context API.
   */
  const handleExtend = (minutes: number) => {
    extendTimer(minutes * 60);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dismissible backdrop: tapping outside the modal closes it */}
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          {/* Header: Title + Close button */}
          <View style={styles.header}>
            <Text style={styles.title}>Sleep Timer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/*
            --- State Machine: Two distinct UI modes ---
            1. isActive: Display active timer with extend/cancel actions
            2. !isActive: Display duration selection form with start button
          */}

          {/* --- Mode 1: Active Timer Display --- */}
          {isActive && (
            <View style={styles.activeTimerSection}>
              {/* Large timer display showing remaining time */}
              <View style={styles.timerDisplay}>
                <Ionicons name="timer-outline" size={24} color="#7DAFB4" />
                <Text style={styles.timerText}>{formatTimerDisplay(remainingSeconds)}</Text>
              </View>
              <Text style={styles.timerSubtext}>Time remaining</Text>

              {/* Quick extend and cancel actions */}
              <View style={styles.activeActions}>
                {/* Extend button: adds 5 minutes */}
                <TouchableOpacity
                  style={styles.extendButton}
                  onPress={() => handleExtend(5)}
                >
                  <Ionicons name="add" size={18} color="white" />
                  <Text style={styles.extendButtonText}>+5 min</Text>
                </TouchableOpacity>

                {/* Extend button: adds 15 minutes */}
                <TouchableOpacity
                  style={styles.extendButton}
                  onPress={() => handleExtend(15)}
                >
                  <Ionicons name="add" size={18} color="white" />
                  <Text style={styles.extendButtonText}>+15 min</Text>
                </TouchableOpacity>

                {/* Cancel: Stops the active timer */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelTimer}
                >
                  <Text style={styles.cancelButtonText}>Cancel Timer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* --- Mode 2: Duration Selection (no timer active) --- */}
          {!isActive && (
            <>
              <Text style={styles.sectionLabel}>Select Duration</Text>

              {/* Scrollable list of preset durations */}
              <ScrollView
                style={styles.durationList}
                contentContainerStyle={styles.durationListContent}
                showsVerticalScrollIndicator={false}
              >
                {PRESET_DURATIONS.map((duration) => (
                  <TouchableOpacity
                    key={duration.minutes}
                    style={[
                      styles.durationItem,
                      // --- Highlight selected duration with border and color change ---
                      selectedMinutes === duration.minutes && styles.durationItemSelected,
                    ]}
                    onPress={() => handleSelectDuration(duration.minutes)}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        // --- Text brightens when this duration is selected ---
                        selectedMinutes === duration.minutes && styles.durationTextSelected,
                      ]}
                    >
                      {duration.label}
                    </Text>
                    {/* Checkmark icon appears when selected */}
                    {selectedMinutes === duration.minutes && (
                      <Ionicons name="checkmark-circle" size={22} color="#7DAFB4" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/*
                --- Start Button: Disabled until a duration is selected ---
                This enforces client-side validation: user must select a duration
                before the button becomes active. Visual feedback (opacity) indicates
                the disabled state.
              */}
              <TouchableOpacity
                style={[
                  styles.startButton,
                  // --- Disabled opacity when no duration selected ---
                  !selectedMinutes && styles.startButtonDisabled,
                ]}
                onPress={handleStartTimer}
                disabled={!selectedMinutes}
              >
                <Ionicons name="timer-outline" size={20} color="white" />
                <Text style={styles.startButtonText}>
                  {selectedMinutes ? `Start ${selectedMinutes} min Timer` : 'Select a Duration'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/**
 * createStyles — Stylesheet factory for dark-mode sleep timer UI.
 *
 * The sleep timer has a specialized dark background (#1A1D29) distinct from
 * the main theme colors. This memoized factory ensures style stability across
 * re-renders while accommodating theme changes.
 */
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // --- Flex container for bottom-sheet positioning ---
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    // --- Transparent dark overlay covering entire screen ---
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    // --- Bottom-sheet container with dark background ---
    container: {
      backgroundColor: '#1A1D29',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
      maxHeight: '70%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    title: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 20,
      color: '#fff',
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    activeTimerSection: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    timerDisplay: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    timerText: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 48,
      color: '#fff',
    },
    timerSubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      marginTop: 8,
    },
    activeActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 24,
      justifyContent: 'center',
    },
    extendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 20,
    },
    extendButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: '#fff',
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: 'rgba(231,115,115,0.2)',
      borderRadius: 20,
    },
    cancelButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: '#E57373',
    },
    sectionLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: 'rgba(255,255,255,0.6)',
      marginBottom: 12,
    },
    durationList: {
      maxHeight: 300,
    },
    durationListContent: {
      gap: 8,
      paddingBottom: 16,
    },
    durationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 12,
    },
    durationItemSelected: {
      backgroundColor: 'rgba(125,175,180,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(125,175,180,0.4)',
    },
    durationText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
    },
    durationTextSelected: {
      color: '#fff',
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingVertical: 16,
      backgroundColor: '#7DAFB4',
      borderRadius: 16,
      marginTop: 16,
    },
    startButtonDisabled: {
      backgroundColor: 'rgba(125,175,180,0.3)',
    },
    startButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: '#fff',
    },
  });
