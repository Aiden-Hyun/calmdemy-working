/**
 * ============================================================
 * features/journal/screens/JournalHomeScreen.tsx — Journal home
 * ============================================================
 *
 * The /journal entry point: a header + "New entry" action over the user's
 * entries (most recent first). Tapping an entry opens its detail route; the
 * "New entry" action opens the compose modal. Loading and empty states are
 * handled inline. Append-only (v1) — no edit/delete affordances.
 * ============================================================
 */

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AnimatedView } from "../../../core/ui/AnimatedView";
import { AnimatedPressable } from "../../../core/ui/AnimatedPressable";
import { useTheme } from "../../../core/theme/ThemeContext";
import { Theme } from "../../../core/theme";
import { BackButton } from "../../../core/ui/BackButton";
import { useJournalEntries } from "../hooks/useJournalEntries";
import { EntryCard } from "../components/EntryCard";
import { NewEntryModal } from "./NewEntryModal";

export function JournalHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { data: entries, isLoading } = useJournalEntries();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <FlatList
        data={entries ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <BackButton />
            <View style={styles.header}>
              <Text style={styles.title}>Journal</Text>
              <Text style={styles.subtitle}>
                Write reflections or whatever's on your mind.
              </Text>
            </View>
            <AnimatedView>
              <AnimatedPressable
                style={styles.newButton}
                onPress={() => setModalVisible(true)}
              >
                <Ionicons name="add" size={20} color={theme.colors.surface} />
                <Text style={styles.newButtonText}>New entry</Text>
              </AnimatedPressable>
            </AnimatedView>
          </View>
        }
        renderItem={({ item }) => (
          <AnimatedView>
            <EntryCard
              entry={item}
              onPress={() => router.push(`/journal/${item.id}` as never)}
            />
          </AnimatedView>
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <View style={styles.centered}>
              <Ionicons
                name="book-outline"
                size={40}
                color={theme.colors.textMuted}
              />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyText}>
                Your first reflection is one tap away.
              </Text>
            </View>
          )
        }
      />

      <NewEntryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const JOURNAL_ACCENT = "#B4A7C7";

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    listContent: {
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
    newButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 14,
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: JOURNAL_ACCENT,
    },
    newButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.surface,
    },
    centered: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: theme.spacing.xxl,
      gap: theme.spacing.sm,
    },
    emptyTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
