/**
 * ============================================================
 * features/cbt/screens/GratitudeExerciseScreen.tsx — Gratitude
 * ============================================================
 *
 * The one non-StepFlow method: pick an optional prompt (or skip) and write what
 * you're grateful for, then save. Single screen — a guided flow would be
 * overkill for a one-field exercise. Persists { prompt?, text } on save.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { gratitudePrompts } from "../data/gratitudePrompts";
import { getCbtMethod } from "../data/methods";
import { useCreateCbtEntry } from "../hooks/useCreateCbtEntry";

const GRATITUDE_ACCENT = getCbtMethod("gratitude")?.color ?? "#D4A5A5";

export function GratitudeExerciseScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const createEntry = useCreateCbtEntry();

  const [text, setText] = useState("");
  const [selectedPromptId, setSelectedPromptId] = useState<string | undefined>();

  const selectedPrompt = gratitudePrompts.find((p) => p.id === selectedPromptId);
  const canSave = text.trim().length > 0 && !createEntry.isPending;

  const handleSave = () => {
    if (!canSave) return;
    const steps: Record<string, string> = { text: text.trim() };
    if (selectedPrompt) steps.prompt = selectedPrompt.text;
    createEntry.mutate(
      { method: "gratitude", steps },
      { onSuccess: () => router.back() }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Gratitude</Text>
        <AnimatedPressable onPress={handleSave} disabled={!canSave} style={styles.backBtn}>
          <Text style={[styles.save, !canSave && styles.saveDisabled]}>
            {createEntry.isPending ? "…" : "Save"}
          </Text>
        </AnimatedPressable>
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.promptsSection}>
          <Text style={styles.promptsLabel}>Pick a prompt, or just start writing.</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptsRow}
          >
            {gratitudePrompts.map((prompt) => {
              const selected = selectedPromptId === prompt.id;
              return (
                <AnimatedPressable
                  key={prompt.id}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: `${GRATITUDE_ACCENT}22`, borderColor: GRATITUDE_ACCENT },
                  ]}
                  onPress={() =>
                    setSelectedPromptId((current) =>
                      current === prompt.id ? undefined : prompt.id
                    )
                  }
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                    numberOfLines={2}
                  >
                    {prompt.text}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </View>

        <TextInput
          style={styles.input}
          placeholder="What are you grateful for?"
          placeholderTextColor={theme.colors.textMuted}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    backBtn: {
      minWidth: 56,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    save: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.primary,
    },
    saveDisabled: {
      color: theme.colors.textMuted,
    },
    body: {
      flex: 1,
    },
    promptsSection: {
      paddingTop: theme.spacing.sm,
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
    chip: {
      width: 200,
      padding: theme.spacing.md,
      marginRight: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    chipText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    chipTextSelected: {
      color: theme.colors.text,
      fontFamily: theme.fonts.ui.medium,
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
