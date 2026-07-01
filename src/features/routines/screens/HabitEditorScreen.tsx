/**
 * ============================================================
 * features/routines/screens/HabitEditorScreen.tsx — Create a habit (M1)
 * ============================================================
 *
 * Minimal create form for feature 1 + 2: name, icon, color, moment anchor, and
 * repeat cadence. Attribute pickers (difficulty, priority, goal tags, reminders)
 * are added in later milestones; this screen already stores their type-safe
 * defaults via createHabit.
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
import { RepeatPicker } from "../components/RepeatPicker";
import { useCreateHabit } from "../hooks/useHabits";
import {
  HABIT_COLORS,
  HABIT_ICONS,
  MOMENT_META,
  MOMENT_ORDER,
} from "../data/presets";
import type { IoniconName, RepeatConfig, RoutineMoment } from "../types";

export function HabitEditorScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const createHabit = useCreateHabit();

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<IoniconName>(HABIT_ICONS[0]);
  const [color, setColor] = useState<string>(HABIT_COLORS[0]);
  const [moment, setMoment] = useState<RoutineMoment>("morning");
  const [repeat, setRepeat] = useState<RepeatConfig>({ type: "daily" });

  const canSave = name.trim().length > 0 && !createHabit.isPending;

  const handleSave = () => {
    if (!canSave) return;
    createHabit.mutate(
      { name, icon, color, moment, repeat },
      { onSuccess: () => router.back() }
    );
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
          <Text style={styles.title}>New habit</Text>
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

        <AnimatedPressable
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>
            {createHabit.isPending ? "Saving…" : "Create habit"}
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
