/**
 * ============================================================
 * features/journal/screens/NewEntryModal.tsx — New journal entry
 * ============================================================
 *
 * A bottom-sheet modal (not a route) for composing a new entry. Optional prompt
 * row at the top, a multiline text field, and a Save action in the header.
 * iOS pageSheet presentation gives native swipe-down dismiss; onRequestClose
 * covers the Android back button.
 *
 * Append-only (v1): saving creates a new entry and closes. No drafts, no edit.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { journalPrompts } from "../data/prompts";
import { useCreateEntry } from "../hooks/useCreateEntry";
import { PromptChip } from "../components/PromptChip";

interface NewEntryModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NewEntryModal({ visible, onClose }: NewEntryModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const createEntry = useCreateEntry();

  const [text, setText] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>();

  const reset = () => {
    setText("");
    setSelectedPromptId(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const canSave = text.trim().length > 0 && !createEntry.isPending;

  const handleSave = () => {
    if (!canSave) return;
    createEntry.mutate(
      { text: text.trim(), promptId: selectedPromptId },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  const togglePrompt = (id: string) => {
    setSelectedPromptId((current) => (current === id ? undefined : id));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <AnimatedPressable onPress={handleClose} style={styles.headerBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </AnimatedPressable>
          <Text style={styles.title}>New Entry</Text>
          <AnimatedPressable
            onPress={handleSave}
            disabled={!canSave}
            style={styles.headerBtn}
          >
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>
              {createEntry.isPending ? "Saving…" : "Save"}
            </Text>
          </AnimatedPressable>
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.promptsSection}>
            <Text style={styles.promptsLabel}>Need a starting point?</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.promptsRow}
            >
              {journalPrompts.map((prompt) => (
                <PromptChip
                  key={prompt.id}
                  text={prompt.text}
                  selected={selectedPromptId === prompt.id}
                  onPress={() => togglePrompt(prompt.id)}
                />
              ))}
            </ScrollView>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Write whatever's on your mind…"
            placeholderTextColor={theme.colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerBtn: {
      minWidth: 64,
    },
    cancelText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    saveText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.primary,
      textAlign: "right",
    },
    saveTextDisabled: {
      color: theme.colors.textMuted,
    },
    body: {
      flex: 1,
    },
    promptsSection: {
      paddingTop: theme.spacing.md,
    },
    promptsLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    promptsRow: {
      paddingHorizontal: theme.spacing.lg,
    },
    input: {
      flex: 1,
      margin: theme.spacing.lg,
      fontFamily: theme.fonts.body.regular,
      fontSize: 17,
      lineHeight: 26,
      color: theme.colors.text,
    },
  });
