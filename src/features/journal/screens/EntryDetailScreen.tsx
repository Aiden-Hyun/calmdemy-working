/**
 * ============================================================
 * features/journal/screens/EntryDetailScreen.tsx — Entry detail
 * ============================================================
 *
 * Full-screen read view for a single journal entry (route /journal/[id]).
 * Shows the date, the prompt it was written against (if any), and the full
 * text. Read-only in v1 — no edit/delete.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { useJournalEntry } from "../hooks/useJournalEntries";
import { getPromptById } from "../data/prompts";

interface EntryDetailScreenProps {
  entryId: string;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function EntryDetailScreen({ entryId }: EntryDetailScreenProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: entry, isLoading } = useJournalEntry(entryId);
  const prompt = entry?.promptId ? getPromptById(entry.promptId) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>Entry</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !entry ? (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.notFound}>This entry couldn't be found.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
          {prompt && (
            <View style={styles.promptCard}>
              <Ionicons name="bulb-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.promptText}>{prompt.text}</Text>
            </View>
          )}
          <Text style={styles.body}>{entry.text}</Text>
        </ScrollView>
      )}
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
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    notFound: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    date: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.md,
    },
    promptCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    promptText: {
      flex: 1,
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
    body: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 17,
      lineHeight: 28,
      color: theme.colors.text,
    },
  });
