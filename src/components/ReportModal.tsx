/**
 * ============================================================
 * ReportModal.tsx — Content Issue Reporting (Modal Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   Implements a comprehensive modal for reporting content issues
 *   (audio problems, wrong content, inappropriate material, etc.).
 *   This integrates with the support/feedback pipeline to surface
 *   user-reported issues to the content team.
 *
 * Design Patterns:
 *   - Modal Pattern: Full-screen sheet modal with keyboard handling
 *   - State Machine: Transitions between form-filling and success states
 *   - Controlled Component: Category selection and description text are
 *     controlled via React state (selectedCategory, description)
 *   - Strategy Pattern: Different report categories with distinct icons
 *     and descriptions help users accurately classify their issue
 *
 * Key Dependencies:
 *   - useTheme (style injection)
 *   - KeyboardAvoidingView (accommodates soft keyboard on mobile)
 *   - ReportCategory type (discriminated union of report types)
 *
 * Consumed By:
 *   Content players and library screens that need feedback mechanisms
 * ============================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../theme';
import { ReportCategory } from '../types';

/**
 * Report category definitions with localized UI strings.
 *
 * This constant list drives the category selection UI. Each entry specifies
 * the category ID (used in the data submission), human-readable label, icon,
 * and description to help users choose the right category.
 */
const REPORT_CATEGORIES: { id: ReportCategory; label: string; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  {
    id: 'audio_issue',
    label: 'Audio Issue',
    icon: 'volume-mute-outline',
    description: "Audio doesn't play, cuts off, or has poor quality",
  },
  {
    id: 'wrong_content',
    label: 'Wrong Content',
    icon: 'swap-horizontal-outline',
    description: "Audio doesn't match the title or description",
  },
  {
    id: 'inappropriate',
    label: 'Inappropriate',
    icon: 'warning-outline',
    description: 'Content seems inappropriate or offensive',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'ellipsis-horizontal-outline',
    description: 'Other issue not listed above',
  },
];

/**
 * ReportModal — Content issue reporting form.
 *
 * This modal collects issue reports from users with:
 *   1. Category selection (required, single-choice)
 *   2. Optional freeform description (max 500 chars)
 *   3. Optimistic success feedback (1.5s message before closing)
 *
 * State Management:
 *   - selectedCategory: Currently selected report category (null = none selected)
 *   - description: Freeform text describing the issue
 *   - isSubmitting: Loading state while awaiting the onSubmit promise
 *   - showSuccess: Displays success message and auto-closes after timeout
 *
 * This implements a Client-Side Validation + Optimistic Feedback pattern:
 * the submit button is disabled until a category is selected, and the
 * success message provides immediate feedback even if the server response
 * is slow.
 */
export function ReportModal({
  visible,
  onClose,
  onSubmit,
  contentTitle,
}: ReportModalProps) {
  const { theme, isDark } = useTheme();
  const styles = React.useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // --- Controlled Component: currently selected category (null = unselected) ---
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  // --- Controlled Component: optional description text ---
  const [description, setDescription] = useState('');
  // --- Loading state during form submission ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- Success state: triggers celebratory message and auto-close ---
  const [showSuccess, setShowSuccess] = useState(false);

  /**
   * Submits the report to the parent (typically a ViewModel).
   * Implements optimistic feedback: shows success message for 1.5 seconds
   * before auto-closing, giving the user immediate positive feedback
   * regardless of server latency.
   */
  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setIsSubmitting(true);
    const success = await onSubmit(selectedCategory, description.trim() || undefined);
    setIsSubmitting(false);

    // --- Optimistic Feedback Pattern: show success immediately, auto-close after delay ---
    if (success) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedCategory(null);
        setDescription('');
        onClose();
      }, 1500);
    }
  };

  /**
   * Handles modal dismissal: resets all form state to defaults.
   *
   * This is a cleanup function ensuring that if the user closes and reopens
   * the modal, it starts fresh (not pre-filled with their last report's data).
   */
  const handleClose = () => {
    setSelectedCategory(null);
    setDescription('');
    setShowSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      {/*
        --- KeyboardAvoidingView: Platform-aware keyboard handling ---
        On iOS, uses 'padding' to shift content up when keyboard appears.
        On Android, uses 'height' to resize container. This prevents the
        soft keyboard from covering form inputs and maintains usability.
      */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {/* Header: Title + close button */}
          <View style={styles.header}>
            <Text style={styles.title}>Report Issue</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Optional: Show the content being reported on */}
          {contentTitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {contentTitle}
            </Text>
          )}

          {/*
            --- State Machine: Two distinct UI states ---
            1. showSuccess = true: Display success celebration message
            2. showSuccess = false: Display category selection form
          */}
          {showSuccess ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text style={styles.successText}>Report Submitted</Text>
              <Text style={styles.successSubtext}>Thank you for your feedback</Text>
            </View>
          ) : (
            <>
              {/* --- Form Content: Category selection and optional description --- */}
              <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Category Options: Single-select radio-button-like UX */}
                <View style={styles.categoriesContainer}>
                  {REPORT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryOption,
                        // --- Highlight selected category with border and background color ---
                        selectedCategory === category.id && styles.categoryOptionSelected,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      {/* Icon: Changes color based on selection state */}
                      <View style={[
                        styles.categoryIcon,
                        // --- Icon background inverts color when selected ---
                        selectedCategory === category.id && styles.categoryIconSelected,
                      ]}>
                        <Ionicons
                          name={category.icon}
                          size={24}
                          color={selectedCategory === category.id ? 'white' : theme.colors.textSecondary}
                        />
                      </View>

                      {/* Label + Description: Guides user to select correct category */}
                      <View style={styles.categoryContent}>
                        <Text style={[
                          styles.categoryLabel,
                          // --- Label turns primary color when selected ---
                          selectedCategory === category.id && styles.categoryLabelSelected,
                        ]}>
                          {category.label}
                        </Text>
                        <Text style={styles.categoryDescription} numberOfLines={2}>
                          {category.description}
                        </Text>
                      </View>

                      {/* Checkmark: Visual confirmation of selection */}
                      {selectedCategory === category.id && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Optional Description Field: Free-form user input */}
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Additional Details (Optional)</Text>
                  <TextInput
                    style={styles.descriptionInput}
                    placeholder="Describe the issue in more detail..."
                    placeholderTextColor={theme.colors.textSecondary}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    textAlignVertical="top"
                  />
                  {/* Character counter: Helps user understand limit */}
                  <Text style={styles.charCount}>{description.length}/500</Text>
                </View>
              </ScrollView>

              {/* --- Action Buttons --- */}
              <View style={styles.actions}>
                {/* Cancel: Dismisses without submitting */}
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                {/*
                  --- Submit: Disabled until category is selected ---
                  This enforces client-side validation: form is invalid until
                  the required category field has a value. Visual feedback
                  (opacity) shows the disabled state.
                */}
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    // --- Disabled state: visually muted ---
                    !selectedCategory && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedCategory || isSubmitting}
                  activeOpacity={0.7}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Report</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * createStyles — Stylesheet factory for theme-aware styling.
 *
 * Memoized to ensure stable object reference across renders,
 * preventing unnecessary style updates in child components.
 */
const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    // --- Semi-transparent overlay + flex container for bottom-sheet layout ---
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    // --- Bottom-sheet container: rounded top corners, max height 80% ---
    container: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
      color: theme.colors.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 20,
    },
    scrollContainer: {
      maxHeight: 350,
    },
    categoriesContainer: {
      gap: 12,
    },
    categoryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 16,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    categoryOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? 'rgba(125, 175, 180, 0.15)' : 'rgba(125, 175, 180, 0.1)',
    },
    categoryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    categoryIconSelected: {
      backgroundColor: theme.colors.primary,
    },
    categoryContent: {
      flex: 1,
    },
    categoryLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 4,
    },
    categoryLabelSelected: {
      color: theme.colors.primary,
    },
    categoryDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      lineHeight: 18,
    },
    descriptionContainer: {
      marginTop: 16,
    },
    descriptionLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 8,
    },
    descriptionInput: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      padding: 14,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
      minHeight: 80,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    charCount: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'right',
      marginTop: 6,
    },
    actions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
    },
    cancelButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    submitButton: {
      flex: 2,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: 'white',
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 40,
    },
    successText: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: theme.colors.text,
      marginTop: 16,
    },
    successSubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 8,
    },
  });
