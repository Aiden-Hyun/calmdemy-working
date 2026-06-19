/**
 * ============================================================
 * app/(tabs)/tools.tsx — Tools tab home
 * ============================================================
 *
 * The active-practice surface. Today that's breathing (registry-driven tile)
 * plus a single non-interactive "more coming soon" card — honest about the
 * current state without naming features that haven't shipped. Future practice
 * tools (Phase 9) slot in alongside the breathing tile.
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

function ToolsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const breathing = getById('breathing');

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

        {breathing && (
          <AnimatedView>
            <AnimatedPressable
              style={styles.tile}
              onPress={() => router.push(breathing.route as any)}
            >
              <View
                style={[styles.iconWrap, { backgroundColor: `${breathing.color}22` }]}
              >
                <Ionicons name={breathing.icon} size={26} color={breathing.color} />
              </View>
              <View style={styles.tileText}>
                <Text style={styles.tileLabel}>{breathing.label}</Text>
                <Text style={styles.tileDesc} numberOfLines={2}>
                  {breathing.description}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.textMuted}
              />
            </AnimatedPressable>
          </AnimatedView>
        )}

        {/* Non-interactive: signals more is coming without naming unshipped tools. */}
        <AnimatedView>
          <View style={[styles.tile, styles.comingSoonTile]}>
            <View style={[styles.iconWrap, styles.comingSoonIcon]}>
              <Ionicons
                name="ellipsis-horizontal"
                size={26}
                color={theme.colors.textMuted}
              />
            </View>
            <View style={styles.tileText}>
              <Text style={styles.comingSoonLabel}>More tools coming soon</Text>
              <Text style={styles.tileDesc} numberOfLines={2}>
                New practices to support your day are on the way.
              </Text>
            </View>
          </View>
        </AnimatedView>
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
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      padding: 16,
      marginBottom: 12,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    comingSoonTile: {
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    comingSoonIcon: {
      backgroundColor: theme.colors.surface,
    },
    tileText: {
      flex: 1,
    },
    tileLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    comingSoonLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    tileDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
      lineHeight: 18,
    },
  });
