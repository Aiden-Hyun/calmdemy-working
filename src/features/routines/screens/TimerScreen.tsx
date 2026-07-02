/**
 * ============================================================
 * features/routines/screens/TimerScreen.tsx — Focus timer host (M6, feat 13)
 * ============================================================
 *
 * Hosts the RoutineTimer. An optional `label` (e.g. the habit name) is shown
 * above the clock when launched from a habit.
 * ============================================================
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { RoutineTimer } from "../components/RoutineTimer";

interface TimerScreenProps {
  label?: string;
}

export function TimerScreen({ label }: TimerScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackButton />
        <View style={styles.header}>
          <Text style={styles.title}>Focus timer</Text>
          <Text style={styles.subtitle}>Less distraction, more presence.</Text>
        </View>
        <RoutineTimer label={label} />
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
  });
