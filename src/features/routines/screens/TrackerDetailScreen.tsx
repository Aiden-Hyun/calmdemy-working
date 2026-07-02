/**
 * ============================================================
 * features/routines/screens/TrackerDetailScreen.tsx — Tracker detail (M6, feat 10)
 * ============================================================
 *
 * A tracker's trend chart, a "log today" input, recent readings, and delete.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { TrackerChart } from "../components/TrackerChart";
import { useTrackers, useTrackerEntries, useLogTrackerValue, useDeleteTracker } from "../hooks/useTrackers";
import { formatTrackerValue } from "../data/trackerKinds";
import { dayLabel, todayKey } from "../domain/dateKeys";

const ACCENT = "#8FA98C";

interface TrackerDetailScreenProps {
  trackerId: string;
}

export function TrackerDetailScreen({ trackerId }: TrackerDetailScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const { data: trackers, isLoading } = useTrackers();
  const { data: entries } = useTrackerEntries(trackerId, 30);
  const logValue = useLogTrackerValue();
  const deleteTracker = useDeleteTracker();

  const tracker = useMemo(() => (trackers ?? []).find((t) => t.id === trackerId), [trackers, trackerId]);
  const [draft, setDraft] = useState("");

  if (isLoading && !trackers) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <BackButton />
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      </SafeAreaView>
    );
  }

  if (!tracker) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>Tracker not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const latest = entries?.[0];

  const handleLog = () => {
    const value = parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(value)) return;
    logValue.mutate({ trackerId, dateKey: todayKey(), value });
    setDraft("");
  };

  const handleDelete = () => {
    Alert.alert("Delete tracker", `Delete "${tracker.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTracker.mutate(trackerId, { onSuccess: () => router.back() }),
      },
    ]);
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
          <View style={[styles.iconWrap, { backgroundColor: `${tracker.color}22` }]}>
            <Ionicons name={tracker.icon} size={24} color={tracker.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{tracker.name}</Text>
            {latest && (
              <Text style={styles.latest}>
                Latest: {formatTrackerValue(tracker.kind, tracker.unit, latest.value)}
              </Text>
            )}
          </View>
        </View>

        <AnimatedView>
          <View style={styles.card}>
            <TrackerChart entries={entries ?? []} color={tracker.color} />
          </View>
        </AnimatedView>

        <View style={styles.logRow}>
          <TextInput
            style={styles.logInput}
            placeholder={`Log today${tracker.unit ? ` (${tracker.unit})` : ""}`}
            placeholderTextColor={theme.colors.textMuted}
            value={draft}
            onChangeText={setDraft}
            keyboardType="numeric"
            onSubmitEditing={handleLog}
            returnKeyType="done"
          />
          <AnimatedPressable style={styles.logBtn} onPress={handleLog}>
            <Text style={styles.logBtnText}>Log</Text>
          </AnimatedPressable>
        </View>

        {!!entries?.length && (
          <View style={styles.entriesCard}>
            {entries.slice(0, 10).map((entry) => (
              <View key={entry.id} style={styles.entryRow}>
                <Text style={styles.entryDate}>{dayLabel(entry.dateKey)}</Text>
                <Text style={styles.entryValue}>
                  {formatTrackerValue(tracker.kind, tracker.unit, entry.value)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <AnimatedPressable style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.deleteText}>Delete tracker</Text>
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
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 24,
      color: theme.colors.text,
    },
    latest: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    card: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    logRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
    logInput: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
    },
    logBtn: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: ACCENT,
    },
    logBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.surface,
    },
    entriesCard: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    entryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    entryDate: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    entryValue: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.text,
    },
    deleteBtn: {
      marginTop: theme.spacing.lg,
      paddingVertical: 13,
      alignItems: "center",
    },
    deleteText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.textMuted,
    },
  });
