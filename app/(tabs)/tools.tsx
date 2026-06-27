/**
 * ============================================================
 * app/(tabs)/tools.tsx — Tools tab home
 * ============================================================
 *
 * The active-practice surface: a 2-column grid of the practice tools. Every
 * tile is registry-driven (getById) so its label/icon/color/description stays
 * in sync with the feature's manifest; tapping routes to the feature.
 *
 * Phase 9 v1 ships four: Breathing, Journal, Mood, CBT Tools.
 * ============================================================
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { useTheme } from '../../src/core/theme/ThemeContext';
import { Theme } from '../../src/core/theme';
import { AnimatedView } from '../../src/core/ui/AnimatedView';
import { AnimatedPressable } from '../../src/core/ui/AnimatedPressable';
import { getById } from '../../src/registry';

// The practice tools surfaced on this tab, in display order. Each resolves to a
// manifest; any that can't resolve is skipped (defensive).
const TOOL_IDS = ['breathing', 'journal', 'mood', 'cbt'];

function ToolsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const tools = useMemo(
    () => TOOL_IDS.map((id) => getById(id)).filter((m) => !!m),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Tools</Text>
          <Text style={styles.subtitle}>Active practices for in-the-moment relief</Text>
        </View>

        <View style={styles.list}>
          {tools.map((tool) => (
            <AnimatedView key={tool!.id}>
              <AnimatedPressable
                style={styles.row}
                onPress={() => router.push(tool!.route as never)}
              >
                <View style={[styles.iconWrap, { backgroundColor: `${tool!.color}22` }]}>
                  <Ionicons name={tool!.icon} size={26} color={tool!.color} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {tool!.label}
                  </Text>
                  <Text style={styles.tileDesc} numberOfLines={2}>
                    {tool!.description}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </AnimatedPressable>
            </AnimatedView>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Tools() {
  return (
    <ProtectedRoute>
      <ToolsScreen />
    </ProtectedRoute>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
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
      gap: theme.spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
    },
    tileLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    tileDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });
