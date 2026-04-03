import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../src/contexts/ThemeContext';
import { AnimatedView, FadeView } from '../src/components/AnimatedView';
import { AnimatedPressable } from '../src/components/AnimatedPressable';
import { Theme } from '../src/theme';

const ONBOARDING_KEY = '@calmdemy_onboarding';
const PREFERENCES_KEY = '@calmdemy_user_preferences';

// --- DATA ---

const goals = [
  { id: 'anxiety', icon: '🌊', label: 'Ease anxiety', desc: 'Find calm when your mind races' },
  { id: 'sleep', icon: '🌙', label: 'Sleep better', desc: 'Fall asleep faster, wake rested' },
  { id: 'focus', icon: '🎯', label: 'Sharpen focus', desc: 'Train your attention and clarity' },
  { id: 'growth', icon: '🌱', label: 'Self-improvement', desc: 'Build mental resilience and tools' },
  { id: 'stress', icon: '💆', label: 'Manage stress', desc: 'Decompress from daily pressure' },
  { id: 'healing', icon: '💛', label: 'Process emotions', desc: 'Navigate grief, anger, or sadness' },
];

const experiences = [
  { id: 'new', icon: '🌱', label: 'Brand new', desc: "I've never meditated" },
  { id: 'curious', icon: '🌿', label: 'A little curious', desc: "I've tried it a few times" },
  { id: 'regular', icon: '🌳', label: 'Regular practice', desc: 'I meditate occasionally' },
  { id: 'deep', icon: '🏔️', label: 'Experienced', desc: 'Meditation is part of my life' },
];

const durations = [
  { id: '3', label: '3 min', desc: 'Quick reset', icon: '⚡' },
  { id: '5', label: '5 min', desc: 'Daily starter', icon: '☀️' },
  { id: '10', label: '10 min', desc: 'Sweet spot', icon: '🧘', recommended: true },
  { id: '20', label: '20+', desc: 'Deep dive', icon: '🌊' },
];

type GoalId = 'anxiety' | 'sleep' | 'focus' | 'growth' | 'stress' | 'healing';

const recommendations: Record<GoalId, {
  therapy: string;
  technique: string;
  firstSession: string;
  course: string;
  why: string;
  paywallHeadline: string;
}> = {
  anxiety: {
    therapy: 'CBT (Cognitive Behavioral Therapy)',
    technique: 'Breathing + Grounding',
    firstSession: 'Emergency Calm: 3-Minute Anxiety Reset',
    course: 'CBT Foundations: Rewiring Anxious Thoughts',
    why: 'CBT is the gold-standard therapy for anxiety. Our course adapts its core techniques into guided meditations you can use anywhere.',
    paywallHeadline: 'Your anxiety toolkit awaits',
  },
  sleep: {
    therapy: 'MBCT (Mindfulness-Based CBT)',
    technique: 'Body Scan + Visualization',
    firstSession: 'Moonlit Forest: A Sleep Journey',
    course: 'Sleep Science: 7 Nights to Better Rest',
    why: 'Poor sleep often starts with a restless mind. Our sleep program combines mindfulness techniques with evidence-based sleep hygiene.',
    paywallHeadline: 'Unlock better sleep tonight',
  },
  focus: {
    therapy: 'ACT (Acceptance & Commitment)',
    technique: 'Mindfulness + Breathing',
    firstSession: 'Sharp Mind: 5-Minute Focus Reset',
    course: 'ACT for Focus: Training Your Attention',
    why: "ACT teaches you to notice distractions without fighting them \u2014 a skill that transforms how you work and think.",
    paywallHeadline: 'Train your focus daily',
  },
  growth: {
    therapy: 'ACT + IFS (Internal Family Systems)',
    technique: 'Loving Kindness + Visualization',
    firstSession: 'Morning Intention: Start Your Day with Clarity',
    course: 'The Inner Leader: Psychology-Based Growth',
    why: "Real self-improvement isn't about willpower \u2014 it's about understanding your mind. This course draws from ACT and IFS to build lasting change.",
    paywallHeadline: 'Start your growth journey',
  },
  stress: {
    therapy: 'DBT (Dialectical Behavior Therapy)',
    technique: 'Breathing + Body Scan',
    firstSession: 'Pressure Release: A 5-Minute Decompression',
    course: 'DBT Skills: Managing Stress Like a Therapist',
    why: 'DBT was designed for emotional overwhelm. Our course distills its most practical tools into daily meditations.',
    paywallHeadline: 'Master your stress response',
  },
  healing: {
    therapy: 'IFS + Somatic Therapy',
    technique: 'Loving Kindness + Grounding',
    firstSession: 'A Gentle Space: Holding What Hurts',
    course: 'Somatic Healing: Listening to Your Body',
    why: "Emotions live in the body, not just the mind. This course blends somatic awareness with IFS to help you process what you're carrying.",
    paywallHeadline: 'Begin your healing path',
  },
};

