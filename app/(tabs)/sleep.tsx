import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { AnimatedView } from "../../src/components/AnimatedView";
import { AnimatedPressable } from "../../src/components/AnimatedPressable";
import { ContentCard } from "../../src/components/ContentCard";
import { Skeleton } from "../../src/components/Skeleton";
import { PaywallModal } from "../../src/components/PaywallModal";
import { 
  FirestoreSleepMeditation,
  FirestoreSeries
} from "../../src/services/firestoreService";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useSubscription } from "../../src/contexts/SubscriptionContext";
import { useBedtimeStories, useSleepMeditations, useSeries } from '../../src/hooks/queries/useSleepQueries';
import { Theme } from "../../src/theme";
import { BedtimeStory } from "../../src/types";

function SleepScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isPremium: hasSubscription } = useSubscription();
  const { data: bedtimeStories = [] } = useBedtimeStories();
  const { data: sleepMeditations = [] } = useSleepMeditations();
  const { data: series = [] } = useSeries();
  
  const [showPaywall, setShowPaywall] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 21 || hour < 5) return "Sweet dreams await";
    if (hour >= 17) return "Wind down and relax";
    return "Rest when you need it";
  };

  const getCategoryIcon = (
    category: string
  ): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case "nature":
        return "leaf";
      case "fantasy":
        return "planet";
      case "travel":
        return "airplane";
      case "thriller":
        return "skull";
      case "fiction":
        return "book";
      default:
        return "book";
    }
  };

  const handleSeriesPress = (seriesItem: FirestoreSeries) => {
    // Allow browsing series - gating happens at chapter level
    router.push(`/series/${seriesItem.id}`);
  };

  const handleStoryPress = (story: BedtimeStory) => {
    // Check is_premium field from Firestore (inverted from isFree)
    if (story.is_premium && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(`/sleep/${story.id}`);
  };

  const handleMeditationPress = (meditation: FirestoreSleepMeditation) => {
    // Check isFree field from Firestore
    if (!meditation.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    router.push(`/sleep/meditation/${meditation.id}`);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.gradients.sleepyNight as [string, string]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header */}
            <AnimatedView delay={0} duration={500}>
              <View style={styles.header}>
                <View style={styles.moonContainer}>
                  <Ionicons
                    name="moon"
                    size={48}
                    color={theme.colors.sleepAccent}
                  />
                </View>
                <Text style={styles.title}>Ready for Rest</Text>
                <Text style={styles.subtitle}>{getTimeGreeting()}</Text>
              </View>
            </AnimatedView>

            {/* Series */}
            <View style={styles.section}>
              <AnimatedView delay={100} duration={400}>
                <View style={styles.sectionHeaderNoLink}>
                  <Text style={styles.sectionTitle}>Series</Text>
                  <Text style={styles.sectionSubtitle}>
                    Multi-chapter story collections
                  </Text>
                </View>
              </AnimatedView>

              <AnimatedView delay={150} duration={400}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsScroll}
                >
                  {series.map((seriesItem) => (
                    <ContentCard
                      key={seriesItem.id}
                      title={seriesItem.title}
                      thumbnailUrl={seriesItem.thumbnailUrl}
                      fallbackIcon={getCategoryIcon(seriesItem.category)}
                      fallbackColor={seriesItem.color}
                      meta={`${seriesItem.chapterCount} chapters`}
                      isPremium={true}
                      onPress={() => handleSeriesPress(seriesItem)}
                      darkMode
                    />
                  ))}
                </ScrollView>
              </AnimatedView>
            </View>

            {/* Bedtime Stories */}
            <View style={styles.section}>
              <AnimatedView delay={200} duration={400}>
                <AnimatedPressable
                  onPress={() => router.push("/sleep/bedtime-stories")}
                  style={styles.sectionHeader}
                >
                  <Text style={styles.sectionTitle}>Bedtime Stories</Text>
                  <View style={styles.seeAllContainer}>
                    <Text style={styles.seeAllText}>See all</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.sleepTextMuted}
                    />
                  </View>
                </AnimatedPressable>
              </AnimatedView>

              <AnimatedView delay={250} duration={400}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsScroll}
                >
                  {bedtimeStories.map((story) => (
                    <ContentCard
                      key={story.id}
                      title={story.title}
                      thumbnailUrl={story.thumbnail_url}
                      fallbackIcon={getCategoryIcon(story.category)}
                      fallbackColor={theme.colors.sleepAccent}
                      meta={`${story.duration_minutes} min`}
                      isPremium={story.is_premium}
                      onPress={() => handleStoryPress(story)}
                      darkMode
                    />
                  ))}
                </ScrollView>
              </AnimatedView>
            </View>

            {/* Sleep Meditations */}
            <View style={styles.section}>
              <AnimatedView delay={300} duration={400}>
                <AnimatedPressable
                  onPress={() => router.push("/sleep/sleep-meditations")}
                  style={styles.sectionHeader}
                >
                  <Text style={styles.sectionTitle}>Sleep Meditations</Text>
                  <View style={styles.seeAllContainer}>
                    <Text style={styles.seeAllText}>See all</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={theme.colors.sleepTextMuted}
                    />
                  </View>
                </AnimatedPressable>
              </AnimatedView>

              <AnimatedView delay={350} duration={400}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardsScroll}
                >
                  {sleepMeditations.slice(0, 6).map((meditation) => (
                    <ContentCard
                      key={meditation.id}
                      title={meditation.title}
                      thumbnailUrl={meditation.thumbnailUrl}
                      fallbackIcon={meditation.icon as keyof typeof Ionicons.glyphMap}
                      fallbackColor={meditation.color}
                      meta={`${meditation.duration_minutes} min`}
                      isPremium={!meditation.isFree}
                      onPress={() => handleMeditationPress(meditation)}
                      darkMode
                    />
                  ))}
                </ScrollView>
              </AnimatedView>
            </View>
          </ScrollView>

          {/* Paywall Modal */}
          <PaywallModal
            visible={showPaywall}
            onClose={() => setShowPaywall(false)}
          />
        </SafeAreaView>
      </LinearGradient>
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
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      alignItems: "center",
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.lg,
    },
    moonContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(201, 184, 150, 0.1)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.md,
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.sleepText,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontFamily: theme.fonts.body.italic,
      fontSize: 15,
      color: theme.colors.sleepTextMuted,
      marginTop: 4,
    },
    section: {
      marginTop: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
    },
    sectionHeaderNoLink: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.sleepText,
    },
    sectionSubtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.sleepTextMuted,
      marginTop: 4,
    },
    seeAllContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    seeAllText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.sleepTextMuted,
    },
    cardsScroll: {
      gap: theme.spacing.md,
    },
    skeletonCard: {
      width: 150,
    },
  });

export default function Sleep() {
  return (
    <ProtectedRoute>
      <SleepScreen />
    </ProtectedRoute>
  );
}
