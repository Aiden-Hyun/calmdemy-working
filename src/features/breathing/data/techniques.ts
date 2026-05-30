/**
 * ============================================================
 * features/breathing/data/techniques.ts — Built-in technique catalogue
 * ============================================================
 *
 * Hardcoded list of breathing techniques surfaced on the breathing
 * screen. These don't come from Firestore today; they're shipped with
 * the app so the feature works offline and so the content is
 * code-reviewable rather than depending on database state.
 *
 * If/when the Firestore-backed `BreathingExercise` collection is wired
 * up, this catalogue can either disappear (fully data-driven) or merge
 * with the remote list (hardcoded as fallback).
 * ============================================================
 */

import type { BreathingTechnique } from '../types';

export const breathingTechniques: BreathingTechnique[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    description: 'Equal parts inhale, hold, exhale, pause. Great for focus and calm.',
    pattern: {
      inhale_duration: 4,
      hold_duration: 4,
      exhale_duration: 4,
      pause_duration: 4,
      cycles: 8,
    },
    benefits: ['Reduces stress', 'Improves focus', 'Calms anxiety'],
    gradient: ['#74b9ff', '#a0d2ff'],
  },
  {
    id: '478',
    name: '4-7-8 Breathing',
    description: 'Inhale for 4, hold for 7, exhale for 8. Perfect for sleep.',
    pattern: {
      inhale_duration: 4,
      hold_duration: 7,
      exhale_duration: 8,
      cycles: 4,
    },
    benefits: ['Promotes sleep', 'Reduces anxiety', 'Lowers blood pressure'],
    gradient: ['#5f3dc4', '#7c5cdb'],
  },
  {
    id: 'belly',
    name: 'Belly Breathing',
    description: 'Deep diaphragmatic breathing. Simple and effective.',
    pattern: {
      inhale_duration: 5,
      exhale_duration: 5,
      cycles: 10,
    },
    benefits: ['Relaxes body', 'Improves oxygen flow', 'Reduces tension'],
    gradient: ['#00b894', '#00d9a3'],
  },
  {
    id: 'coherent',
    name: 'Coherent Breathing',
    description: '5 seconds in, 5 seconds out. Balances your nervous system.',
    pattern: {
      inhale_duration: 5,
      exhale_duration: 5,
      cycles: 12,
    },
    benefits: ['Heart rate variability', 'Emotional balance', 'Energy boost'],
    gradient: ['#fd79a8', '#fdcb6e'],
  },
];