// --- STEP COMPONENTS ---

function WelcomeStep({
  onNext,
  theme,
  isDark,
}: {
  onNext: () => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <FadeView delay={100} duration={600}>
          <View style={styles.welcomeCenter}>
            <View style={styles.welcomeIconCircle}>
              <Ionicons name="leaf" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Calmdemy</Text>
            <Text style={styles.welcomeTagline}>Where mindfulness meets psychology</Text>
            <Text style={styles.welcomeSubtext}>
              We'll ask a few quick questions to personalize your experience. Takes about 30 seconds.
            </Text>
          </View>
        </FadeView>
      </View>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Let's begin</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textOnPrimary} />
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function GoalStep({
  onNext,
  selected,
  setSelected,
  theme,
  isDark,
}: {
  onNext: () => void;
  selected: string | null;
  setSelected: (id: string) => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>STEP 1 OF 4</Text>
        <Text style={styles.stepTitle}>What brings you here?</Text>
        <Text style={styles.stepSubtitle}>Pick the one that resonates most. You can explore everything later.</Text>
      </View>

      <ScrollView style={styles.stepContent} contentContainerStyle={styles.optionsGrid} showsVerticalScrollIndicator={false}>
        {goals.map((g, i) => (
          <AnimatedView key={g.id} delay={i * 60} duration={400}>
            <AnimatedPressable
              onPress={() => setSelected(g.id)}
              style={[
                styles.goalCard,
                selected === g.id && styles.goalCardSelected,
              ]}
            >
              <Text style={styles.goalIcon}>{g.icon}</Text>
              <Text style={[styles.goalLabel, selected === g.id && styles.goalLabelSelected]}>
                {g.label}
              </Text>
              <Text style={styles.goalDesc}>{g.desc}</Text>
            </AnimatedPressable>
          </AnimatedView>
        ))}
      </ScrollView>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} disabled={!selected} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={[styles.primaryButtonGradient, !selected && styles.buttonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function ExperienceStep({
  onNext,
  selected,
  setSelected,
  theme,
  isDark,
}: {
  onNext: () => void;
  selected: string | null;
  setSelected: (id: string) => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>STEP 2 OF 4</Text>
        <Text style={styles.stepTitle}>How's your meditation experience?</Text>
        <Text style={styles.stepSubtitle}>No wrong answer — we'll meet you where you are.</Text>
      </View>

      <View style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}>
        {experiences.map((e, i) => (
          <AnimatedView key={e.id} delay={i * 80} duration={400}>
            <AnimatedPressable
              onPress={() => setSelected(e.id)}
              style={[
                styles.listCard,
                selected === e.id && styles.listCardSelected,
              ]}
            >
              <Text style={styles.listCardIcon}>{e.icon}</Text>
              <View style={styles.listCardContent}>
                <Text style={[styles.listCardLabel, selected === e.id && styles.listCardLabelSelected]}>
                  {e.label}
                </Text>
                <Text style={styles.listCardDesc}>{e.desc}</Text>
              </View>
              <View style={[
                styles.radioOuter,
                selected === e.id && styles.radioOuterSelected,
              ]}>
                {selected === e.id && <View style={styles.radioInner} />}
              </View>
            </AnimatedPressable>
          </AnimatedView>
        ))}
      </View>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} disabled={!selected} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={[styles.primaryButtonGradient, !selected && styles.buttonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function DurationStep({
  onNext,
  selected,
  setSelected,
  theme,
  isDark,
}: {
  onNext: () => void;
  selected: string | null;
  setSelected: (id: string) => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>STEP 3 OF 4</Text>
        <Text style={styles.stepTitle}>How long feels right?</Text>
        <Text style={styles.stepSubtitle}>Your ideal daily session length. You can always adjust.</Text>
      </View>

      <View style={[styles.stepContent, { paddingHorizontal: theme.spacing.xl }]}>
        <View style={styles.durationRow}>
          {durations.map((d, i) => (
            <AnimatedView key={d.id} delay={i * 80} duration={400}>
              <AnimatedPressable
                onPress={() => setSelected(d.id)}
                style={[
                  styles.durationCard,
                  selected === d.id && styles.durationCardSelected,
                ]}
              >
                {d.recommended && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>POPULAR</Text>
                  </View>
                )}
                <Text style={styles.durationIcon}>{d.icon}</Text>
                <Text style={[styles.durationLabel, selected === d.id && styles.durationLabelSelected]}>
                  {d.label}
                </Text>
                <Text style={styles.durationDesc}>{d.desc}</Text>
              </AnimatedPressable>
            </AnimatedView>
          ))}
        </View>
      </View>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} disabled={!selected} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={[styles.primaryButtonGradient, !selected && styles.buttonDisabled]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function RecommendationStep({
  goal,
  duration,
  onNext,
  theme,
  isDark,
}: {
  goal: GoalId;
  duration: string;
  onNext: () => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const rec = recommendations[goal] || recommendations.anxiety;

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>YOUR PERSONALIZED PATH</Text>
        <Text style={[styles.stepTitle, { fontSize: 22 }]}>Here's what we recommend</Text>
      </View>

      <ScrollView style={styles.stepContent} contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.md }} showsVerticalScrollIndicator={false}>
        {/* First session card */}
        <AnimatedView delay={100} duration={500}>
          <View style={styles.recSessionCard}>
            <View style={styles.recSessionBadge}>
              <View style={styles.recPlayIcon}>
                <Ionicons name="play" size={14} color={theme.colors.textOnPrimary} />
              </View>
              <Text style={styles.recSessionBadgeText}>START HERE</Text>
            </View>
            <Text style={styles.recSessionTitle}>{rec.firstSession}</Text>
            <Text style={styles.recSessionMeta}>
              {duration} min · {rec.technique} · Free
            </Text>
          </View>
        </AnimatedView>

        {/* Course recommendation */}
        <AnimatedView delay={250} duration={500}>
          <View style={styles.recCourseCard}>
            <View style={styles.recCourseBadgeRow}>
              <Text style={styles.recCourseBadgeText}>RECOMMENDED COURSE</Text>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>PREMIUM</Text>
              </View>
            </View>
            <Text style={styles.recCourseTitle}>{rec.course}</Text>
            <Text style={styles.recCourseMeta}>Based on {rec.therapy}</Text>
            <View style={styles.recCourseQuote}>
              <Text style={styles.recCourseQuoteText}>{rec.why}</Text>
            </View>
          </View>
        </AnimatedView>

        {/* Free content note */}
        <AnimatedView delay={400} duration={500}>
          <View style={styles.freeNote}>
            <Text style={styles.freeNoteIcon}>✨</Text>
            <Text style={styles.freeNoteText}>
              Most content is free forever — meditations, sleep stories, sounds, and more. Courses are the only premium feature.
            </Text>
          </View>
        </AnimatedView>
      </ScrollView>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Start my first session — free</Text>
          </LinearGradient>
        </AnimatedPressable>
        <AnimatedPressable onPress={onNext} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>View subscription plans</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function PaywallStep({
  goal,
  onStartTrial,
  onSkip,
  theme,
  isDark,
}: {
  goal: GoalId;
  onStartTrial: () => void;
  onSkip: () => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const rec = recommendations[goal] || recommendations.anxiety;
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const features = [
    { icon: '🧠', text: `Full access to "${rec.course}"` },
    { icon: '📚', text: 'All psychology-based courses (CBT, ACT, DBT, and more)' },
    { icon: '🎧', text: 'Premium meditations, stories, and sounds' },
    { icon: '📈', text: 'New content added weekly' },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>UNLOCK YOUR FULL PATH</Text>
        <Text style={[styles.stepTitle, { fontSize: 22 }]}>{rec.paywallHeadline}</Text>
      </View>

      <ScrollView style={styles.stepContent} contentContainerStyle={{ paddingHorizontal: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
        {/* Feature list */}
        <View style={styles.featureList}>
          {features.map((f, i) => (
            <AnimatedView key={i} delay={i * 60} duration={400}>
              <View style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            </AnimatedView>
          ))}
        </View>

        {/* Plan cards */}
        <View style={styles.planCards}>
          {/* Annual */}
          <AnimatedView delay={300} duration={400}>
            <AnimatedPressable
              onPress={() => setSelectedPlan('annual')}
              style={[
                styles.planCard,
                selectedPlan === 'annual' && styles.planCardSelected,
              ]}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <View style={[
                styles.radioOuter,
                selectedPlan === 'annual' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'annual' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.planCardContent}>
                <Text style={styles.planName}>Annual</Text>
                <Text style={styles.planPrice}>$49.99/year · 14-day free trial</Text>
              </View>
              <Text style={styles.planMonthly}>$4.17/mo</Text>
            </AnimatedPressable>
          </AnimatedView>

          {/* Monthly */}
          <AnimatedView delay={400} duration={400}>
            <AnimatedPressable
              onPress={() => setSelectedPlan('monthly')}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
            >
              <View style={[
                styles.radioOuter,
                selectedPlan === 'monthly' && styles.radioOuterSelected,
              ]}>
                {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
              </View>
              <View style={styles.planCardContent}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planPrice}>$7.99/month · 7-day free trial</Text>
              </View>
            </AnimatedPressable>
          </AnimatedView>
        </View>

        <Text style={styles.disclaimer}>
          Cancel anytime. Subscription auto-renews until cancelled.
        </Text>
      </ScrollView>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onStartTrial} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>Start free trial</Text>
          </LinearGradient>
        </AnimatedPressable>
        <AnimatedPressable onPress={onSkip} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Continue with free content</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

// --- MAIN COMPONENT ---

export default function OnboardingScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback((nextStep: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [fadeAnim]);

  const goNext = useCallback(() => {
    animateTransition(step + 1);
  }, [step, animateTransition]);

  const goBack = useCallback(() => {
    animateTransition(Math.max(0, step - 1));
  }, [step, animateTransition]);

  const completeOnboarding = useCallback(async () => {
    const prefs = { goal, experience, duration, completedAt: new Date().toISOString() };
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(prefs));
    router.replace('/login');
  }, [goal, experience, duration]);

  // Progress bar width (steps 1-4 only, not welcome or paywall)
  const progressWidth = step >= 1 && step <= 4 ? `${(step / 4) * 100}%` : '0%';
  const showProgress = step >= 1 && step <= 4;
  const showBack = step > 0;
  const showSkip = step >= 1 && step <= 4;

  return (
    <View style={styles.container}>
      {/* Top bar: back + progress + skip */}
      <View style={styles.topBar}>
        {showBack ? (
          <AnimatedPressable onPress={goBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textLight} />
          </AnimatedPressable>
        ) : (
          <View style={styles.backButton} />
        )}

        {showProgress && (
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: progressWidth as any }]} />
            </View>
          </View>
        )}

        {showSkip ? (
          <AnimatedPressable onPress={() => animateTransition(4)} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Skip</Text>
          </AnimatedPressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Step content */}
      <Animated.View style={[styles.stepWrapper, { opacity: fadeAnim }]}>
        {step === 0 && (
          <WelcomeStep onNext={goNext} theme={theme} isDark={isDark} />
        )}
        {step === 1 && (
          <GoalStep
            onNext={goNext}
            selected={goal}
            setSelected={setGoal}
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 2 && (
          <ExperienceStep
            onNext={goNext}
            selected={experience}
            setSelected={setExperience}
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 3 && (
          <DurationStep
            onNext={goNext}
            selected={duration}
            setSelected={setDuration}
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 4 && (
          <RecommendationStep
            goal={(goal as GoalId) || 'anxiety'}
            duration={duration || '10'}
            onNext={goNext}
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 5 && (
          <PaywallStep
            goal={(goal as GoalId) || 'anxiety'}
            onStartTrial={completeOnboarding}
            onSkip={completeOnboarding}
            theme={theme}
            isDark={isDark}
          />
        )}
      </Animated.View>
    </View>
  );
}

// --- STYLES ---

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    // Top bar
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      zIndex: 10,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressBarContainer: {
      flex: 1,
      paddingHorizontal: theme.spacing.sm,
    },
    progressBarTrack: {
      height: 3,
      backgroundColor: theme.colors.gray[200],
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
    },
    skipButton: {
      width: 50,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.textMuted,
    },

    // Step layout
    stepWrapper: {
      flex: 1,
    },
    stepContainer: {
      flex: 1,
    },
    stepHeader: {
      paddingHorizontal: theme.spacing.xl,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    stepContent: {
      flex: 1,
    },
    stepFooter: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      paddingTop: theme.spacing.md,
    },

    // Typography
    eyebrow: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 11,
      color: theme.colors.primary,
      letterSpacing: 1.5,
      marginBottom: theme.spacing.sm,
    },
    stepTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 26,
      color: theme.colors.text,
      letterSpacing: -0.3,
      lineHeight: 32,
      marginBottom: theme.spacing.xs,
    },
    stepSubtitle: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
      lineHeight: 20,
    },

    // Welcome step
    welcomeCenter: {
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      paddingHorizontal: theme.spacing.xl,
    },
    welcomeIconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primaryLight + '30',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.xl,
      ...theme.shadows.glow,
    },
    welcomeTitle: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 32,
      color: theme.colors.text,
      letterSpacing: -0.5,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    welcomeTagline: {
      fontFamily: theme.fonts.body.italic,
      fontSize: 18,
      color: theme.colors.textLight,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    welcomeSubtext: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 15,
      color: theme.colors.textMuted,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 300,
    },

    // Goal grid
    optionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: theme.spacing.xl,
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    goalCard: {
      width: (Dimensions.get('window').width - theme.spacing.xl * 2 - theme.spacing.sm) / 2,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    goalCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}12`,
    },
    goalIcon: {
      fontSize: 24,
      marginBottom: theme.spacing.sm,
    },
    goalLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 2,
    },
    goalLabelSelected: {
      color: theme.colors.primary,
    },
    goalDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textLight,
    },

    // List cards (experience)
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.sm,
      ...theme.shadows.sm,
    },
    listCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}12`,
    },
    listCardIcon: {
      fontSize: 24,
      marginRight: theme.spacing.md,
    },
    listCardContent: {
      flex: 1,
    },
    listCardLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
    },
    listCardLabelSelected: {
      color: theme.colors.primary,
    },
    listCardDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      marginTop: 2,
    },

    // Radio
    radioOuter: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.gray[300],
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioOuterSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary,
    },
    radioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.textOnPrimary,
    },

    // Duration cards
    durationRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
    },
    durationCard: {
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.surface,
      width: 80,
      ...theme.shadows.sm,
    },
    durationCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}12`,
    },
    durationIcon: {
      fontSize: 24,
      marginBottom: theme.spacing.sm,
    },
    durationLabel: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 18,
      color: theme.colors.text,
      marginBottom: 2,
    },
    durationLabelSelected: {
      color: theme.colors.primary,
    },
    durationDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.textLight,
      textAlign: 'center',
    },
    popularBadge: {
      position: 'absolute',
      top: -10,
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    popularBadgeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 9,
      color: theme.colors.textOnPrimary,
      letterSpacing: 0.5,
    },

    // Recommendation step
    recSessionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      ...theme.shadows.md,
    },
    recSessionBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    recPlayIcon: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    recSessionBadgeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 11,
      color: theme.colors.primary,
      letterSpacing: 1,
    },
    recSessionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: theme.colors.text,
      marginBottom: 4,
    },
    recSessionMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
    },

    recCourseCard: {
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}08`,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
    },
    recCourseBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
    },
    recCourseBadgeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 11,
      color: theme.colors.secondary,
      letterSpacing: 1,
    },
    premiumBadge: {
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    premiumBadgeText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 9,
      color: theme.colors.textOnPrimary,
    },
    recCourseTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: theme.colors.text,
      marginBottom: 6,
    },
    recCourseMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
    },
    recCourseQuote: {
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.secondary,
      paddingLeft: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    recCourseQuoteText: {
      fontFamily: theme.fonts.body.italic,
      fontSize: 13,
      color: theme.colors.text,
      lineHeight: 20,
    },

    freeNote: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}08`,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
    },
    freeNoteIcon: {
      fontSize: 18,
    },
    freeNoteText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      lineHeight: 18,
    },

    // Paywall
    featureList: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    featureIcon: {
      fontSize: 18,
      width: 28,
      textAlign: 'center',
    },
    featureText: {
      flex: 1,
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },

    planCards: {
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    planCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.gray[200],
      backgroundColor: theme.colors.surface,
      ...theme.shadows.sm,
    },
    planCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: isDark ? theme.colors.gray[100] : `${theme.colors.primary}12`,
    },
    planCardContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    planName: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.text,
    },
    planPrice: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
    },
    planMonthly: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.primary,
    },
    bestValueBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: theme.colors.secondary,
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 10,
    },
    bestValueText: {
      fontFamily: theme.fonts.ui.bold,
      fontSize: 10,
      color: theme.colors.textOnPrimary,
      letterSpacing: 0.5,
    },
    disclaimer: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 11,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },

    // Buttons
    primaryButton: {
      marginBottom: theme.spacing.sm,
    },
    primaryButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: theme.borderRadius.md,
      gap: theme.spacing.sm,
      ...theme.shadows.md,
    },
    primaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: theme.colors.textOnPrimary,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    secondaryButtonText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: theme.colors.primary,
    },
    ghostButton: {
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    ghostButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.textLight,
    },
  });
