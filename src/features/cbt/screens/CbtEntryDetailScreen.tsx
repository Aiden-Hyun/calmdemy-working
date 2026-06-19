/**
 * ============================================================
 * features/cbt/screens/CbtEntryDetailScreen.tsx — CBT entry detail
 * ============================================================
 *
 * Read view for one completed CBT exercise (route /cbt/entry/[id]). Renders the
 * method, the date, and each answered step in flow order with its human title
 * (via cbtStepTitle, so labels match the exercise). Read-only (v1).
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { CbtEntry } from "../types";
import { cbtFlows, getCbtMethod, cbtStepTitle } from "../data/methods";
import { useCbtEntry } from "../hooks/useCbtHistory";

interface CbtEntryDetailScreenProps {
  entryId: string;
}

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Step keys in display order: flow order for guided methods, prompt→text for gratitude. */
function orderedKeys(entry: CbtEntry): string[] {
  if (entry.method === "gratitude") return ["prompt", "text"];
  const flow = cbtFlows[entry.method];
  return flow ? flow.map((s) => s.key) : Object.keys(entry.steps);
}

export function CbtEntryDetailScreen({ entryId }: CbtEntryDetailScreenProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: entry, isLoading } = useCbtEntry(entryId);
  const method = entry ? getCbtMethod(entry.method) : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <AnimatedPressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {method?.label ?? "Entry"}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : !entry ? (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={40} color={theme.colors.textMuted} />
          <Text style={styles.notFound}>This entry couldn't be found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.method, { color: method?.color ?? theme.colors.text }]}>
            {method?.label ?? entry.method}
          </Text>
          <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>

          {orderedKeys(entry)
            .filter((key) => entry.steps[key] && entry.steps[key].trim())
            .map((key) => (
              <View key={key} style={styles.stepBlock}>
                <Text style={styles.stepTitle}>{cbtStepTitle(entry.method, key)}</Text>
                <Text style={styles.stepValue}>{entry.steps[key]}</Text>
              </View>
            ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: theme.colors.text,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    notFound: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    content: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    method: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    date: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textMuted,
      marginTop: 2,
      marginBottom: theme.spacing.lg,
    },
    stepBlock: {
      marginBottom: theme.spacing.lg,
    },
    stepTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
    },
    stepValue: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
  });
