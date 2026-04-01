import React, { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ProtectedRoute } from "../../src/components/ProtectedRoute";
import { MediaPlayer } from "../../src/components/MediaPlayer";
import { useAudioPlayer } from "../../src/hooks/useAudioPlayer";
import { usePlayerBehavior } from "../../src/hooks/usePlayerBehavior";
import { getAudioUrlFromPath } from "../../src/constants/audioFiles";

// Helper to lighten a hex color
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function EmergencyPlayerScreen() {
  const {
    id,
    title,
    description,
    duration,
    audioPath,
    color,
    icon,
    narrator,
    thumbnailUrl,
  } = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    duration: string;
    audioPath: string;
    color: string;
    icon: string;
    narrator: string;
    thumbnailUrl?: string;
  }>();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);

  const audioPlayer = useAudioPlayer();
  const durationMinutes = parseInt(duration) || 4;

  // Use the shared player behavior hook
  const {
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
  } = usePlayerBehavior({
    contentId: id,
    contentType: "emergency",
    audioPlayer,
    title,
    durationMinutes,
    thumbnailUrl,
  });

  // Load audio
  useEffect(() => {
    async function loadAudio() {
      if (!audioPath) {
        setLoading(false);
        return;
      }

      try {
        const url = await getAudioUrlFromPath(audioPath);
        if (url) {
          setAudioUrl(url);
          audioPlayer.loadAudio(url);
        }
      } catch (error) {
        console.error("Failed to load emergency audio:", error);
      } finally {
        setLoading(false);
      }
    }

    loadAudio();
  }, [audioPath]);

  const handleGoBack = () => {
    audioPlayer.cleanup();
    router.back();
  };

  // Parse the color from params or use default
  const bgColor = color || "#E57373";
  const gradientColors: [string, string] = [bgColor, adjustColor(bgColor, 20)];

  return (
    <MediaPlayer
      category="emergency"
      title={title || "Emergency Relief"}
      instructor={narrator || "Guide"}
      description={description || "Quick relief for moments of distress"}
      durationMinutes={durationMinutes}
      gradientColors={gradientColors}
      artworkIcon={(icon as any) || "flash"}
      artworkThumbnailUrl={thumbnailUrl}
      isFavorited={isFavorited}
      isLoading={loading}
      audioPlayer={audioPlayer}
      onBack={handleGoBack}
      onToggleFavorite={onToggleFavorite}
      onPlayPause={onPlayPause}
      loadingText="Loading..."
      contentId={id}
      contentType="emergency"
      audioUrl={audioUrl}
      audioPath={audioPath}
      userRating={userRating}
      onRate={onRate}
      onReport={onReport}
    />
  );
}

export default function EmergencyPlayer() {
  return (
    <ProtectedRoute>
      <EmergencyPlayerScreen />
    </ProtectedRoute>
  );
}
