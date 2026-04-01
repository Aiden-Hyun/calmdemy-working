import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { AnimatedView } from "../../src/components/AnimatedView";
import { AnimatedPressable } from "../../src/components/AnimatedPressable";
import { DownloadButton } from "../../src/components/DownloadButton";
import { useTheme } from "../../src/contexts/ThemeContext";
import { FirestoreMusicItem } from "../../src/services/firestoreService";
import { useWhiteNoise } from '../../src/hooks/queries/useMusicQueries';
import { getAudioUrlFromPath } from "../../src/constants/audioFiles";
import { getDownloadedContentIds } from "../../src/services/downloadService";
import { Theme } from "../../src/theme";
import { useSubscription } from "../../src/contexts/SubscriptionContext";
import { PaywallModal } from "../../src/components/PaywallModal";

function WhiteNoiseScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const { data: sounds = [], isLoading: loading } = useWhiteNoise();
  const [showPaywall, setShowPaywall] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (sounds.length === 0) return;
    (async () => {
      const urls = new Map<string, string>();
      for (const sound of sounds) {
        if (sound.audioPath) {
          const url = await getAudioUrlFromPath(sound.audioPath);
          if (url) urls.set(sound.id, url);
        }
      }
      setAudioUrls(urls);
      const ids = await getDownloadedContentIds('sound');
      setDownloadedIds(ids);
      setRefreshKey(prev => prev + 1);
    })();
  }, [sounds]);

  const handleSoundPress = (sound: FirestoreMusicItem) => {
    if (!sound.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(`/music/${sound.id}`);
  };

  const renderItem = ({ item, index }: { item: FirestoreMusicItem; index: number }) => (
    <AnimatedView delay={index * 50} duration={400}>
      <AnimatedPressable
        onPress={() => handleSoundPress(item)}
        style={styles.soundCard}
      >
        <View
          style={[
            styles.soundIconContainer,
            { backgroundColor: `${item.color}25` },
          ]}
        >
          <Ionicons
            name={`${item.icon}-outline` as keyof typeof Ionicons.glyphMap}
            size={28}
            color={item.color}
          />
        </View>
        <View style={styles.soundInfo}>
          <Text style={styles.soundTitle}>{item.title}</Text>
          <Text style={styles.soundDescription}>{item.description}</Text>
        </View>
        {audioUrls.get(item.id) && (
          <DownloadButton
            contentId={item.id}
            contentType="sound"
            audioUrl={audioUrls.get(item.id)!}
            metadata={{
              title: item.title,
              duration_minutes: 30,
              audioPath: item.audioPath,
            }}
            size={20}
            darkMode={true}
            refreshKey={refreshKey}
            onDownloadComplete={() => {
              getDownloadedContentIds('sound').then(setDownloadedIds);
            }}
            isPremiumLocked={!item.isFree && !hasSubscription}
            onPremiumRequired={() => setShowPaywall(true)}
          />
        )}
        {!item.isFree && !hasSubscription ? (
          <Ionicons name="lock-closed" size={24} color={theme.colors.sleepTextMuted} />
        ) : (
          <Ionicons name="play-circle-outline" size={32} color={theme.colors.sleepTextMuted} />
        )}
      </AnimatedPressable>
    </AnimatedView>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.sleepyNight as [string, string]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.sleepText} />
            </AnimatedPressable>
            <Text style={styles.headerTitle}>White Noise</Text>
            <View style={styles.headerSpacer} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.sleepText} />
            </View>
          ) : (
          <FlatList
              data={sounds}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="radio-outline" size={48} color={theme.colors.sleepTextMuted} />
                <Text style={styles.emptyText}>No white noise available yet</Text>
              </View>
            }
          />
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.sleepSurface,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: theme.colors.sleepText,
    },
    headerSpacer: {
      width: 40,
    },
    listContent: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
    },
    soundCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.sleepSurface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
    },
    soundIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginRight: theme.spacing.md,
    },
    soundInfo: {
      flex: 1,
    },
    soundTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepText,
      marginBottom: 4,
    },
    soundDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: theme.spacing.xxl,
      gap: theme.spacing.md,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 16,
      color: theme.colors.sleepTextMuted,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
    },
  });

export default function WhiteNoise() {
  return (
    <ProtectedRoute>
      <WhiteNoiseScreen />
    </ProtectedRoute>
  );
}
