/**
 * ============================================================
 * features/journal/components/EntryCard.tsx — Journal entry preview
 * ============================================================
 *
 * A tappable card in the journal list: date, an optional "prompted" marker, and
 * a 3-line preview of the entry text. Presentational — navigation is the
 * parent's concern.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { JournalEntry } from "../types";
import { getPromptById } from "../data/prompts";

interface EntryCardProps {
  entry: JournalEntry;
  onPress: () => void;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EntryCard({ entry, onPress }: EntryCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const prompt = entry.promptId ? getPromptById(entry.promptId) : undefined;

  return (
    <AnimatedPressable style={styles.card} onPress={onPress}>
      <View style={styles.meta}>
        <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
        {prompt && (
          <View style={styles.promptTag}>
            <Ionicons name="bulb-outline" size={12} color={theme.colors.textMuted} />
            <Text style={styles.promptText} numberOfLines={1}>
              {prompt.text}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.preview} numberOfLines={3}>
        {entry.text}
      </Text>
    </AnimatedPressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    meta: {
      marginBottom: theme.spacing.xs,
    },
    date: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    promptTag: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginTop: 2,
    },
    promptText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    preview: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
  });
