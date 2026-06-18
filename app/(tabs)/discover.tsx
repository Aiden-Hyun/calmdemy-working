/**
 * ============================================================
 * app/(tabs)/discover.tsx — Discover tab
 * ============================================================
 *
 * The full feature shelf: every enabled feature, grouped by category, with
 * substring search. Driven entirely by the registry (src/registry.ts) — this
 * screen owns no feature data, only presentation over the manifests.
 *
 * Tab-bar wiring (icon/label/order) lands in Phase 7c; until then this file
 * exists in the (tabs) group and is reachable, but isn't yet a styled bar entry.
 * ============================================================
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { useTheme } from '../../src/core/theme/ThemeContext';
import { Theme } from '../../src/core/theme';
import { AnimatedView } from '../../src/core/ui/AnimatedView';
import { AnimatedPressable } from '../../src/core/ui/AnimatedPressable';
import {
  byCategory,
  search,
  type FeatureCategory,
  type FeatureManifest,
} from '../../src/registry';

// Discover renders categories in this fixed order; only non-empty ones show.
const CATEGORY_ORDER: FeatureCategory[] = [
  'library',
  'practice',
  'progress',
  'account',
  'legal',
];

const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  library: 'Library',
  practice: 'Practice',
  progress: 'Progress',
  account: 'Account',
  legal: 'Legal',
};

function DiscoverScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  // Sectioned browse view (empty query). Only categories with ≥1 enabled
  // feature are included.
  const sections = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => ({
        title: CATEGORY_LABELS[category],
        data: byCategory(category),
      })).filter((s) => s.data.length > 0),
    []
  );

  // Flat search results (non-empty query).
  const results = useMemo(() => search(trimmed), [trimmed]);

  const goTo = (route: string) => {
    // Manifest routes are plain strings; typedRoutes can't statically verify them.
    router.push(route as any);
  };

  const renderTile = ({ item }: { item: FeatureManifest }) => (
    <AnimatedPressable style={styles.tile} onPress={() => goTo(item.route)}>
      <View style={[styles.iconWrap, { backgroundColor: `${item.color}22` }]}>
        <Ionicons name={item.icon} size={24} color={item.color} />
      </View>
      <View style={styles.tileText}>
        <Text style={styles.tileLabel}>{item.label}</Text>
        <Text style={styles.tileDesc} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={theme.colors.textMuted}
      />
    </AnimatedPressable>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Everything Calmdemy offers</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search features"
          placeholderTextColor={theme.colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {trimmed ? (
        results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderTile}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons
              name="search-outline"
              size={40}
              color={theme.colors.textMuted}
            />
            <Text style={styles.emptyText}>No features match “{trimmed}”</Text>
          </View>
        )
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <AnimatedView>{renderTile({ item })}</AnimatedView>
          )}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

export default function Discover() {
  return (
    <ProtectedRoute>
      <DiscoverScreen />
    </ProtectedRoute>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
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
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      height: 44,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    searchInput: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.text,
      padding: 0,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sectionHeader: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.lg,
      marginBottom: theme.spacing.sm,
    },
    tile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 10,
      borderRadius: theme.borderRadius.xl,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: {
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
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingHorizontal: theme.spacing.lg,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
