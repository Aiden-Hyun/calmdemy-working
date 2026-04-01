import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { AnimatedView } from "../../src/components/AnimatedView";
import { AnimatedPressable } from "../../src/components/AnimatedPressable";
import { SkeletonListItem } from "../../src/components/Skeleton";
import { DownloadButton } from "../../src/components/DownloadButton";
import { useMeditationsByTheme } from "../../src/hooks/queries/useMeditateQueries";
import { getAudioUrlFromPath } from "../../src/constants/audioFiles";
import { getDownloadedContentIds } from "../../src/services/downloadService";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Theme } from "../../src/theme";
import { GuidedMeditation } from "../../src/types";
import { useSubscription } from "../../src/contexts/SubscriptionContext";
import { PaywallModal } from "../../src/components/PaywallModal";

const themeCategories = [
  { id: "all", label: "All", icon: "grid-outline" as const, color: "#6B7280" },
  {
    id: "focus",
    label: "Focus",
    icon: "eye-outline" as const,
    color: "#8B9F82",
  },
  {
    id: "sleep",
    label: "Sleep",
    icon: "moon-outline" as const,
    color: "#7B8FA1",
  },
  {
    id: "stress",
    label: "Stress",
    icon: "water-outline" as const,
    color: "#A8B4C4",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    icon: "heart-outline" as const,
    color: "#C4A77D",
  },
  {
    id: "anxiety",
    label: "Calm",
    icon: "leaf-outline" as const,
    color: "#B4A7C7",
  },
  {
    id: "self-esteem",
    label: "Self Love",
    icon: "flower-outline" as const,
    color: "#D4A5A5",
  },
  {
    id: "loving-kindness",
    label: "Loving Kindness",
    icon: "heart-circle-outline" as const,
    color: "#D4A5C7",
  },
];

function AllMeditationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();
  const { theme, isDark } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    params.category || "all"
  );
  const { data: meditations = [], isLoading: loading } = useMeditationsByTheme(selectedCategory);
  const [showPaywall, setShowPaywall] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    if (meditations.length === 0) return;
    (async () => {
      const urls = new Map<string, string>();
      for (const meditation of meditations) {
        if (meditation.audioPath) {
          const url = await getAudioUrlFromPath(meditation.audioPath);
          if (url) urls.set(meditation.id, url);
        }
      }
      setAudioUrls(urls);
      const ids = await getDownloadedContentIds('guided_meditation');
      setDownloadedIds(ids);
      setRefreshKey(prev => prev + 1);
    })();
  }, [meditations]);

  const handleMeditationPress = (meditation: GuidedMeditation) => {
    // Check isFree field from Firestore
    if (!meditation.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push({
      pathname: "/meditation/[id]",
      params: { id: meditation.id },
    });
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const renderMeditationItem = ({
    item,
    index,
  }: {
    item: GuidedMeditation;
    index: number;
  }) => (
    <AnimatedView delay={100 + index * 30} duration={300}>
      <AnimatedPressable
        onPress={() => handleMeditationPress(item)}
        style={styles.sessionCard}
      >
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.sessionImage}
          />
        ) : (
          <View style={styles.sessionIcon}>
            <Ionicons name="leaf" size={20} color={theme.colors.primary} />
          </View>
        )}
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.sessionDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.sessionMetaRow}>
            <View style={styles.sessionMetaItem}>
              <Ionicons
                name="time-outline"
                size={12}
                color={theme.colors.textMuted}
              />
              <Text style={styles.sessionMeta}>
                {item.duration_minutes} min
              </Text>
            </View>
            <View style={styles.sessionMetaItem}>
              <Ionicons
                name="fitness-outline"
                size={12}
                color={theme.colors.textMuted}
              />
              <Text style={styles.sessionMeta}>{item.difficulty_level}</Text>
            </View>
            {item.instructor && (
              <View style={styles.sessionMetaItem}>
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.sessionMeta}>{item.instructor}</Text>
              </View>
            )}
          </View>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType="guided_meditation"
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: item.duration_minutes,
              thumbnailUrl: item.thumbnailUrl,
              audioPath: item.audioPath,
            }}
            size={20}
            darkMode={false}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds('guided_meditation').then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        <View style={styles.sessionChevron}>
          {!item.isFree && !hasSubscription ? (
            <Ionicons
              name="lock-closed"
              size={18}
              color={theme.colors.textMuted}
            />
          ) : (
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.colors.textMuted}
            />
          )}
        </View>
      </AnimatedPressable>
    </AnimatedView>
  );

  const currentCategory = themeCategories.find(
    (c) => c.id === selectedCategory
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>All Meditations</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Category Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={themeCategories}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <AnimatedPressable
              onPress={() => handleCategorySelect(item.id)}
              style={[
                styles.filterChip,
                selectedCategory === item.id && styles.filterChipSelected,
                selectedCategory === item.id && {
                  borderColor: item.color,
                  backgroundColor: `${item.color}15`,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={
                  selectedCategory === item.id
                    ? item.color
                    : theme.colors.textLight
                }
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === item.id && { color: item.color },
                ]}
              >
                {item.label}
              </Text>
            </AnimatedPressable>
          )}
        />
      </View>

      {/* Meditations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          {[0, 1, 2, 3, 4].map((_, index) => (
            <AnimatedView key={index} delay={index * 50} duration={300}>
              <SkeletonListItem
                style={{
                  marginBottom: theme.spacing.sm,
                  marginHorizontal: theme.spacing.lg,
                }}
              />
            </AnimatedView>
          ))}
        </View>
      ) : meditations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons
              name="leaf-outline"
              size={48}
              color={theme.colors.textMuted}
            />
          </View>
          <Text style={styles.emptyText}>No sessions found</Text>
          <Text style={styles.emptySubtext}>
            {selectedCategory !== "all"
              ? `No ${currentCategory?.label || ""} meditations available yet`
              : "Check back soon for new content"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={meditations}
          keyExtractor={(item) => item.id}
          renderItem={renderMeditationItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: theme.spacing.sm }} />
          )}
        />
      )}

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: theme.colors.text,
      textAlign: "center",
    },
    headerSpacer: {
      width: 40,
    },
    filterContainer: {
      marginTop: 0,
    },
    filterList: {
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: "transparent",
      gap: 6,
      ...theme.shadows.sm,
    },
    filterChipSelected: {
      borderWidth: 1.5,
    },
    filterChipText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: theme.colors.textLight,
    },
    loadingContainer: {
      paddingTop: theme.spacing.lg,
    },
    emptyContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxl,
    },
    emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    emptySubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      marginTop: 4,
      textAlign: "center",
      paddingHorizontal: theme.spacing.xl,
    },
    listContent: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sessionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
    },
    sessionIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: isDark
        ? theme.colors.gray[100]
        : `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionImage: {
      width: 56,
      height: 56,
      borderRadius: 16,
      resizeMode: "cover",
    },
    sessionInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    sessionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 2,
    },
    sessionDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      marginBottom: 6,
    },
    sessionMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
    },
    sessionMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    sessionMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.textMuted,
      textTransform: "capitalize",
    },
    sessionChevron: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.gray[100],
      alignItems: "center",
      justifyContent: "center",
    },
  });

export default function AllMeditations() {
  return (
    <ProtectedRoute>
      <AllMeditationsScreen />
    </ProtectedRoute>
  );
}
