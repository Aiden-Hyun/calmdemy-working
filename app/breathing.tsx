import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { BreathingGuide } from '../src/components/BreathingGuide';
import { useBreathing } from '../src/hooks/useBreathing';
import { useTheme } from '../src/contexts/ThemeContext';
import { Theme } from '../src/theme';
import { BreathingPattern } from '../src/types';

interface BreathingTechnique {
  id: string;
  name: string;
  description: string;
  pattern: BreathingPattern;
  benefits: string[];
  gradient: [string, string];
}

const breathingTechniques: BreathingTechnique[] = [
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

function BreathingScreen() {
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

export default function Breathing() {
  return (
    <ProtectedRoute>
      <BreathingScreen />
    </ProtectedRoute>
  );
}
