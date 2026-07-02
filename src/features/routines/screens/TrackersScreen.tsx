/**
 * ============================================================
 * features/routines/screens/TrackersScreen.tsx — Trackers list (M6, feat 10)
 * ============================================================
 *
 * Lists numeric trackers and lets the user add one (name, unit, kind). Tapping
 * a tracker opens its detail (chart + logging).
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
import { useTrackers, useCreateTracker } from "../hooks/useTrackers";
import { TRACKER_KINDS } from "../data/trackerKinds";
import type { TrackerKind } from "../types";

const ACCENT = "#8FA98C";

export function TrackersScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();

  const { data: trackers } = useTrackers();
  const createTracker = useCreateTracker();

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [kind, setKind] = useState<TrackerKind>("number");

  const canCreate = name.trim().length > 0 && !createTracker.isPending;

  const handleCreate = () => {
    if (!canCreate) return;
    createTracker.mutate(
      { name, unit, kind, icon: "stats-chart-outline", color: ACCENT },
      {
        onSuccess: () => {
          setName("");
          setUnit("");
          setKind("number");
          setAdding(false);
        },
      }
    );
  };

  const list = trackers ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>Trackers</Text>
          <Text style={styles.subtitle}>Log a number each day and watch the trend.</Text>
        </View>

        <View style={styles.list}>
          {list.map((tracker) => (
            <AnimatedView key={tracker.id}>
              <AnimatedPressable
                style={styles.row}
                onPress={() =>
                  router.push({ pathname: "/routines/tracker/[id]", params: { id: tracker.id } })
                }
              >
                <View style={[styles.iconWrap, { backgroundColor: `${tracker.color}22` }]}>
                  <Ionicons name={tracker.icon} size={20} color={tracker.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {tracker.name}
                  </Text>
                  {!!tracker.unit && <Text style={styles.unit}>{tracker.unit}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
              </AnimatedPressable>
            </AnimatedView>
          ))}
        </View>

        {adding ? (
          <View style={styles.addCard}>
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. Weight)"
              placeholderTextColor={theme.colors.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
            <TextInput
              style={styles.input}
              placeholder="Unit (e.g. kg) — optional"
              placeholderTextColor={theme.colors.textMuted}
              value={unit}
              onChangeText={setUnit}
              maxLength={16}
            />
            <View style={styles.kindRow}>
              {TRACKER_KINDS.map((k) => {
                const active = k.key === kind;
                return (
                  <AnimatedPressable
                    key={k.key}
                    style={[styles.kindChip, active && styles.kindChipActive]}
                    onPress={() => setKind(k.key)}
                  >
                    <Text style={[styles.kindText, active && styles.kindTextActive]}>{k.label}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <AnimatedPressable
              style={[styles.createBtn, !canCreate && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!canCreate}
            >
              <Text style={styles.createBtnText}>
                {createTracker.isPending ? "Saving…" : "Add tracker"}
              </Text>
            </AnimatedPressable>
          </View>
        ) : (
          <AnimatedPressable style={styles.newBtn} onPress={() => setAdding(true)}>
            <Ionicons name="add" size={20} color={ACCENT} />
            <Text style={styles.newText}>New tracker</Text>
          </AnimatedPressable>
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
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    list: {
      gap: theme.spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.lg,
      alignItems: "center",
      justifyContent: "center",
    },
    rowText: {
      flex: 1,
    },
    name: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    unit: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },
    addCard: {
      marginTop: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.md,
    },
    input: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
    },
    kindRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    kindChip: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: "center",
    },
    kindChipActive: {
      backgroundColor: `${ACCENT}22`,
      borderColor: ACCENT,
    },
    kindText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    kindTextActive: {
      fontFamily: theme.fonts.ui.semiBold,
      color: ACCENT,
    },
    createBtn: {
      paddingVertical: 13,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: ACCENT,
      alignItems: "center",
    },
    createBtnDisabled: {
      backgroundColor: theme.colors.border,
    },
    createBtnText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.surface,
    },
    newBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 13,
      borderRadius: theme.borderRadius.xl,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      marginTop: theme.spacing.md,
    },
    newText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: ACCENT,
    },
  });
