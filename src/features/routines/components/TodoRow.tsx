/**
 * ============================================================
 * features/routines/components/TodoRow.tsx — One to-do (feat 8)
 * ============================================================
 *
 * A checkable to-do line: circle toggle, title + optional subtitle, and an
 * optional trailing delete. Presentational — handlers come from props.
 *
 * Layout note: the row is a plain full-width View (a column child stretches to
 * full width), and the text sits in a `flex: 1` Pressable. We deliberately do
 * NOT wrap the flex area in AnimatedPressable — that component puts the style
 * (incl. flex) on an inner Animated.View while its outer Pressable stays
 * content-sized, which collapses the text to zero width inside a row.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import type { Todo } from "../types";

const ACCENT = "#8FA98C";

interface TodoRowProps {
  todo: Todo;
  subtitle?: string;
  onToggle: () => void;
  onDelete?: () => void;
}

export function TodoRow({ todo, subtitle, onToggle, onDelete }: TodoRowProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <AnimatedPressable style={styles.check} onPress={onToggle}>
        <Ionicons
          name={todo.done ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={todo.done ? ACCENT : theme.colors.border}
        />
      </AnimatedPressable>
      <Pressable style={styles.textArea} onPress={onToggle}>
        <Text style={[styles.title, todo.done && styles.titleDone]} numberOfLines={1}>
          {todo.title}
        </Text>
        {!!subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </Pressable>
      {onDelete && (
        <AnimatedPressable style={styles.trash} onPress={onDelete}>
          <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
        </AnimatedPressable>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    check: {
      paddingVertical: 2,
    },
    textArea: {
      flex: 1,
    },
    title: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
    },
    titleDone: {
      color: theme.colors.textMuted,
      textDecorationLine: "line-through",
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    trash: {
      padding: 6,
    },
  });
