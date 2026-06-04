/**
 * ============================================================
 * features/library/screens/CollectionItemPlayerScreen.tsx
 * ============================================================
 *
 * The unified player screen for album-track / series-chapter /
 * course-session (Phase 5 Step 6). Replaces the three near-identical
 * `app/{album/track,series/chapter,course/session}/[id].tsx` screens.
 *
 * Shared mechanics live in `useCollectionItemPlayer`; this file reads the
 * route params (the set differs per type) and supplies the type-specific
 * presentation — the playback-tracking title, the TrackPlayerScreen props
 * (category / instructor / gradient / artwork icon / loading text /
 * metaInfo / parentTitle) and `buildSiblingParams` for prev/next.
 * ============================================================
 */

import React, { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TrackPlayerScreen } from '../../../shared/media-player/TrackPlayerScreen';
import { PaywallModal } from '../../subscription';
import { AccountPromptModal } from '../../auth';
import { useTheme } from '../../../core/theme/ThemeContext';
import { buildSessionMetaInfo } from '../../../utils/courseCodeParser';
import { COLLECTION_CONFIGS } from '../data/contentTypes';
import { useCollectionItemPlayer } from '../hooks/useCollectionItemPlayer';
import type { CollectionContentType } from '../types';

interface CollectionItemPlayerScreenProps {
  contentType: CollectionContentType;
}

export function CollectionItemPlayerScreen({
  contentType,
}: CollectionItemPlayerScreenProps) {
  const { theme } = useTheme();
  const config = COLLECTION_CONFIGS[contentType];

  // The param set is a union across the three player routes.
  const params = useLocalSearchParams<{
    id: string;
    audioPath: string;
    title: string;
    duration: string;
    thumbnailUrl?: string;
    currentIndex?: string;
    autoPlay?: string;
    // album
    albumTitle?: string;
    artist?: string;
    tracksJson?: string;
    // series
    seriesTitle?: string;
    narrator?: string;
    chaptersJson?: string;
    // course
    courseTitle?: string;
    courseCode?: string;
    sessionCode?: string;
    instructor?: string;
    color?: string;
    sessionsJson?: string;
  }>();

  const {
    id,
    audioPath,
    title,
    duration,
    thumbnailUrl,
    currentIndex,
    autoPlay,
    albumTitle,
    artist,
    tracksJson,
    seriesTitle,
    narrator,
    chaptersJson,
    courseTitle,
    courseCode,
    sessionCode,
    instructor,
    color,
    sessionsJson,
  } = params;

  const durationMinutes = parseInt(duration) || 0;

  // ---- Type-specific presentation values ----
  const isCourse = contentType === 'course';
  const parentTitle =
    contentType === 'album' ? albumTitle : contentType === 'series' ? seriesTitle : courseTitle;
  const instructorName =
    contentType === 'album' ? artist : contentType === 'series' ? narrator : instructor;
  const siblingsJson =
    contentType === 'album' ? tracksJson : contentType === 'series' ? chaptersJson : sessionsJson;

  // Course uses the raw session title; album/series prefix with the parent title
  // (matches the originals, including when `title` is absent).
  const playerBehaviorTitle = isCourse ? title : `${parentTitle}: ${title}`;

  const categoryLabel =
    contentType === 'album'
      ? albumTitle || 'Album'
      : contentType === 'series'
        ? seriesTitle || 'Series'
        : courseTitle || 'Course';

  const artworkIcon: 'musical-notes' | 'book' | 'school' =
    contentType === 'album' ? 'musical-notes' : contentType === 'series' ? 'book' : 'school';

  const loadingText =
    contentType === 'album'
      ? 'Loading track...'
      : contentType === 'series'
        ? 'Loading chapter...'
        : 'Loading session...';

  // Course uses its accent color for the gradient; album/series use sleepyNight.
  const courseColor = color || '#7DAFB4';
  const gradientColors: [string, string] = isCourse
    ? [courseColor, `${courseColor}CC`]
    : (theme.gradients.sleepyNight as [string, string]);

  const metaInfo =
    isCourse && sessionCode && courseCode
      ? buildSessionMetaInfo(sessionCode, courseCode)
      : undefined;

  // Build the route params for a sibling (prev/next), per content type.
  const buildSiblingParams = (
    sibling: any,
    index: number,
    opts: { autoPlay: boolean }
  ): Record<string, string> => {
    const autoPlayPart = opts.autoPlay ? { autoPlay: 'true' } : {};
    const common = {
      id: sibling.id,
      audioPath: sibling.audioPath,
      title: sibling.title,
      duration: String(sibling.duration_minutes),
      thumbnailUrl: thumbnailUrl || '',
      currentIndex: String(index),
    };
    if (contentType === 'album') {
      return {
        ...common,
        albumTitle: albumTitle ?? '',
        artist: artist ?? '',
        tracksJson: tracksJson ?? '',
        ...autoPlayPart,
      };
    }
    if (contentType === 'series') {
      return {
        ...common,
        seriesTitle: seriesTitle ?? '',
        narrator: narrator ?? '',
        chaptersJson: chaptersJson ?? '',
        ...autoPlayPart,
      };
    }
    return {
      ...common,
      courseTitle: courseTitle ?? '',
      courseCode: courseCode || '',
      sessionCode: sibling.code || '',
      instructor: instructor ?? '',
      color: color ?? '',
      sessionsJson: sessionsJson ?? '',
      ...autoPlayPart,
    };
  };

  const {
    loading,
    currentAudioUrl,
    audioPlayer,
    hasPrevious,
    hasNext,
    isFavorited,
    userRating,
    onToggleFavorite,
    onPlayPause,
    onRate,
    onReport,
    showPaywall,
    closePaywall,
    handleGoBack,
    handlePrevious,
    handleNext,
  } = useCollectionItemPlayer(config, {
    childId: id,
    audioPath,
    siblingsJson,
    currentIndex,
    autoPlay,
    playerBehaviorTitle,
    durationMinutes,
    thumbnailUrl,
    buildSiblingParams,
  });

  const [showAccountPrompt, setShowAccountPrompt] = useState(false);

  return (
    <>
      <TrackPlayerScreen
        category={categoryLabel}
        title={title || 'Loading...'}
        instructor={instructorName}
        metaInfo={metaInfo}
        durationMinutes={durationMinutes}
        gradientColors={gradientColors}
        artworkIcon={artworkIcon}
        artworkThumbnailUrl={thumbnailUrl}
        isFavorited={isFavorited}
        isLoading={loading}
        audioPlayer={audioPlayer}
        onBack={handleGoBack}
        onToggleFavorite={onToggleFavorite}
        onPlayPause={onPlayPause}
        loadingText={loadingText}
        onPrevious={hasPrevious ? handlePrevious : undefined}
        onNext={hasNext ? handleNext : undefined}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        contentId={id}
        contentType={config.childContentType}
        audioUrl={currentAudioUrl}
        audioPath={audioPath}
        parentTitle={parentTitle}
        skipRestore={autoPlay === 'true'}
        userRating={userRating}
        onRate={onRate}
        onReport={onReport}
      />
      <PaywallModal
        visible={showPaywall}
        onClose={closePaywall}
        onAccountLinkPrompt={() => setShowAccountPrompt(true)}
      />
      <AccountPromptModal
        visible={showAccountPrompt}
        onClose={() => setShowAccountPrompt(false)}
      />
    </>
  );
}
