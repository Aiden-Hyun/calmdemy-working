import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useTheme } from "../contexts/ThemeContext";
import { Theme } from "../theme";
import { FirestoreSleepSound } from "../services/firestoreService";
import { useSleepSounds } from '../hooks/queries/useMusicQueries';

/**
 * ============================================================
 * BackgroundAudioPicker.tsx — Sleep Sound Selection Modal
 * ============================================================
 *
 * Architectural Role:
 *   A modal component that lets users browse and select background sleep sounds.
 *   Implements a classic Gatekeeper pattern: the "Off" button is the entry point
 *   to disable background audio entirely. Sound selection is a dual-state toggle
 *   (click to select, click again to deselect).
 *
 * Design Patterns:
 *   - Gatekeeper Pattern: The "Off" button is a checkpoint that disables the
 *     entire background audio feature. Once enabled, users can browse categories
 *     and select a sound.
 *   - Conditional Rendering: Sound item indicators (error, loading, checkmark)
 *     are shown/hidden based on a finite state machine (loading state, success,
 *     error), not boolean flags. This prevents invalid state combinations.
 *   - Category Filtering: Categories are derived dynamically from Firestore data,
 *     then memoized to prevent unnecessary re-renders. Users can filter sounds
 *     by category using tab selection (default: "all").
 *
 * Key Dependencies:
 *   - useSleepSounds() hook: React Query integration for Firestore sound list
 *   - ThemeContext: Theme-aware styling
 *   - Firestore: Sleep sound metadata (title, category, audioPath, color)
 *
 * Consumed By:
 *   MediaPlayer.tsx (via BackgroundAudioPicker in the modal overlay)
 *
 * Note on State Indicators:
 *   The selected sound's status is shown via a 3-way indicator:
 *   - Loading spinner: Audio is being loaded (isAudioReady = false, hasError = false)
 *   - Error icon: Loading failed (hasError = true)
 *   - Checkmark: Audio is ready and playing (isAudioReady = true, hasError = false)
 *   This prevents impossible state combinations (e.g., both loading and error).
 * ============================================================
 */

/**
 * Firestore category icon mapping — links category strings to Ionicon names
 * for visual consistency across the app.
 */
const categoryIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  all: "apps",
  rain: "rainy",
  water: "water",
  fire: "flame",
  wind: "cloudy",
  nature: "leaf",
  ambient: "planet",
};

/**
 * Category label mapping — translates Firestore category slugs to
 * user-friendly display labels (e.g., "rain" → "Rain").
 */
const categoryLabels: Record<string, string> = {
  all: "All",
  rain: "Rain",
  water: "Water",
  fire: "Fire",
  wind: "Wind",
  nature: "Nature",
  ambient: "Ambient",
};

interface BackgroundAudioPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedSoundId: string | null;
  loadingSoundId: string | null;
  isAudioReady: boolean;
  hasError: boolean;
  volume: number;
  isEnabled: boolean;
  onSelectSound: (soundId: string | null, audioPath: string | null) => void;
  onVolumeChange: (volume: number) => void;
  onToggleEnabled: (enabled: boolean) => void;
}

/**
 * BackgroundAudioPicker — Modal UI for browsing and selecting background sleep sounds.
 *
 * The component manages two local concerns:
 *   1. activeCategory: The currently selected category filter (starts at "all")
 *   2. Visual indicator state: Derived from parent props (selectedSoundId, isAudioReady, hasError)
 *
 * @param visible - Whether the modal is shown
 * @param onClose - Callback to close the modal
 * @param selectedSoundId - ID of the currently selected sound (or null if none)
 * @param loadingSoundId - ID of the sound currently loading audio (for UI feedback)
 * @param isAudioReady - Whether the selected sound's audio has finished loading
 * @param hasError - Whether the selected sound encountered a loading error
 * @param volume - Current volume level (0–1), controlled by parent
 * @param isEnabled - Whether background audio is globally enabled
 * @param onSelectSound - Callback when user taps a sound (receives soundId and audioPath, or null to deselect)
 * @param onVolumeChange - Callback when user adjusts the volume slider
 * @param onToggleEnabled - Callback to toggle the "enabled" state (called when selecting a sound while disabled)
 */
