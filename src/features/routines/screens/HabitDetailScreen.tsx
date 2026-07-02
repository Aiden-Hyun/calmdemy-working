/**
 * ============================================================
 * features/routines/screens/HabitDetailScreen.tsx — Habit detail (M3)
 * ============================================================
 *
 * One habit's page: its current streak + shields (feat 6), a summary of its
 * schedule/attributes, and Edit / Archive actions. The monthly heatmap
 * (feature 16) lands here in M8.
 *
 * Streak + shields are derived from a bounded completion-range query (needs the
 * (habitId, dateKey) composite index).
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { StreakBadge } from "../components/StreakBadge";
import { useHabit, useArchiveHabit } from "../hooks/useHabits";
import { useCompletionsRange } from "../hooks/useHabitCompletions";
import { useGoalTags } from "../hooks/useGoalTags";
import { computeStreak, shieldsRemaining } from "../domain/streaks";
import { addDaysToKey, todayKey } from "../domain/dateKeys";
import { MOMENT_META } from "../data/presets";
import { DIFFICULTY_META } from "../data/difficulty";
import type { RepeatConfig } from "../types";

const ACCENT = "#8FA98C";
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRIORITY_LABELS: Record<number, string> = { 1: "Low", 2: "Medium", 3: "High" };

function describeRepeat(repeat: RepeatConfig): string {
  switch (repeat.type) {
    case "daily":
      return "Every day";
    case "weekly":
      return "Once a week";
    case "weekdays":
      return repeat.days.length
        ? repeat.days.map((d) => WEEKDAY_LABELS[d]).join(", ")
        : "No days set";
    case "times-per-week":
      return `${repeat.target}× per week`;
  }
}

interface HabitDetailScreenProps {
  habitId: string;
}

export function HabitDetailScreen({ habitId }: HabitDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const { data: habit, isLoading } = useHabit(habitId);
  const archive = useArchiveHabit();
  const { data: goalTags } = useGoalTags();

  const today = todayKey();
  const rangeStart = addDaysToKey(today, -180);
  const { data: completions } = useCompletionsRange(habitId, rangeStart, today);

  const streak = useMemo(
    () => (habit ? computeStreak(habit, completions ?? []) : { value: 0, unit: "day" as const }),
    [habit, completions]
  );
  const shields = useMemo(
    () => (habit ? shieldsRemaining(habit, completions ?? [], "week") : 0),
    [habit, completions]
  );

  const tagLabels = useMemo(() => {
    if (!habit || !goalTags) return [];
    return goalTags.filter((t) => habit.goalTagIds.includes(t.id));
  }, [habit, goalTags]);

  if (isLoading && !habit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <BackButton />
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      </SafeAreaView>
    );
  }

  if (!habit) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>Habit not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleArchive = () => {
    Alert.alert("Archive habit", `Archive "${habit.name}"? Its history is kept.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => archive.mutate(habitId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: `${habit.color}22` }]}>
            <Ionicons name={habit.icon} size={26} color={habit.color} />
          </View>
          <Text style={styles.title}>{habit.name}</Text>
        </View>

        <AnimatedView>
          <StreakBadge
            value={streak.value}
            unit={streak.unit}
            shieldsRemaining={shields}
            shieldsMax={habit.shieldsMax}
          />
        </AnimatedView>

        <View style={styles.detailCard}>
          <DetailRow icon="repeat-outline" label="Repeat" value={describeRepeat(habit.repeat)} theme={theme} />
          <DetailRow
            icon={MOMENT_META[habit.moment].icon}
            label="When"
            value={habit.scheduledTime ?? MOMENT_META[habit.moment].label}
            theme={theme}
          />
          <DetailRow
            icon="speedometer-outline"
            label="Difficulty"
            value={DIFFICULTY_META[habit.difficulty].label}
            theme={theme}
          />
          <DetailRow
            icon="flag-outline"
            label="Priority"
            value={PRIORITY_LABELS[habit.priority]}
            theme={theme}
          />
        </View>

        {tagLabels.length > 0 && (
          <View style={styles.tagRow}>
            {tagLabels.map((tag) => (
              <View
                key={tag.id}
                style={[styles.tagChip, { backgroundColor: `${tag.color}22`, borderColor: tag.color }]}
              >
                <Ionicons name={tag.icon} size={13} color={tag.color} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.label}</Text>
              </View>
            ))}
          </View>
        )}

        <AnimatedPressable
          style={styles.timerBtn}
          onPress={() =>
            router.push({ pathname: "/routines/timer", params: { label: habit.name } })
          }
        >
          <Ionicons name="timer-outline" size={18} color={ACCENT} />
          <Text style={styles.timerBtnText}>Start focus timer</Text>
        </AnimatedPressable>

        <AnimatedPressable
          style={styles.editBtn}
          onPress={() =>
            router.push({ pathname: "/routines/habit/[id]/edit", params: { id: habitId } })
          }
        >
          <Ionicons name="create-outline" size={18} color={theme.colors.surface} />
          <Text style={styles.editBtnText}>Edit habit</Text>
        </AnimatedPressable>

        <AnimatedPressable style={styles.archiveBtn} onPress={handleArchive}>
          <Text style={styles.archiveBtnText}>Archive habit</Text>
        </AnimatedPressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  theme: Theme;
}) {
  const styles = createStyles(theme);
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color={theme.colors.textSecondary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loader: {
      marginTop: theme.spacing.xxl,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 24,
      color: theme.colors.text,
    },
    detailCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    detailLabel: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    detailValue: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.text,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    tagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
    },
    tagText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
    },
    timerBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: theme.spacing.xl,
      paddingVertical: 14,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderColor: ACCENT,
    },
    timerBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: ACCENT,
    },
    editBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: theme.spacing.md,
      paddingVertical: 15,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: ACCENT,
    },
    editBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.surface,
    },
    archiveBtn: {
      marginTop: theme.spacing.md,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.xl,
      alignItems: "center",
    },
    archiveBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
  });
