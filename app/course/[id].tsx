import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { AnimatedView } from "../../src/components/AnimatedView";
import { AnimatedPressable } from "../../src/components/AnimatedPressable";
import { useTheme } from "../../src/contexts/ThemeContext";
import { Theme } from "../../src/theme";
import { getCourseById, FirestoreCourse, FirestoreCourseSession, getCompletedContentIds } from "../../src/services/firestoreService";
import { useAuth } from "../../src/contexts/AuthContext";
import { DownloadButton } from "../../src/components/DownloadButton";
import { getAudioUrlFromPath } from "../../src/constants/audioFiles";
import { useNetwork } from "../../src/contexts/NetworkContext";
import { getDownloadedContentIds, getLocalAudioPath } from "../../src/services/downloadService";
import { buildSessionMetaInfo } from "../../src/utils/courseCodeParser";
import { useSubscription } from "../../src/contexts/SubscriptionContext";
import { PaywallModal } from "../../src/components/PaywallModal";

function CourseDetailScreen() {
  const router = useRouter();
  const { id, autoOpenItemId } = useLocalSearchParams<{ id: string; autoOpenItemId?: string }>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { isPremium: hasSubscription } = useSubscription();
  const [course, setCourse] = useState<FirestoreCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const hasAutoOpened = useRef(false);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    async function loadCourse() {
      if (!id) return;
      setLoading(true);
      const data = await getCourseById(id);
      setCourse(data);
      setLoading(false);
    }
    loadCourse();
  }, [id]);

  // Fetch completed session IDs (refetch when screen comes into focus)
  useFocusEffect(
    useCallback(() => {
      async function loadCompletedIds() {
        if (!user) return;
        const ids = await getCompletedContentIds(user.uid, 'course_session');
        setCompletedIds(ids);
      }
      loadCompletedIds();
    }, [user])
  );

  // Refresh download status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      async function loadDownloadedIds() {
        const ids = await getDownloadedContentIds('course_session');
        setDownloadedIds(ids);
      }
      loadDownloadedIds();
      // Increment refreshKey to force DownloadButton components to re-check
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  // Fetch audio URLs for sessions
  useEffect(() => {
    async function loadAudioUrls() {
      if (!course) return;
      const urls = new Map<string, string>();
      for (const session of course.sessions) {
        const url = await getAudioUrlFromPath(session.audioPath);
        if (url) {
          urls.set(session.id, url);
        }
      }
      setAudioUrls(urls);
    }
    loadAudioUrls();
  }, [course]);

  // Auto-open a specific session if autoOpenItemId is provided
  useEffect(() => {
    if (!course || !autoOpenItemId || hasAutoOpened.current) return;
    
    const index = course.sessions.findIndex(s => s.id === autoOpenItemId);
    if (index !== -1) {
      hasAutoOpened.current = true;
      const session = course.sessions[index];
      router.push({
        pathname: '/course/session/[id]',
        params: {
          id: session.id,
          audioPath: session.audioPath,
          title: session.title,
          courseTitle: course.title,
          courseCode: course.code || '',
          sessionCode: session.code || '',
          duration: String(session.duration_minutes),
          instructor: course.instructor,
          color: course.color,
          thumbnailUrl: course.thumbnailUrl || '',
          sessionsJson: JSON.stringify(course.sessions),
          currentIndex: String(index),
        },
      });
    }
  }, [course, autoOpenItemId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Course not found</Text>
          <AnimatedPressable
            onPress={() => router.back()}
            style={styles.backLink}
          >
            <Text style={styles.backLinkText}>Go back</Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleSessionPress = (session: FirestoreCourseSession, index: number) => {
    if (!course) return;
    
    // Check isFree field from Firestore
    if (!session.isFree && !hasSubscription) {
      setShowPaywall(true);
      return;
    }
    
    router.push({
      pathname: '/course/session/[id]',
      params: {
        id: session.id,
        audioPath: session.audioPath,
        title: session.title,
        courseTitle: course.title,
        courseCode: course.code || '',
        sessionCode: session.code || '',
        duration: String(session.duration_minutes),
        instructor: course.instructor,
        color: course.color,
        thumbnailUrl: course.thumbnailUrl || '',
        // Pass sessions list for navigation
        sessionsJson: JSON.stringify(course.sessions),
        currentIndex: String(index),
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isDark
            ? (theme.gradients.sleepyNight as [string, string])
            : [
                `${course.color}30`,
                `${course.color}10`,
                theme.colors.background,
              ]
        }
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Hero Section */}
            <AnimatedView delay={0} duration={400}>
              <View style={styles.heroSection}>
                {course.thumbnailUrl ? (
                  <Image
                    source={{ uri: course.thumbnailUrl }}
                    style={styles.heroImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.heroIcon,
                      { backgroundColor: `${course.color}25` },
                    ]}
                  >
                    <Ionicons name="school" size={48} color={course.color} />
                  </View>
                )}
                {course.code && (
                  <View style={styles.courseCodeBadge}>
                    <Text style={styles.courseCodeText}>{course.code}</Text>
                  </View>
                )}
                <Text style={styles.courseTitle}>{course.title}</Text>
                {course.subtitle && (
                  <Text style={styles.courseSubtitle}>{course.subtitle}</Text>
                )}
                <View style={styles.courseMeta}>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="layers-outline"
                      size={16}
                      color={
                        isDark
                          ? theme.colors.sleepTextMuted
                          : theme.colors.textLight
                      }
                    />
                    <Text style={styles.metaText}>
                      {course.sessionCount} sessions
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={
                        isDark
                          ? theme.colors.sleepTextMuted
                          : theme.colors.textLight
                      }
                    />
                    <Text style={styles.metaText}>
                      {course.totalDuration} min total
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="fitness-outline"
                      size={16}
                      color={
                        isDark
                          ? theme.colors.sleepTextMuted
                          : theme.colors.textLight
                      }
                    />
                    <Text style={styles.metaText}>{course.difficulty}</Text>
                  </View>
                </View>
                <Text style={styles.courseDescription}>
                  {course.description}
                </Text>
              </View>
            </AnimatedView>

            {/* Sessions List */}
            <View style={styles.sessionsContainer}>
              <AnimatedView delay={100} duration={400}>
                <Text style={styles.sectionTitle}>Sessions</Text>
              </AnimatedView>

              {course.sessions.map((session, index) => (
                <AnimatedView
                  key={session.id}
                  delay={150 + index * 50}
                  duration={300}
                >
                  <AnimatedPressable
                    onPress={() => handleSessionPress(session, index)}
                    style={styles.sessionCard}
                  >
                    {course.thumbnailUrl ? (
                      <Image
                        source={{ uri: course.thumbnailUrl }}
                        style={styles.sessionThumbnail}
                      />
                    ) : (
                      <View
                        style={[
                          styles.sessionNumber,
                          { backgroundColor: `${course.color}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionNumberText,
                            { color: course.color },
                          ]}
                        >
                          {session.dayNumber}
                        </Text>
                      </View>
                    )}
                    <View style={styles.sessionInfo}>
                      <Text style={styles.sessionTitle}>{session.title}</Text>
                      {session.code && course.code && (
                        <Text style={styles.sessionCodeInfo}>
                          {buildSessionMetaInfo(session.code, course.code)}
                        </Text>
                      )}
                      <Text style={styles.sessionDescription} numberOfLines={1}>
                        {session.description}
                      </Text>
                      <View style={styles.sessionMeta}>
                        <Ionicons
                          name="time-outline"
                          size={12}
                          color={
                            isDark
                              ? theme.colors.sleepTextMuted
                              : theme.colors.textMuted
                          }
                        />
                        <Text style={styles.sessionMetaText}>
                          {session.duration_minutes} min
                        </Text>
                        {completedIds.has(session.id) && (
                          <>
                            <Text style={styles.sessionMetaText}>•</Text>
                            <Ionicons
                              name="checkmark-circle"
                              size={12}
                              color="#4CAF50"
                            />
                            <Text style={[styles.sessionMetaText, styles.completedText]}>
                              Completed
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                    {!isOffline && audioUrls.get(session.id) && (
                      <DownloadButton
                        contentId={session.id}
                        contentType="course_session"
                        audioUrl={audioUrls.get(session.id)!}
                        metadata={{
                          title: session.title,
                          duration_minutes: session.duration_minutes,
                          thumbnailUrl: course.thumbnailUrl,
                          parentId: course.id,
                          parentTitle: course.title,
                          audioPath: session.audioPath,
                        }}
                        size={20}
                        darkMode={isDark}
                        refreshKey={refreshKey}
                        onDownloadComplete={() => {
                          getDownloadedContentIds('course_session').then(setDownloadedIds);
                        }}
                        isPremiumLocked={!session.isFree && !hasSubscription}
                        onPremiumRequired={() => setShowPaywall(true)}
                      />
                    )}
                    <View style={styles.playButton}>
                      {!session.isFree && !hasSubscription ? (
                        <Ionicons name="lock-closed" size={20} color={isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted} />
                      ) : (
                        <Ionicons name="play" size={20} color={course.color} />
                      )}
                    </View>
                  </AnimatedPressable>
                </AnimatedView>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Floating Back Button */}
      <SafeAreaView
        style={styles.backButtonContainer}
        edges={["top"]}
        pointerEvents="box-none"
      >
        <AnimatedPressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? theme.colors.sleepText : theme.colors.text}
          />
        </AnimatedPressable>
      </SafeAreaView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </View>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
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
    backButtonContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
    },
    backButton: {
      marginLeft: theme.spacing.md,
      marginTop: theme.spacing.sm,
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    },
    heroSection: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.xxl,
      paddingBottom: theme.spacing.xl,
      alignItems: "center",
    },
    heroIcon: {
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: theme.spacing.lg,
    },
    heroImage: {
      width: 120,
      height: 120,
      borderRadius: 16,
      marginBottom: theme.spacing.lg,
    },
    courseCodeBadge: {
      backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      marginBottom: theme.spacing.sm,
    },
    courseCodeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 12,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      letterSpacing: 1,
    },
    courseTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
      textAlign: "center",
      marginBottom: theme.spacing.xs,
    },
    courseSubtitle: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 15,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    courseMeta: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    metaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      textTransform: "capitalize",
    },
    courseDescription: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 15,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: theme.spacing.md,
    },
    sessionsContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    sessionCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark
        ? theme.colors.sleepSurface
        : theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    sessionNumber: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionThumbnail: {
      width: 44,
      height: 44,
      borderRadius: 10,
    },
    sessionNumberText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
    },
    sessionInfo: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    sessionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: 2,
    },
    sessionCodeInfo: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: isDark ? 'rgba(255,255,255,0.5)' : theme.colors.textMuted,
      marginBottom: 2,
    },
    sessionDescription: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textLight,
      marginBottom: 4,
    },
    sessionMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    sessionMetaText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
    },
    completedText: {
      color: "#4CAF50",
    },
    playButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: isDark
        ? `${theme.colors.sleepAccent}20`
        : `${theme.colors.primary}15`,
      alignItems: "center",
      justifyContent: "center",
    },
    errorContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    backLink: {
      padding: theme.spacing.sm,
    },
    backLinkText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.primary,
    },
  });

export default function CourseDetail() {
  return (
    <ProtectedRoute>
      <CourseDetailScreen />
    </ProtectedRoute>
  );
}
