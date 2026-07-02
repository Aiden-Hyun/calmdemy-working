/**
 * ============================================================
 * features/routines/screens/TodosScreen.tsx — To-dos (M6, feat 8)
 * ============================================================
 *
 * A flat list of one-off tasks with quick add (Today / Tomorrow / Someday),
 * check-off, and delete. Incomplete first (dated ascending, then undated),
 * completed at the bottom. A calendar icon opens the month view (feat 9).
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { TodoRow } from "../components/TodoRow";
import { useTodos, useCreateTodo, useToggleTodo, useDeleteTodo } from "../hooks/useTodos";
import { addDaysToKey, dayLabel, todayKey } from "../domain/dateKeys";
import type { Todo } from "../types";

const ACCENT = "#8FA98C";
type WhenChoice = "today" | "tomorrow" | "someday";
const WHEN_CHIPS: { key: WhenChoice; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "someday", label: "Someday" },
];

function subtitleFor(todo: Todo): string | undefined {
  if (todo.done) return undefined;
  if (!todo.dateKey) return "Someday";
  return todo.time ? `${dayLabel(todo.dateKey)} · ${todo.time}` : dayLabel(todo.dateKey);
}

export function TodosScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const { data: todos } = useTodos();
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const [draft, setDraft] = useState("");
  const [when, setWhen] = useState<WhenChoice>("today");

  const sorted = useMemo(() => {
    return [...(todos ?? [])].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (a.done && b.done) return (b.completedAt ?? 0) - (a.completedAt ?? 0);
      if (!!a.dateKey !== !!b.dateKey) return a.dateKey ? -1 : 1;
      if (a.dateKey && b.dateKey && a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
      return b.order - a.order;
    });
  }, [todos]);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    const dateKey =
      when === "today" ? todayKey() : when === "tomorrow" ? addDaysToKey(todayKey(), 1) : undefined;
    createTodo.mutate({ title, dateKey });
    setDraft("");
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>To-dos</Text>
            <Text style={styles.subtitle}>One-off tasks alongside your routine.</Text>
          </View>
          <AnimatedPressable style={styles.calBtn} onPress={() => router.push("/routines/calendar")}>
            <Ionicons name="calendar-outline" size={22} color={theme.colors.text} />
          </AnimatedPressable>
        </View>

        <View style={styles.addCard}>
          <TextInput
            style={styles.addInput}
            placeholder="Add a to-do"
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={add}
            returnKeyType="done"
            maxLength={120}
          />
          <View style={styles.whenRow}>
            <View style={styles.whenChips}>
              {WHEN_CHIPS.map((chip) => {
                const active = chip.key === when;
                return (
                  <AnimatedPressable
                    key={chip.key}
                    style={[styles.whenChip, active && styles.whenChipActive]}
                    onPress={() => setWhen(chip.key)}
                  >
                    <Text style={[styles.whenText, active && styles.whenTextActive]}>
                      {chip.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <AnimatedPressable style={styles.addBtn} onPress={add}>
              <Ionicons name="add" size={22} color={theme.colors.surface} />
            </AnimatedPressable>
          </View>
        </View>

        {sorted.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing to do yet</Text>
            <Text style={styles.emptyBody}>Add a task above — it stays out of your habits.</Text>
          </View>
        ) : (
          <AnimatedView>
            <View style={styles.listCard}>
              {sorted.map((todo) => (
                <TodoRow
                  key={todo.id}
                  todo={todo}
                  subtitle={subtitleFor(todo)}
                  onToggle={() => toggleTodo.mutate({ todoId: todo.id, done: !todo.done })}
                  onDelete={() => deleteTodo.mutate(todo.id)}
                />
              ))}
            </View>
          </AnimatedView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.text,
    },
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    calBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addCard: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    addInput: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
    },
    whenRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    whenChips: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    whenChip: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    whenChipActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    whenText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    whenTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    addBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: ACCENT,
      alignItems: "center",
      justifyContent: "center",
    },
    listCard: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    emptyBody: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
    },
  });
