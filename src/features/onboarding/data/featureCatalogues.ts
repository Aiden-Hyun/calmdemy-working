/**
 * ============================================================
 * features/onboarding/data/featureCatalogues.ts
 * ============================================================
 *
 * The free vs premium feature lists shown on the onboarding paywall step.
 * Extracted from app/onboarding.tsx in Phase 6c so the screen stays focused on
 * flow/animation and the marketing copy lives in one editable place.
 * ============================================================
 */

import type { Ionicons } from '@expo/vector-icons';

export type FeatureItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
};

export const freeFeatures: FeatureItem[] = [
  {
    icon: 'leaf-outline',
    label: 'Guided meditations',
    desc: 'A full library of daily meditations for focus, calm, and rest.',
  },
  {
    icon: 'moon-outline',
    label: 'Sleep sounds & stories',
    desc: 'Wind down with ambient sounds, rain, and bedtime stories.',
  },
  {
    icon: 'musical-notes-outline',
    label: 'Ambient music',
    desc: 'Calming playlists to help you focus, study, or unwind.',
  },
  {
    icon: 'fitness-outline',
    label: 'Breathing exercises',
    desc: 'Simple techniques to reset your nervous system in minutes.',
  },
  {
    icon: 'heart-outline',
    label: 'Emergency calm',
    desc: "A 3-minute tool you can reach for when it's needed most.",
  },
];

export const premiumFeatures: FeatureItem[] = [
  {
    icon: 'school-outline',
    label: 'Psychology-based courses',
    desc: 'Structured programs built on CBT, ACT, DBT, IFS, and MBCT.',
  },
  {
    icon: 'sparkles-outline',
    label: 'Premium meditations',
    desc: 'Deeper practices and extended sessions from expert teachers.',
  },
  {
    icon: 'library-outline',
    label: 'Full story & sound library',
    desc: 'Unlock every sleep story, soundscape, and album.',
  },
  {
    icon: 'cloud-download-outline',
    label: 'Offline downloads',
    desc: 'Save anything to listen without a connection.',
  },
  {
    icon: 'trending-up-outline',
    label: 'New content weekly',
    desc: 'Fresh courses and meditations added every week.',
  },
];