export function BackgroundAudioPicker({
  visible,
  onClose,
  selectedSoundId,
  loadingSoundId,
  isAudioReady,
  hasError,
  volume,
  isEnabled,
  onSelectSound,
  onVolumeChange,
  onToggleEnabled,
}: BackgroundAudioPickerProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Local filter state: tracks which category is currently active
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // React Query hook: fetches all sleep sounds from Firestore, cached automatically
  const { data: allSounds = [], isLoading: loadingSounds } = useSleepSounds();

  /**
   * Derive available categories dynamically from Firestore data.
   * Always includes "all" at the beginning (before alphabetical sort).
   * Memoized to prevent unnecessary recalculations on every render.
   *
   * This implements the Observable pattern: as new sounds are added to Firestore,
   * the category list automatically updates without hardcoding category values.
   */
  const categories = useMemo(() => {
    const uniqueCats = [...new Set(allSounds.map((s) => s.category))];
    // Sort alphabetically and add 'all' at the beginning
    return ["all", ...uniqueCats.sort()];
  }, [allSounds]);

  /**
   * Filter sounds based on the active category tab.
   * If "all" is selected, show all sounds; otherwise, filter by category.
   * Memoized for performance (filtering is O(n), only recalculate on category/data change).
   */
  const filteredSounds = useMemo(
    () => activeCategory === "all"
      ? allSounds
      : allSounds.filter((sound) => sound.category === activeCategory),
    [activeCategory, allSounds]
  );

  /**
   * Handles sound selection/deselection (toggle behavior).
   * If the tapped sound is already selected, tapping again deselects it.
   * Also auto-enables the background audio feature if the user selects a sound while disabled.
   *
   * This implements the Gatekeeper pattern: sound selection is the trigger to enable
   * background audio. The parent ViewModel owns the actual state changes.
   */
  const handleSoundSelect = (sound: FirestoreSleepSound) => {
    if (selectedSoundId === sound.id) {
      // Toggle: deselect if already selected
      onSelectSound(null, null);
    } else {
      onSelectSound(sound.id, sound.audioPath);
      // Auto-enable background audio when selecting a sound (convenience UX)
      if (!isEnabled) {
        onToggleEnabled(true);
      }
    }
  };

  /**
   * Turns off background audio entirely (Gatekeeper pattern).
   * Clears the selected sound and disables the feature.
   */
  const handleTurnOff = () => {
    onToggleEnabled(false);
    onSelectSound(null, null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.container}>
          {/* --- Render Phase 1: Header --- */}
          <View style={styles.header}>
            <Text style={styles.title}>Background Sound</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>

          {/* --- Render Phase 2: Off Button (Gatekeeper) --- */}
          {/* This button is the primary control to disable background audio entirely.
              When pressed, it disables the feature and clears the selected sound.
              Visually highlighted when background audio is disabled (!isEnabled).
              This is the Gatekeeper pattern: a single checkpoint to control feature access. */}
          <TouchableOpacity
            style={[
              styles.offButton,
              !isEnabled && styles.offButtonActive,
            ]}
            onPress={handleTurnOff}
          >
            <Ionicons
              name="volume-mute"
              size={20}
              color={!isEnabled ? "#fff" : "rgba(255,255,255,0.6)"}
            />
            <Text
              style={[
                styles.offButtonText,
                !isEnabled && styles.offButtonTextActive,
              ]}
            >
              Off
            </Text>
          </TouchableOpacity>

          {/* --- Render Phase 3: Volume Slider --- */}
          {/* Only shown when background audio is enabled. Volume is global (0–1),
              applies to whichever sound is currently selected. */}
          <View style={styles.volumeSection}>
            <View style={styles.volumeHeader}>
              <Ionicons name="volume-low" size={18} color="rgba(255,255,255,0.6)" />
              <Text style={styles.volumeLabel}>Volume</Text>
              <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.6)" />
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              onValueChange={onVolumeChange}
              minimumTrackTintColor="rgba(255,255,255,0.8)"
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor="#fff"
            />
          </View>

          {/* --- Render Phase 4: Category Tabs (Horizontal Scroll) --- */}
          {/* Dynamically derived categories from Firestore data.
              Users tap a tab to filter the sound list. Always includes "all" (shows all sounds).
              Categories are discovered at runtime, not hardcoded. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScrollView}
            contentContainerStyle={styles.categoryTabs}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryTab,
                  activeCategory === cat && styles.categoryTabActive,
                ]}
                onPress={() => setActiveCategory(cat)}
              >
                <Ionicons
                  name={categoryIcons[cat] || "ellipse"}
                  size={16}
                  color={
                    activeCategory === cat
                      ? "#fff"
                      : "rgba(255,255,255,0.5)"
                  }
                />
                <Text
                  style={[
                    styles.categoryTabText,
                    activeCategory === cat && styles.categoryTabTextActive,
                  ]}
                >
                  {categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* --- Render Phase 5: Sound List --- */}
          {/* List of sleep sounds filtered by active category. Each item shows:
              - Icon (from Firestore, colored with sound.color)
              - Title
              - Status indicator (error, loading spinner, or checkmark)

              The indicator state is a finite state machine with three possible states:
              - Error state (red ×): showError = true (selected + hasError)
              - Loading state (spinner): isLoading = true (selected + !isAudioReady + !hasError)
              - Success state (green ✓): showCheckmark = true (selected + isAudioReady + !hasError)
              - Unselected: no indicator

              This pattern prevents invalid combinations (e.g., both loading and error shown).
              Toggle behavior: tap a sound to select it; tap again to deselect.
          */}
          <ScrollView
            style={styles.soundList}
            showsVerticalScrollIndicator={false}
          >
            {loadingSounds ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#7DAFB4" />
              </View>
            ) : filteredSounds.map((sound) => {
              // --- State Machine: Derive indicator state from props ---
              const isThisSoundSelected = selectedSoundId === sound.id && isEnabled;
              // Show error if this sound is selected and has error
              const showError = isThisSoundSelected && hasError;
              // Show loading if this sound is selected but audio is not ready and no error
              const isLoading = isThisSoundSelected && !isAudioReady && !hasError;
              // Only show checkmark if selected AND audio is actually ready
              const showCheckmark = isThisSoundSelected && isAudioReady && !hasError;
              


              return (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.soundItem,
                    isThisSoundSelected && styles.soundItemActive,
                    showError && styles.soundItemError,
                  ]}
                  onPress={() => handleSoundSelect(sound)}
                >
                  {/* Sound Icon — Color-tinted circle from Firestore sound metadata */}
                  <View
                    style={[
                      styles.soundIcon,
                      { backgroundColor: `${sound.color}30` },
                    ]}
                  >
                    <Ionicons
                      name={sound.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={sound.color}
                    />
                  </View>

                  {/* Sound Title */}
                  <Text style={styles.soundTitle}>{sound.title}</Text>

                  {/* Status Indicator — Finite state machine with mutually exclusive outcomes */}
                  {showError ? (
                    // Error state: Red × icon (audio failed to load)
                    <Ionicons
                      name="close-circle"
                      size={22}
                      color="#E57373"
                    />
                  ) : isLoading ? (
                    // Loading state: Spinner (audio is buffering)
                    <ActivityIndicator size="small" color="#7DAFB4" />
                  ) : showCheckmark ? (
                    // Success state: Green ✓ (audio loaded and ready)
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#7DAFB4"
                    />
                  ) : null}
                  {/* No indicator shown for unselected sounds */}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    container: {
      backgroundColor: "#1A1D29",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      height: "75%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    title: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 20,
      color: "#fff",
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },
    offButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: "rgba(255,255,255,0.08)",
      gap: 8,
      marginBottom: 16,
    },
    offButtonActive: {
      backgroundColor: "rgba(231,115,115,0.2)",
    },
    offButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: "rgba(255,255,255,0.6)",
    },
    offButtonTextActive: {
      color: "#E57373",
    },
    volumeSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    volumeHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    volumeLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: "rgba(255,255,255,0.6)",
    },
    slider: {
      width: "100%",
      height: 40,
    },
    categoryScrollView: {
      maxHeight: 44,
      marginBottom: 16,
    },
    categoryTabs: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 8,
    },
    categoryTab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: "rgba(255,255,255,0.06)",
      gap: 6,
    },
    categoryTabActive: {
      backgroundColor: "rgba(125,175,180,0.3)",
    },
    categoryTabText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: "rgba(255,255,255,0.5)",
    },
    categoryTabTextActive: {
      color: "#fff",
    },
    soundList: {
      flex: 1,
      paddingHorizontal: 20,
    },
    soundItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: 8,
      backgroundColor: "rgba(255,255,255,0.04)",
    },
    soundItemActive: {
      backgroundColor: "rgba(125,175,180,0.15)",
    },
    soundItemError: {
      backgroundColor: "rgba(229,115,115,0.15)",
    },
    soundIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    soundTitle: {
      flex: 1,
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: "#fff",
    },
    loadingContainer: {
      paddingVertical: 40,
      alignItems: "center",
    },
  });

