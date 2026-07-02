/**
 * ============================================================
 * features/routines/screens/TodoCalendarScreen.tsx — To-do calendar (M6, feat 9)
 * ============================================================
 *
 * A month grid of dated to-dos. Days with tasks show a dot; tapping a day lists
 * that day's to-dos below with quick add / check-off / delete. The month view
 * is a `dateKey`-range query (getTodosForRange) — no stored calendar structure.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { TodoRow } from "../components/TodoRow";
import { useTodosForMonth, useCreateTodo, useToggleTodo, useDeleteTodo } from "../hooks/useTodos";
import { dayLabel, fromDateKey, monthBounds, toDateKey, todayKey } from "../domain/dateKeys";

const ACCENT = "#8FA98C";
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function TodoCalendarScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [monthAnchor, setMonthAnchor] = useState(todayKey());
  const [selectedDay, setSelectedDay] = useState(todayKey());
  const [draft, setDraft] = useState("");

  const { data: monthTodos } = useTodosForMonth(monthAnchor);
  const createTodo = useCreateTodo();
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const month = useMemo(() => {
    const first = fromDateKey(monthBounds(monthAnchor).start);
    const year = first.getFullYear();
    const m = first.getMonth();
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(toDateKey(new Date(year, m, d).getTime()));
    return {
      year,
      m,
      cells,
      label: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    };
  }, [monthAnchor]);

  const countByDay = useMemo(() => {
    const map = new Map<string, { total: number; done: number }>();
    (monthTodos ?? []).forEach((t) => {
      if (!t.dateKey) return;
      const entry = map.get(t.dateKey) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (t.done) entry.done += 1;
      map.set(t.dateKey, entry);
    });
    return map;
  }, [monthTodos]);

  const dayTodos = useMemo(
    () =>
      (monthTodos ?? [])
        .filter((t) => t.dateKey === selectedDay)
        .sort((a, b) => (a.done === b.done ? b.order - a.order : a.done ? 1 : -1)),
    [monthTodos, selectedDay]
  );

  const shiftMonth = (delta: number) =>
    setMonthAnchor(toDateKey(new Date(month.year, month.m + delta, 1).getTime()));

  const addForDay = () => {
    const title = draft.trim();
    if (!title) return;
    createTodo.mutate({ title, dateKey: selectedDay });
    setDraft("");
  };

  const today = todayKey();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>Calendar</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.monthNav}>
            <AnimatedPressable style={styles.navBtn} onPress={() => shiftMonth(-1)}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </AnimatedPressable>
            <Text style={styles.monthLabel}>{month.label}</Text>
            <AnimatedPressable style={styles.navBtn} onPress={() => shiftMonth(1)}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </AnimatedPressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS.map((label, i) => (
              <View key={`wd-${i}`} style={styles.cell}>
                <Text style={styles.weekday}>{label}</Text>
              </View>
            ))}
            {month.cells.map((key, index) => {
              if (!key) return <View key={`blank-${index}`} style={styles.cell} />;
              const count = countByDay.get(key);
              const isSelected = key === selectedDay;
              const isToday = key === today;
              const allDone = count ? count.done >= count.total : false;
              return (
                <AnimatedPressable
                  key={key}
                  style={styles.cell}
                  onPress={() => setSelectedDay(key)}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isSelected && styles.daySelected,
                      isToday && !isSelected && styles.dayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        isSelected && styles.dayNumSelected,
                        isToday && !isSelected && styles.dayNumToday,
                      ]}
                    >
                      {Number(key.slice(8, 10))}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: !count
                          ? "transparent"
                          : allDone
                            ? theme.colors.border
                            : ACCENT,
                      },
                    ]}
                  />
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.dayHeading}>{dayLabel(selectedDay)}</Text>

        <View style={styles.addRow}>
          <TextInput
            style={styles.addInput}
            placeholder="Add a to-do for this day"
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={addForDay}
            returnKeyType="done"
            maxLength={120}
          />
          <AnimatedPressable style={styles.addBtn} onPress={addForDay}>
            <Ionicons name="add" size={22} color={theme.colors.surface} />
          </AnimatedPressable>
        </View>

        {dayTodos.length === 0 ? (
          <Text style={styles.emptyNote}>No to-dos on this day.</Text>
        ) : (
          <View style={styles.listCard}>
            {dayTodos.map((todo) => (
              <TodoRow
                key={todo.id}
                todo={todo}
                subtitle={todo.time}
                onToggle={() => toggleTodo.mutate({ todoId: todo.id, done: !todo.done })}
                onDelete={() => deleteTodo.mutate(todo.id)}
              />
            ))}
          </View>
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
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.text,
    },
    card: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    monthLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
    },
    cell: {
      width: "14.28%",
      alignItems: "center",
      paddingVertical: 4,
    },
    weekday: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 11,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    dayInner: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    daySelected: {
      backgroundColor: ACCENT,
    },
    dayToday: {
      borderWidth: 1,
      borderColor: ACCENT,
    },
    dayNum: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.text,
    },
    dayNumSelected: {
      fontFamily: theme.fonts.ui.semiBold,
      color: theme.colors.surface,
    },
    dayNumToday: {
      color: ACCENT,
      fontFamily: theme.fonts.ui.semiBold,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 2.5,
      marginTop: 3,
    },
    dayHeading: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    addInput: {
      flex: 1,
      paddingVertical: 11,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
    },
    addBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: ACCENT,
      alignItems: "center",
      justifyContent: "center",
    },
    listCard: {
      marginTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    emptyNote: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.md,
    },
  });
