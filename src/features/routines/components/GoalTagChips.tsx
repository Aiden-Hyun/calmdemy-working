/**
 * ============================================================
 * features/routines/components/GoalTagChips.tsx — Goal-tag multi-select (feat 22)
 * ============================================================
 *
 * Toggleable tag chips used in the habit editor to assign goal tags. When an
 * `onCreate` handler is passed, a "+ New" chip reveals an inline field for
 * adding a custom tag (cross-platform — no iOS-only Alert.prompt).
 *
 * Controlled: parent owns `selectedIds` and toggles via `onToggle`.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { GoalTag } from "../types";

interface GoalTagChipsProps {
  tags: GoalTag[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onCreate?: (label: string) => void;
}

export function GoalTagChips({ tags, selectedIds, onToggle, onCreate }: GoalTagChipsProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const label = draft.trim();
    if (label && onCreate) onCreate(label);
    setDraft("");
    setAdding(false);
  };

  return (
    <View style={styles.wrap}>
      {tags.map((tag) => {
        const active = selectedIds.includes(tag.id);
        return (
          <AnimatedPressable
            key={tag.id}
            style={[
              styles.chip,
              active && { backgroundColor: `${tag.color}22`, borderColor: tag.color },
            ]}
            onPress={() => onToggle(tag.id)}
          >
            <Ionicons
              name={tag.icon}
              size={14}
              color={active ? tag.color : theme.colors.textSecondary}
            />
            <Text style={[styles.chipText, active && { color: tag.color }]}>{tag.label}</Text>
          </AnimatedPressable>
        );
      })}

      {onCreate && !adding && (
        <AnimatedPressable style={styles.addChip} onPress={() => setAdding(true)}>
          <Ionicons name="add" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.chipText}>New</Text>
        </AnimatedPressable>
      )}

      {onCreate && adding && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Tag name"
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            autoFocus
            maxLength={24}
            onSubmitEditing={submit}
            returnKeyType="done"
          />
          <AnimatedPressable style={styles.addConfirm} onPress={submit}>
            <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
          </AnimatedPressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      alignItems: "center",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
    },
    chipText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    addInput: {
      minWidth: 120,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.text,
    },
    addConfirm: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "#8FA98C",
      alignItems: "center",
      justifyContent: "center",
    },
  });
