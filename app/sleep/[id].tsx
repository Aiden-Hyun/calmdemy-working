import React, { useEffect, useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { MediaPlayer } from "../../src/components/MediaPlayer";
import { useAudioPlayer } from "../../src/hooks/useAudioPlayer";
import { usePlayerBehavior } from "../../src/hooks/usePlayerBehavior";
import { useTheme } from "../../src/contexts/ThemeContext";
import { getBedtimeStoryById } from "../../src/services/firestoreService";
import { getAudioUrl } from "../../src/constants/audioFiles";
import { Theme } from "../../src/theme";
import { BedtimeStory } from "../../src/types";

function SleepStoryPlayerScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const [story, setStory] = useState<BedtimeStory | null>(null);
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
    contentType: "bedtime_story",
    audioPlayer,
    title: story?.title,
    durationMinutes: story?.duration_minutes,
    thumbnailUrl: story?.thumbnail_url,
  });

  useEffect(() => {
    async function loadStory() {
      try {
        setLoading(true);
        const data = await getBedtimeStoryById(id as string);
        setStory(data);
      } catch (error) {
        console.error("Failed to load bedtime story:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadStory();
    }
  }, [id]);

  useEffect(() => {
    async function loadStoryAudio() {
      if (!story) return;

      // Try to get audio URL from audio_file key
      if (story.audio_file) {
        const url = await getAudioUrl(story.audio_file);
        if (url) {
          setAudioUrl(url);
          audioPlayer.loadAudio(url);
          return;
        }
      }

      // Fallback to direct audio_url
      if (story.audio_url) {
        setAudioUrl(story.audio_url);
        audioPlayer.loadAudio(story.audio_url);
      }
    }

    loadStoryAudio();
  }, [story]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  const getCategoryIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (story?.category) {
      case "nature":
        return "leaf";
      case "fantasy":
        return "planet";
      case "travel":
        return "airplane";
      case "fiction":
        return "book";
      case "thriller":
        return "skull";
      default:
        return "book";
    }
  };

  // Error state - story not found
  if (!loading && !story) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#1A1D29", "#2A2D3E"]} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <Ionicons name="alert-circle-outline" size={64} color={theme.colors.sleepAccent} />
            <Text style={styles.errorText}>Story not found</Text>
            <TouchableOpacity style={styles.backButtonLarge} onPress={handleGoBack}>
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <MediaPlayer
      category={story?.category || 'bedtime story'}
      title={story?.title || 'Loading...'}
      instructor={story?.narrator}
      description={story?.description}
      durationMinutes={story?.duration_minutes || 0}
      gradientColors={["#1A1D29", "#2A2D3E"]}
      artworkIcon={getCategoryIcon()}
      artworkThumbnailUrl={story?.thumbnail_url}
      isFavorited={isFavorited}
      isLoading={loading}
      audioPlayer={audioPlayer}
      onBack={handleGoBack}
      onToggleFavorite={onToggleFavorite}
      onPlayPause={onPlayPause}
      loadingText="Loading story..."
      contentId={id as string}
      contentType="bedtime_story"
      audioUrl={audioUrl}
      audioPath={story?.audio_file}
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

export default function SleepStoryPlayer() {
  return (
    <ProtectedRoute>
      <SleepStoryPlayerScreen />
    </ProtectedRoute>
  );
}
