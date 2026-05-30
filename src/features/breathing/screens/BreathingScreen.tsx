/**
 * ============================================================
 * features/breathing/screens/BreathingScreen.tsx
 * ============================================================
 *
 * The breathing feature's main (and currently only) screen. Lets the
 * user pick a technique from the built-in catalogue and then runs the
 * guided breathing animation against the chosen pattern.
 *
 * This file owns the screen body; the route wrapper at
 * `/app/breathing.tsx` handles the ProtectedRoute auth gate.
 *
 * Imports:
 *   - components/BreathingGuide — animated circle visualizer (sibling)
 *   - hooks/useBreathing        — breathing state machine (sibling)
 *   - data/techniques           — built-in technique catalogue (sibling)
 *   - types                     — BreathingTechnique (sibling)
 *   - core/theme                — useTheme + Theme type (cross-subsystem,
 *                                  allowed because core is a hard dep)
 * ============================================================
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BreathingGuide } from '../components/BreathingGuide';
import { useBreathing } from '../hooks/useBreathing';
import { breathingTechniques } from '../data/techniques';
import type { BreathingTechnique } from '../types';
import { useTheme } from '../../../core/theme/ThemeContext';
import { Theme } from '../../../core/theme';

export function BreathingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [selectedTechnique, setSelectedTechnique] = useState<BreathingTechnique | null>(null);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const breathing = useBreathing({
    pattern: selectedTechnique?.pattern || breathingTechniques[0].pattern,
    onCycleComplete: () => {
      console.log('Cycle completed');
    },
    onComplete: () => {
      console.log('Exercise completed');
    },
  });

  const handleTechniqueSelect = (technique: BreathingTechnique) => {
    if (breathing.isActive) {
      breathing.stop();
    }
    setSelectedTechnique(technique);
  };

  const handleBack = () => {
    if (breathing.isActive) {
      breathing.stop();
    }
    if (selectedTechnique) {
      setSelectedTechnique(null);
    } else {
      router.back();
    }
  };

  if (selectedTechnique) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient
          colors={selectedTechnique.gradient}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedTechnique.name}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.breathingContainer}>
            <BreathingGuide
              isActive={breathing.isActive}
              isPaused={breathing.isPaused}
              currentPhase={breathing.currentPhase}
              phaseProgress={breathing.phaseProgress}
              currentCycle={breathing.currentCycle}
              totalCycles={breathing.totalCycles}
              instructions={breathing.instructions}
              onStart={breathing.start}
              onPause={breathing.pause}
              onResume={breathing.resume}
              onStop={breathing.stop}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButtonDark}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Breathing Exercises</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Choose a breathing technique to help you relax, focus, or energize
        </Text>

        <View style={styles.techniquesContainer}>
          {breathingTechniques.map((technique) => (
            <TouchableOpacity
              key={technique.id}
              style={styles.techniqueCard}
              onPress={() => handleTechniqueSelect(technique)}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={technique.gradient}
                style={styles.techniqueGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.techniqueHeader}>
                  <Text style={styles.techniqueName}>{technique.name}</Text>
                  <Ionicons name="arrow-forward-circle" size={28} color="white" />
                </View>
                <Text style={styles.techniqueDescription}>
                  {technique.description}
                </Text>
                <View style={styles.techniqueBenefits}>
                  {technique.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitChip}>
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.techniquePattern}>
                  <Text style={styles.patternText}>
                    {technique.pattern.inhale_duration}s inhale
                    {technique.pattern.hold_duration && ` - ${technique.pattern.hold_duration}s hold`}
                    {` - ${technique.pattern.exhale_duration}s exhale`}
                    {technique.pattern.pause_duration && ` - ${technique.pattern.pause_duration}s pause`}
                  </Text>
                  <Text style={styles.cyclesText}>
                    {technique.pattern.cycles} cycles
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    gradient: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButtonDark: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.gray[200],
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 20,
      color: 'white',
    },
    title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 28,
      color: theme.colors.text,
    },
    subtitle: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: theme.colors.textLight,
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
    },
    breathingContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.lg,
    },
    techniquesContainer: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    techniqueCard: {
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.xl,
      overflow: 'hidden',
      ...theme.shadows.md,
    },
    techniqueGradient: {
      padding: theme.spacing.lg,
    },
    techniqueHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    techniqueName: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
      color: 'white',
    },
    techniqueDescription: {
      fontFamily: theme.fonts.body.regular,
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.9)',
      marginBottom: theme.spacing.md,
      lineHeight: 22,
    },
    techniqueBenefits: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    benefitChip: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 4,
      borderRadius: theme.borderRadius.sm,
    },
    benefitText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 12,
      color: 'white',
    },
    techniquePattern: {
      borderTopWidth: 1,
      borderTopColor: 'rgba(255, 255, 255, 0.2)',
      paddingTop: theme.spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    patternText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
    cyclesText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: 'white',
    },
  });
