/**
 * ============================================================
 * features/cbt/screens/CbtHomeScreen.tsx — Method picker + history
 * ============================================================
 *
 * The /cbt entry point: the five method tiles over the user's recent history
 * (last 10 entries grouped by method). Tapping a tile opens that method's
 * exercise; tapping a history row opens the entry detail.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { CbtEntry } from "../types";
import { cbtMethods } from "../data/methods";
import { useCbtHistory } from "../hooks/useCbtHistory";
import { MethodTile } from "../components/MethodTile";

function formatDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** First non-empty step value, for a one-line history preview. */
function entrySnippet(entry: CbtEntry): string {
  const firstAnswer = Object.values(entry.steps).find((v) => v && v.trim());
  return firstAnswer?.trim() ?? "—";
}

export function CbtHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: history } = useCbtHistory(10);

  const entries = history ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>CBT Tools</Text>
          <Text style={styles.subtitle}>
            Cognitive techniques to identify, challenge, and reframe negative thoughts.
          </Text>
        </View>

        {cbtMethods.map((method) => (
          <AnimatedView key={method.id}>
            <MethodTile
              method={method}
              onPress={() => router.push(`/cbt/${method.id}` as never)}
            />
          </AnimatedView>
        ))}

        {entries.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Recent entries</Text>
            {cbtMethods.map((method) => {
              const methodEntries = entries.filter((e) => e.method === method.id);
              if (methodEntries.length === 0) return null;
              return (
                <View key={method.id} style={styles.group}>
                  <Text style={[styles.groupLabel, { color: method.color }]}>
                    {method.label}
                  </Text>
                  {methodEntries.map((entry) => (
                    <AnimatedPressable
                      key={entry.id}
                      style={styles.entryRow}
                      onPress={() => router.push(`/cbt/entry/${entry.id}` as never)}
                    >
                      <View style={styles.entryText}>
                        <Text style={styles.entryDate}>{formatDate(entry.createdAt)}</Text>
                        <Text style={styles.entrySnippet} numberOfLines={1}>
                          {entrySnippet(entry)}
                        </Text>
                      </View>
                    </AnimatedPressable>
                  ))}
                </View>
              );
            })}
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
    subtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    historySection: {
      marginTop: theme.spacing.lg,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    group: {
      marginBottom: theme.spacing.md,
    },
    groupLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      marginBottom: theme.spacing.xs,
    },
    entryRow: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    entryText: {
      gap: 2,
    },
    entryDate: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    entrySnippet: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 14,
      color: theme.colors.text,
    },
  });
