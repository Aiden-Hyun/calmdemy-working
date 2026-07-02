/**
 * ============================================================
 * features/routines/screens/RoutinesHomeScreen.tsx — Today (M1 + M2)
 * ============================================================
 *
 * The /routines entry point. Today's due habits grouped by moment, each
 * tap-to-check (feat 1); long-press for Done / Rest day / Clear / Edit
 * (feat 3 + edit). Within a moment, habits sort by priority (feat 5). A goal-tag
 * filter row narrows the list to one tag (feat 22).
 *
 * "Due today" is decided per habit by isDueToday (feat 2 — incl. weekly quota).
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { HabitRow } from "../components/HabitRow";
import { useHabits } from "../hooks/useHabits";
import {
  useTodayCompletions,
  useToggleCompletion,
  useWeekCompletions,
} from "../hooks/useHabitCompletions";
import { useGoalTags } from "../hooks/useGoalTags";
import { isDueToday } from "../domain/repeat";
import { todayKey } from "../domain/dateKeys";
import { MOMENT_META, MOMENT_ORDER } from "../data/presets";
import type { CompletionState, Habit } from "../types";

const ACCENT = "#8FA98C";

function todaySubtitle(habit: Habit): string {
  if (habit.scheduledTime) return habit.scheduledTime;
  return MOMENT_META[habit.moment].label;
}

export function RoutinesHomeScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const { data: habits, isLoading } = useHabits();
  const { data: completions } = useTodayCompletions();
  const { data: weekCompletions } = useWeekCompletions();
  const { data: goalTags } = useGoalTags();
  const toggle = useToggleCompletion();
  const dateKey = todayKey();

  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  // State by habit id for today (absence = not done).
  const stateByHabit = useMemo(() => {
    const map = new Map<string, CompletionState>();
    (completions ?? []).forEach((c) => map.set(c.habitId, c.state));
    return map;
  }, [completions]);

  // Fulfilling (done/shielded) completions per habit this week — drives the
  // times-per-week / weekly quota.
  const weekDoneByHabit = useMemo(() => {
    const map = new Map<string, number>();
    (weekCompletions ?? []).forEach((c) => {
      if (c.state === "done" || c.state === "shielded") {
        map.set(c.habitId, (map.get(c.habitId) ?? 0) + 1);
      }
    });
    return map;
  }, [weekCompletions]);

  // Goal tags actually used by a live habit — only these get a filter chip.
  const usedTags = useMemo(() => {
    const used = new Set<string>();
    (habits ?? []).forEach((h) => {
      if (!h.archivedAt) h.goalTagIds.forEach((id) => used.add(id));
    });
    return (goalTags ?? []).filter((t) => used.has(t.id));
  }, [habits, goalTags]);

  // Today's due, non-archived habits (optionally tag-filtered), grouped into
  // moment sections and sorted by priority within each.
  const sections = useMemo(() => {
    const now = new Date();
    const due = (habits ?? []).filter((h) => {
      if (h.archivedAt) return false;
      if (filterTagId && !h.goalTagIds.includes(filterTagId)) return false;
      const st = stateByHabit.get(h.id);
      return isDueToday(h, now, {
        handledToday: st === "done" || st === "rest" || st === "shielded",
        weekDoneCount: weekDoneByHabit.get(h.id) ?? 0,
      });
    });
    return MOMENT_ORDER.map((moment) => ({
      moment,
      meta: MOMENT_META[moment],
      items: due
        .filter((h) => h.moment === moment)
        .sort((a, b) => b.priority - a.priority || a.order - b.order),
    })).filter((section) => section.items.length > 0);
  }, [habits, stateByHabit, weekDoneByHabit, filterTagId]);

  const totalDue = useMemo(
    () => sections.reduce((sum, s) => sum + s.items.length, 0),
    [sections]
  );
  const doneCount = useMemo(() => {
    let n = 0;
    sections.forEach((s) =>
      s.items.forEach((h) => {
        const st = stateByHabit.get(h.id);
        if (st === "done" || st === "rest" || st === "shielded") n += 1;
      })
    );
    return n;
  }, [sections, stateByHabit]);

  const mutate = (habit: Habit, nextState: CompletionState | null) =>
    toggle.mutate({
      habitId: habit.id,
      profileId: habit.profileId,
      dateKey,
      nextState,
    });

  const handleToggle = (habit: Habit) => {
    const current = stateByHabit.get(habit.id);
    mutate(habit, current === "done" ? null : "done");
  };

  const handleLongPress = (habit: Habit) => {
    Alert.alert(habit.name, "Set today", [
      { text: "Done", onPress: () => mutate(habit, "done") },
      { text: "Rest day", onPress: () => mutate(habit, "rest") },
      { text: "Clear", style: "destructive", onPress: () => mutate(habit, null) },
      {
        text: "Edit habit",
        onPress: () =>
          router.push({
            pathname: "/routines/habit/[id]/edit",
            params: { id: habit.id },
          }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const hasHabits = (habits ?? []).some((h) => !h.archivedAt);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.subtitle}>
              {hasHabits ? `${doneCount} of ${totalDue} done` : "Build your daily routine"}
            </Text>
          </View>
          <AnimatedPressable
            style={styles.addBtn}
            onPress={() => router.push("/routines/habit/new")}
          >
            <Ionicons name="add" size={26} color={theme.colors.surface} />
          </AnimatedPressable>
        </View>

        {usedTags.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <AnimatedPressable
              style={[styles.filterChip, !filterTagId && styles.filterChipActive]}
              onPress={() => setFilterTagId(null)}
            >
              <Text style={[styles.filterText, !filterTagId && styles.filterTextActive]}>
                All
              </Text>
            </AnimatedPressable>
            {usedTags.map((tag) => {
              const active = filterTagId === tag.id;
              return (
                <AnimatedPressable
                  key={tag.id}
                  style={[
                    styles.filterChip,
                    active && { backgroundColor: `${tag.color}22`, borderColor: tag.color },
                  ]}
                  onPress={() => setFilterTagId(active ? null : tag.id)}
                >
                  <Ionicons
                    name={tag.icon}
                    size={13}
                    color={active ? tag.color : theme.colors.textSecondary}
                  />
                  <Text style={[styles.filterText, active && { color: tag.color }]}>
                    {tag.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        )}

        {isLoading && !habits ? (
          <ActivityIndicator style={styles.loader} color={ACCENT} />
        ) : !hasHabits ? (
          <AnimatedView>
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="repeat-outline" size={26} color={ACCENT} />
              </View>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptyBody}>
                Add your first habit to start building a routine you can keep.
              </Text>
              <AnimatedPressable
                style={styles.emptyBtn}
                onPress={() => router.push("/routines/habit/new")}
              >
                <Text style={styles.emptyBtnText}>Add a habit</Text>
              </AnimatedPressable>
            </View>
          </AnimatedView>
        ) : totalDue === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              {filterTagId ? "Nothing here today" : "Nothing scheduled today"}
            </Text>
            <Text style={styles.emptyBody}>
              {filterTagId
                ? "No habits with this goal are due today."
                : "None of your habits repeat today. Enjoy the breather."}
            </Text>
          </View>
        ) : (
          sections.map((section) => (
            <AnimatedView key={section.moment}>
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <Ionicons
                    name={section.meta.icon}
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.sectionTitle}>{section.meta.label}</Text>
                </View>
                {section.items.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    state={stateByHabit.get(habit.id)}
                    subtitle={todaySubtitle(habit)}
                    onToggle={() => handleToggle(habit)}
                    onLongPress={() => handleLongPress(habit)}
                  />
                ))}
              </View>
            </AnimatedView>
          ))
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
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: ACCENT,
      alignItems: "center",
      justifyContent: "center",
    },
    filterRow: {
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      paddingRight: theme.spacing.lg,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 7,
      paddingHorizontal: 13,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    filterText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    filterTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    loader: {
      marginTop: theme.spacing.xxl,
    },
    section: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionHead: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
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
    emptyIcon: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${ACCENT}22`,
      marginBottom: theme.spacing.xs,
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
    emptyBtn: {
      marginTop: theme.spacing.sm,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: ACCENT,
      alignItems: "center",
    },
    emptyBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.surface,
    },
  });
