/**
 * ============================================================
 * features/routines/screens/HabitEditorScreen.tsx — Create/edit a habit
 * ============================================================
 *
 * Bidirectional editor. Without `habitId` it creates; with `habitId` it loads
 * the habit, prefills, and saves via updateHabit. Fields: name, icon, color,
 * moment anchor (feat 1), repeat (feat 2), difficulty (feat 4), priority
 * (feat 5), and goal tags (feat 22).
 * ============================================================
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { RepeatPicker } from "../components/RepeatPicker";
import { DifficultyPicker } from "../components/DifficultyPicker";
import { PriorityPicker } from "../components/PriorityPicker";
import { GoalTagChips } from "../components/GoalTagChips";
import { useCreateHabit, useHabit, useUpdateHabit } from "../hooks/useHabits";
import { useCreateGoalTag, useGoalTags } from "../hooks/useGoalTags";
import {
  HABIT_COLORS,
  HABIT_ICONS,
  MOMENT_META,
  MOMENT_ORDER,
} from "../data/presets";
import type {
  Difficulty,
  IoniconName,
  Priority,
  RepeatConfig,
  RoutineMoment,
} from "../types";

interface HabitEditorScreenProps {
  habitId?: string;
}

export function HabitEditorScreen({ habitId }: HabitEditorScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const isEditing = !!habitId;

  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const { data: existing, isLoading: loadingHabit } = useHabit(habitId);
  const { data: goalTags } = useGoalTags();
  const createGoalTag = useCreateGoalTag();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IoniconName>(HABIT_ICONS[0]);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [moment, setMoment] = useState<RoutineMoment>("morning");
  const [repeat, setRepeat] = useState<RepeatConfig>({ type: "daily" });
  const [difficulty, setDifficulty] = useState<Difficulty>("plus");
  const [priority, setPriority] = useState<Priority>(2);
  const [shields, setShields] = useState<number>(0);
  const [tagIds, setTagIds] = useState<string[]>([]);

  // Prefill once the habit loads (edit mode), keyed on its id so a refetch
  // doesn't clobber in-progress edits.
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setIcon(existing.icon);
      setColor(existing.color);
      setMoment(existing.moment);
      setRepeat(existing.repeat);
      setDifficulty(existing.difficulty);
      setPriority(existing.priority);
      setShields(existing.shieldsMax);
      setTagIds(existing.goalTagIds);
    }
  }, [existing?.id]);

  const pending = createHabit.isPending || updateHabit.isPending;
  const canSave = name.trim().length > 0 && !pending;

  const toggleTag = (id: string) =>
    setTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));

  const handleCreateTag = async (label: string) => {
    const nextColor = HABIT_COLORS[(goalTags?.length ?? 0) % HABIT_COLORS.length];
    const id = await createGoalTag.mutateAsync({
      label,
      icon: "pricetag-outline",
      color: nextColor,
    });
    setTagIds((prev) => [...prev, id]);
  };

  const handleSave = () => {
    if (!canSave) return;
    const fields = {
      name,
      icon,
      color,
      moment,
      repeat,
      difficulty,
      priority,
      shieldsMax: shields,
      goalTagIds: tagIds,
    };
    if (isEditing && habitId) {
      updateHabit.mutate({ habitId, patch: fields }, { onSuccess: () => router.back() });
    } else {
      createHabit.mutate(fields, { onSuccess: () => router.back() });
    }
  };

  if (isEditing && loadingHabit && !existing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <BackButton />
        <ActivityIndicator style={styles.loader} color="#8FA98C" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? "Edit habit" : "New habit"}</Text>
          <Text style={styles.subtitle}>A small, repeatable step.</Text>
        </View>

        <AnimatedView>
          <View style={styles.card}>
            <TextInput
              style={styles.nameInput}
              placeholder="Habit name (e.g. Drink water)"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={80}
            />

            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {HABIT_ICONS.map((glyph) => {
                const active = glyph === icon;
                return (
                  <AnimatedPressable
                    key={glyph}
                    style={[
                      styles.iconChoice,
                      { backgroundColor: active ? `${color}22` : theme.colors.background },
                      active && { borderColor: color },
                    ]}
                    onPress={() => setIcon(glyph)}
                  >
                    <Ionicons
                      name={glyph}
                      size={20}
                      color={active ? color : theme.colors.textSecondary}
                    />
                  </AnimatedPressable>
                );
              })}
            </View>

            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {HABIT_COLORS.map((hex) => (
                <AnimatedPressable
                  key={hex}
                  style={[
                    styles.colorDot,
                    { backgroundColor: hex },
                    hex === color && styles.colorDotActive,
                  ]}
                  onPress={() => setColor(hex)}
                >
                  {hex === color ? (
                    <Ionicons name="checkmark" size={16} color={theme.colors.surface} />
                  ) : null}
                </AnimatedPressable>
              ))}
            </View>
          </View>
        </AnimatedView>

        <Text style={styles.sectionTitle}>When</Text>
        <View style={styles.momentGrid}>
          {MOMENT_ORDER.map((m) => {
            const active = m === moment;
            return (
              <AnimatedPressable
                key={m}
                style={[styles.momentChip, active && styles.momentChipActive]}
                onPress={() => setMoment(m)}
              >
                <Ionicons
                  name={MOMENT_META[m].icon}
                  size={16}
                  color={active ? "#8FA98C" : theme.colors.textSecondary}
                />
                <Text style={[styles.momentText, active && styles.momentTextActive]}>
                  {MOMENT_META[m].label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Repeat</Text>
        <RepeatPicker value={repeat} onChange={setRepeat} />

        <Text style={styles.sectionTitle}>Difficulty</Text>
        <DifficultyPicker value={difficulty} onChange={setDifficulty} />

        <Text style={styles.sectionTitle}>Priority</Text>
        <PriorityPicker value={priority} onChange={setPriority} />

        <Text style={styles.sectionTitle}>Streak shields</Text>
        <View style={styles.shieldsRow}>
          <AnimatedPressable
            style={styles.shieldStep}
            onPress={() => setShields((s) => Math.max(0, s - 1))}
          >
            <Text style={styles.shieldStepText}>−</Text>
          </AnimatedPressable>
          <Text style={styles.shieldValue}>
            {shields === 0 ? "None" : `${shields} / week`}
          </Text>
          <AnimatedPressable
            style={styles.shieldStep}
            onPress={() => setShields((s) => Math.min(3, s + 1))}
          >
            <Text style={styles.shieldStepText}>+</Text>
          </AnimatedPressable>
        </View>
        <Text style={styles.shieldHint}>
          Shields protect your streak on a day you can’t finish — up to this many
          per week.
        </Text>

        <Text style={styles.sectionTitle}>Goals</Text>
        <GoalTagChips
          tags={goalTags ?? []}
          selectedIds={tagIds}
          onToggle={toggleTag}
          onCreate={handleCreateTag}
        />

        <AnimatedPressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>
            {pending ? "Saving…" : isEditing ? "Save changes" : "Create habit"}
          </Text>
        </AnimatedPressable>
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
    loader: {
      marginTop: theme.spacing.xxl,
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
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    card: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    nameInput: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: theme.colors.text,
    },
    label: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    iconGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    iconChoice: {
      width: 44,
      height: 44,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    colorRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
    },
    colorDot: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 2,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    colorDotActive: {
      borderColor: theme.colors.text,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginTop: theme.spacing.xl,
      marginBottom: theme.spacing.md,
    },
    momentGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    momentChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    momentChipActive: {
      backgroundColor: "#8FA98C22",
      borderColor: "#8FA98C",
    },
    momentText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    momentTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: "#8FA98C",
    },
    shieldsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    shieldStep: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    shieldStepText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 20,
      color: theme.colors.text,
    },
    shieldValue: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    shieldHint: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
    saveBtn: {
      marginTop: theme.spacing.xl,
      paddingVertical: 15,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: "#8FA98C",
      alignItems: "center",
    },
    saveBtnDisabled: {
      backgroundColor: theme.colors.border,
    },
    saveBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.surface,
    },
  });
