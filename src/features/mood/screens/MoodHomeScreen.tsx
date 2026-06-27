/**
 * ============================================================
 * features/mood/screens/MoodHomeScreen.tsx — Mood check-in + history
 * ============================================================
 *
 * The /mood entry point, all on one page: today's check-in (5-point picker +
 * optional note + save) over a 14-day history of colored dots. Tapping a past
 * day reveals that day's mood and note. One check-in per day — saving again
 * replaces today's entry.
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { MoodEntry, MoodValue } from "../types";
import { moodVisuals } from "../data/moodVisuals";
import { toDateKey } from "../api/moodEntries";
import { useTodayMood } from "../hooks/useTodayMood";
import { useMoodHistory } from "../hooks/useMoodHistory";
import { useCheckInMood } from "../hooks/useCheckInMood";
import { MoodPicker } from "../components/MoodPicker";
import { MoodDot } from "../components/MoodDot";

const MOOD_ACCENT = "#7DAFB4";

function formatLongDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function MoodHomeScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: today } = useTodayMood();
  const { data: history } = useMoodHistory(14);
  const checkIn = useCheckInMood();

  const [selectedValue, setSelectedValue] = useState<MoodValue | undefined>();
  const [note, setNote] = useState("");
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);

  // Seed the picker from today's entry once it loads (keyed on the day's id so
  // it doesn't clobber in-progress edits on refetch).
  useEffect(() => {
    if (today) {
      setSelectedValue(today.value);
      setNote(today.note ?? "");
    }
  }, [today?.id]);

  const historyByDate = useMemo(() => {
    const map = new Map<string, MoodEntry>();
    (history ?? []).forEach((entry) => map.set(entry.id, entry));
    return map;
  }, [history]);

  // The last 14 days, oldest → newest (today on the right). setDate keeps this
  // correct across month boundaries and DST.
  const days = useMemo(() => {
    const arr: { key: string; label: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      arr.push({ key: toDateKey(d.getTime()), label: String(d.getDate()) });
    }
    return arr;
  }, []);

  const selectedHistoryEntry = selectedHistoryDate
    ? historyByDate.get(selectedHistoryDate)
    : undefined;

  const canSave = !!selectedValue && !checkIn.isPending;

  const handleSave = () => {
    if (!selectedValue || checkIn.isPending) return;
    checkIn.mutate({ value: selectedValue, note });
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
          <Text style={styles.title}>Mood</Text>
          <Text style={styles.subtitle}>
            {today
              ? "You've checked in today — update it anytime."
              : "How are you really feeling today?"}
          </Text>
        </View>

        <AnimatedView>
          <View style={styles.card}>
            <MoodPicker selected={selectedValue} onSelect={setSelectedValue} />
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={theme.colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              textAlignVertical="top"
            />
            <AnimatedPressable
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={styles.saveBtnText}>
                {checkIn.isPending
                  ? "Saving…"
                  : today
                    ? "Update check-in"
                    : "Save check-in"}
              </Text>
            </AnimatedPressable>
          </View>
        </AnimatedView>

        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Last 14 days</Text>
          <View style={styles.dotsRow}>
            {days.map((day) => {
              const entry = historyByDate.get(day.key);
              return (
                <MoodDot
                  key={day.key}
                  value={entry?.value}
                  dayLabel={day.label}
                  selected={selectedHistoryDate === day.key}
                  onPress={() =>
                    setSelectedHistoryDate((current) =>
                      current === day.key ? null : day.key
                    )
                  }
                />
              );
            })}
          </View>

          {selectedHistoryEntry && (
            <View style={styles.detailCard}>
              <MaterialCommunityIcons
                name={moodVisuals[selectedHistoryEntry.value].icon}
                size={36}
                color={moodVisuals[selectedHistoryEntry.value].color}
              />
              <View style={styles.detailText}>
                <Text style={styles.detailMood}>
                  {moodVisuals[selectedHistoryEntry.value].label}
                </Text>
                <Text style={styles.detailDate}>
                  {formatLongDate(selectedHistoryEntry.createdAt)}
                </Text>
                <Text style={styles.detailNote}>
                  {selectedHistoryEntry.note || "No note added."}
                </Text>
              </View>
            </View>
          )}
        </View>
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
    noteInput: {
      minHeight: 64,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      lineHeight: 22,
      color: theme.colors.text,
    },
    saveBtn: {
      paddingVertical: 14,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: MOOD_ACCENT,
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
    historySection: {
      marginTop: theme.spacing.xl,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    dotsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: theme.spacing.md,
      justifyContent: "space-between",
    },
    detailCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      marginTop: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    detailText: {
      flex: 1,
      gap: 2,
    },
    detailMood: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    detailDate: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    detailNote: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
  });
