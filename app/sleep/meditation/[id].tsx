import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ProtectedRoute } from "../../../src/components/ProtectedRoute";
import { MediaPlayer } from "../../../src/components/MediaPlayer";
import { useAudioPlayer } from "../../../src/hooks/useAudioPlayer";
import { usePlayerBehavior } from "../../../src/hooks/usePlayerBehavior";
import { useTheme } from "../../../src/contexts/ThemeContext";
import {
  getSleepMeditationById,
  FirestoreSleepMeditation,
} from "../../../src/services/firestoreService";
import { getAudioUrlFromPath } from "../../../src/constants/audioFiles";
import { Theme } from "../../../src/theme";

function SleepMeditationPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [meditation, setMeditation] = useState<FirestoreSleepMeditation | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const audioPlayer = useAudioPlayer();

  // Use the shared player behavior hook
  const {
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  } = usePlayerBehavior({
    contentId: id as string,
    contentType: "sleep_meditation",
    audioPlayer,
    title: meditation?.title,
    durationMinutes: meditation?.duration_minutes,
    thumbnailUrl: meditation?.thumbnailUrl,
  });

  // Fetch meditation from Firestore
  useEffect(() => {
    async function loadMeditation() {
      if (!id) return;
      setLoading(true);
      const data = await getSleepMeditationById(id as string);
      setMeditation(data);
      setLoading(false);
    }
    loadMeditation();
  }, [id]);

  // Load audio when meditation is found
  useEffect(() => {
    async function loadAudio() {
      if (!meditation?.audioPath) return;

      const url = await getAudioUrlFromPath(meditation.audioPath);
      if (url) {
        setAudioUrl(url);
        audioPlayer.loadAudio(url);
      }
    }

    loadAudio();
  }, [meditation]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  // Error state - meditation not found
  if (!loading && !meditation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#1A1D29", "#2A2D3E"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={theme.colors.sleepAccent}
            />
            <Text style={styles.errorText}>Meditation not found</Text>
            <TouchableOpacity
              style={styles.backButtonLarge}
              onPress={handleGoBack}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <MediaPlayer
      category="sleep meditation"
      title={meditation?.title || "Loading..."}
      instructor={meditation?.instructor}
      description={meditation?.description}
      durationMinutes={meditation?.duration_minutes || 0}
      gradientColors={["#1A1D29", "#2A2D3E"]}
      artworkIcon={
        (meditation?.icon as keyof typeof Ionicons.glyphMap) || "moon"
      }
      artworkThumbnailUrl={meditation?.thumbnailUrl}
      isFavorited={isFavorited}
      isLoading={loading}
      audioPlayer={audioPlayer}
      onBack={handleGoBack}
      onToggleFavorite={onToggleFavorite}
      onPlayPause={onPlayPause}
      loadingText="Loading meditation..."
      contentId={id as string}
      contentType="sleep_meditation"
      audioUrl={audioUrl}
      audioPath={meditation?.audioPath}
      userRating={userRating}
      onRate={onRate}
      onReport={onReport}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: "#1A1D29",
    },
    gradient: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.md,
    },
    errorText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
      color: theme.colors.sleepText,
      marginTop: theme.spacing.md,
    },
    backButtonLarge: {
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      backgroundColor: theme.colors.sleepAccent,
      borderRadius: theme.borderRadius.lg,
    },
    backButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.sleepBackground,
    },
  });

export default function SleepMeditationPlayer() {
  return (
    <ProtectedRoute>
      <SleepMeditationPlayerScreen />
    </ProtectedRoute>
  );
}
