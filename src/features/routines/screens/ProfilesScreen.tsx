/**
 * ============================================================
 * features/routines/screens/ProfilesScreen.tsx — Routine profiles (M5, feat 7)
 * ============================================================
 *
 * Manage up to 10 named routine sets and choose which one is active today.
 * "Apply" makes a profile active (its habits show on Today); the active profile
 * can't be deleted, and the last remaining profile is never deletable.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import {
  useProfiles,
  useApplyProfile,
  useCreateProfile,
  useDeleteProfile,
} from "../hooks/useProfiles";
import { MAX_PROFILES } from "../api/profiles";
import { HABIT_COLORS } from "../data/presets";
import type { RoutineProfile } from "../types";

const ACCENT = "#8FA98C";

export function ProfilesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data: profiles, isLoading } = useProfiles();
  const applyProfile = useApplyProfile();
  const createProfile = useCreateProfile();
  const deleteProfile = useDeleteProfile();

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const list = profiles ?? [];
  const canDelete = list.length > 1;
  const atMax = list.length >= MAX_PROFILES;

  const handleCreate = () => {
    const name = draft.trim();
    if (!name || atMax) return;
    const color = HABIT_COLORS[list.length % HABIT_COLORS.length];
    createProfile.mutate({ name, icon: "albums-outline", color });
    setDraft("");
    setAdding(false);
  };

  const handleDelete = (profile: RoutineProfile) => {
    Alert.alert("Delete profile", `Delete "${profile.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteProfile.mutate(profile.id),
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
          <Text style={styles.title}>Profiles</Text>
          <Text style={styles.subtitle}>Switch between routine sets.</Text>
        </View>

        {isLoading && !profiles ? (
          <ActivityIndicator style={styles.loader} color={ACCENT} />
        ) : (
          <View style={styles.list}>
            {list.map((profile) => (
              <AnimatedView key={profile.id}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: `${profile.color}22` }]}>
                    <Ionicons name={profile.icon} size={20} color={profile.color} />
                  </View>
                  <Text style={styles.name} numberOfLines={1}>
                    {profile.name}
                  </Text>
                  {profile.isActive ? (
                    <View style={styles.activeBadge}>
                      <Ionicons name="checkmark" size={14} color={ACCENT} />
                      <Text style={styles.activeText}>Active</Text>
                    </View>
                  ) : (
                    <AnimatedPressable
                      style={styles.applyBtn}
                      onPress={() => applyProfile.mutate(profile.id)}
                    >
                      <Text style={styles.applyText}>Apply</Text>
                    </AnimatedPressable>
                  )}
                  {!profile.isActive && canDelete && (
                    <AnimatedPressable style={styles.trashBtn} onPress={() => handleDelete(profile)}>
                      <Ionicons name="trash-outline" size={18} color={theme.colors.textMuted} />
                    </AnimatedPressable>
                  )}
                </View>
              </AnimatedView>
            ))}

            {atMax ? (
              <Text style={styles.maxNote}>You've reached the maximum of {MAX_PROFILES} profiles.</Text>
            ) : adding ? (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  placeholder="Profile name (e.g. Vacation)"
                  placeholderTextColor={theme.colors.textMuted}
                  value={draft}
                  onChangeText={setDraft}
                  autoFocus
                  maxLength={30}
                  onSubmitEditing={handleCreate}
                  returnKeyType="done"
                />
                <AnimatedPressable style={styles.addConfirm} onPress={handleCreate}>
                  <Ionicons name="checkmark" size={18} color={theme.colors.surface} />
                </AnimatedPressable>
              </View>
            ) : (
              <AnimatedPressable style={styles.newBtn} onPress={() => setAdding(true)}>
                <Ionicons name="add" size={20} color={ACCENT} />
                <Text style={styles.newText}>New profile</Text>
              </AnimatedPressable>
            )}
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
    name: {
      flex: 1,
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: theme.borderRadius.full,
      backgroundColor: `${ACCENT}22`,
    },
    activeText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 12,
      color: ACCENT,
    },
    applyBtn: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    applyText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    trashBtn: {
      padding: 4,
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
      marginTop: theme.spacing.xs,
    },
    newText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: ACCENT,
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
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
    addConfirm: {
      width: 42,
      height: 42,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: ACCENT,
      alignItems: "center",
      justifyContent: "center",
    },
    maxNote: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.sm,
    },
  });
