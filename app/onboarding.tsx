import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../src/contexts/ThemeContext';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { AnimatedView, FadeView } from '../src/components/AnimatedView';
import { AnimatedPressable } from '../src/components/AnimatedPressable';
import { Theme } from '../src/theme';

const ONBOARDING_KEY = '@calmdemy_onboarding';

// --- DATA ---

type FeatureItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
};

const freeFeatures: FeatureItem[] = [
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

const premiumFeatures: FeatureItem[] = [
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
        <FadeView delay={100} duration={600} style={{ flex: 1 }}>
          <View style={styles.welcomeCenter}>
            <View style={styles.welcomeIconCircle}>
              <Ionicons name="leaf" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Welcome to Calmdemy</Text>
            <Text style={styles.welcomeTagline}>Where mindfulness meets psychology</Text>
            <Text style={styles.welcomeSubtext}>
              A quick tour of what's inside — so you know what you can use today and what's part of Premium.
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
            <Text style={styles.primaryButtonText}>Take the tour</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textOnPrimary} />
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

function FeatureListStep({
  eyebrow,
  title,
  subtitle,
  items,
  accentColor,
  onNext,
  ctaLabel,
  theme,
  isDark,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: FeatureItem[];
  accentColor: string;
  onNext: () => void;
  ctaLabel: string;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={[styles.eyebrow, { color: accentColor }]}>{eyebrow}</Text>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>

      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={styles.featureScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item, i) => (
          <AnimatedView key={item.label} delay={i * 70} duration={400}>
            <View style={styles.featureCard}>
              <View style={[styles.featureIconBubble, { backgroundColor: `${accentColor}20` }]}>
                <Ionicons name={item.icon} size={22} color={accentColor} />
              </View>
              <View style={styles.featureCardContent}>
                <Text style={styles.featureCardLabel}>{item.label}</Text>
                <Text style={styles.featureCardDesc}>{item.desc}</Text>
              </View>
            </View>
          </AnimatedView>
        ))}
      </ScrollView>

      <View style={styles.stepFooter}>
        <AnimatedPressable onPress={onNext} style={styles.primaryButton}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={styles.primaryButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.textOnPrimary} />
          </LinearGradient>
        </AnimatedPressable>
      </View>
    </View>
  );
}

/**
 * Format an introductory offer (free trial) period into human text.
 * RevenueCat's product.introPrice carries { price, priceString, period,
 * periodUnit ("DAY"|"WEEK"|"MONTH"|"YEAR"), periodNumberOfUnits }.
 * Only treat it as a trial when the intro price is 0.
 */
function formatTrial(pkg: PurchasesPackage | null): string | null {
  const intro: any = pkg?.product?.introPrice;
  if (!intro || intro.price !== 0) return null;
  const units: number = intro.periodNumberOfUnits ?? 0;
  const unitRaw: string = (intro.periodUnit ?? '').toString().toLowerCase();
  if (!units || !unitRaw) return null;
  const unit = unitRaw.replace(/s$/, ''); // "days" → "day"
  return `${units}-${unit} free trial`;
}

/**
 * Derive a per-month equivalent price string from an annual package, using
 * the package's own locale-aware currency formatting when possible.
 */
function formatPerMonth(annualPkg: PurchasesPackage | null): string | null {
  if (!annualPkg) return null;
  const price = annualPkg.product.price;
  const priceString = annualPkg.product.priceString;
  if (!price || !priceString) return null;
  const perMonth = price / 12;
  // Pull the currency symbol/prefix from the locale-formatted priceString
  // (e.g. "$49.99" → "$", "€49,99" → "€"). Fallback to the raw number.
  const match = priceString.match(/^([^\d.,\s]+)/);
  const symbol = match ? match[1] : '';
  return `${symbol}${perMonth.toFixed(2)}/mo`;
}

function PlansStep({
  annualPackage,
  monthlyPackage,
  offeringLoading,
  onPurchase,
  onSkip,
  theme,
  isDark,
}: {
  annualPackage: PurchasesPackage | null;
  monthlyPackage: PurchasesPackage | null;
  offeringLoading: boolean;
  onPurchase: (pkg: PurchasesPackage) => Promise<void>;
  onSkip: () => void;
  theme: Theme;
  isDark: boolean;
}) {
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const annualTrial = useMemo(() => formatTrial(annualPackage), [annualPackage]);
  const monthlyTrial = useMemo(() => formatTrial(monthlyPackage), [monthlyPackage]);
  const perMonthFromAnnual = useMemo(() => formatPerMonth(annualPackage), [annualPackage]);

  const selectedPackage = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
  const selectedHasTrial = selectedPlan === 'annual' ? !!annualTrial : !!monthlyTrial;
  const ctaLabel = purchasing
    ? 'Processing…'
    : selectedHasTrial
    ? 'Start free trial'
    : 'Subscribe';

  const handlePurchase = async () => {
    if (!selectedPackage || purchasing) return;
    setPurchasing(true);
    try {
      await onPurchase(selectedPackage);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeader}>
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={[styles.stepTitle, { fontSize: 24 }]}>Try Premium, or jump right in</Text>
        <Text style={styles.stepSubtitle}>
          Every free feature is always free. Premium unlocks the courses and the full library.
        </Text>
      </View>

      <ScrollView
        style={styles.stepContent}
        contentContainerStyle={{ paddingHorizontal: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan cards */}
        <View style={styles.planCards}>
          {/* Annual */}
          {annualPackage && (
            <AnimatedView delay={100} duration={400}>
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
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === 'annual' && styles.radioOuterSelected,
                  ]}
                >
                  {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planCardContent}>
                  <Text style={styles.planName}>Annual</Text>
                  <Text style={styles.planPrice}>
                    {annualPackage.product.priceString}/year
                    {annualTrial ? ` · ${annualTrial}` : ''}
                  </Text>
                </View>
                {perMonthFromAnnual && (
                  <Text style={styles.planMonthly}>{perMonthFromAnnual}</Text>
                )}
              </AnimatedPressable>
            </AnimatedView>
          )}

          {/* Monthly */}
          {monthlyPackage && (
            <AnimatedView delay={200} duration={400}>
              <AnimatedPressable
                onPress={() => setSelectedPlan('monthly')}
                style={[
                  styles.planCard,
                  selectedPlan === 'monthly' && styles.planCardSelected,
                ]}
              >
                <View
                  style={[
                    styles.radioOuter,
                    selectedPlan === 'monthly' && styles.radioOuterSelected,
                  ]}
                >
                  {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.planCardContent}>
                  <Text style={styles.planName}>Monthly</Text>
                  <Text style={styles.planPrice}>
                    {monthlyPackage.product.priceString}/month
                    {monthlyTrial ? ` · ${monthlyTrial}` : ''}
                  </Text>
                </View>
              </AnimatedPressable>
            </AnimatedView>
          )}

          {/* Empty / loading state when offerings aren't available yet */}
          {!annualPackage && !monthlyPackage && (
            <View style={styles.planPlaceholder}>
              <Text style={styles.planPlaceholderText}>
                {offeringLoading
                  ? 'Loading plans…'
                  : "Plans aren't available right now. You can continue with free content."}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.disclaimer}>
          Cancel anytime. Subscription auto-renews until cancelled.
        </Text>
      </ScrollView>

      <View style={styles.stepFooter}>
        <AnimatedPressable
          onPress={handlePurchase}
          disabled={!selectedPackage || purchasing}
          style={styles.primaryButton}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primaryDark]}
            style={[
              styles.primaryButtonGradient,
              (!selectedPackage || purchasing) && styles.buttonDisabled,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.primaryButtonText}>{ctaLabel}</Text>
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

  // Live RevenueCat offering — same extraction pattern used by PaywallModal.
  const { currentOffering, isLoading: subLoading, purchasePackage } = useSubscription();
  const monthlyPackage = useMemo<PurchasesPackage | null>(() => {
    if (!currentOffering) return null;
    return (
      currentOffering.monthly ||
      currentOffering.availablePackages?.find(
        (p) =>
          p.identifier === '$rc_monthly' ||
          p.identifier.toLowerCase().includes('monthly')
      ) ||
      null
    );
  }, [currentOffering]);
  const annualPackage = useMemo<PurchasesPackage | null>(() => {
    if (!currentOffering) return null;
    return (
      currentOffering.annual ||
      currentOffering.availablePackages?.find(
        (p) =>
          p.identifier === '$rc_annual' ||
          p.identifier.toLowerCase().includes('annual') ||
          p.identifier.toLowerCase().includes('yearly')
      ) ||
      null
    );
  }, [currentOffering]);

  // 0 = Welcome, 1 = What's free, 2 = What's premium, 3 = Plans
  const [step, setStep] = useState(0);
  const TOTAL_TOUR_STEPS = 3; // Welcome not counted in progress bar

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (nextStep: number) => {
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
    },
    [fadeAnim]
  );

  const goNext = useCallback(() => {
    animateTransition(step + 1);
  }, [step, animateTransition]);

  const goBack = useCallback(() => {
    animateTransition(Math.max(0, step - 1));
  }, [step, animateTransition]);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/login');
  }, []);

  const handlePurchase = useCallback(
    async (pkg: PurchasesPackage) => {
      const success = await purchasePackage(pkg);
      if (success) {
        await completeOnboarding();
      }
    },
    [purchasePackage, completeOnboarding]
  );

  // Progress bar only visible for tour steps (1-3)
  const showProgress = step >= 1 && step <= TOTAL_TOUR_STEPS;
  const progressWidth = showProgress ? `${(step / TOTAL_TOUR_STEPS) * 100}%` : '0%';
  const showBack = step > 0;
  const showSkip = step >= 1 && step < TOTAL_TOUR_STEPS;

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
          <AnimatedPressable
            onPress={() => animateTransition(TOTAL_TOUR_STEPS)}
            style={styles.skipButton}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </AnimatedPressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      {/* Step content */}
      <Animated.View style={[styles.stepWrapper, { opacity: fadeAnim }]}>
        {step === 0 && <WelcomeStep onNext={goNext} theme={theme} isDark={isDark} />}
        {step === 1 && (
          <FeatureListStep
            eyebrow="FREE FOREVER"
            title="What's free on Calmdemy"
            subtitle="These features are always free — no account required, no trial expiring."
            items={freeFeatures}
            accentColor={theme.colors.primary}
            onNext={goNext}
            ctaLabel="Next"
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 2 && (
          <FeatureListStep
            eyebrow="CALMDEMY PREMIUM"
            title="What Premium unlocks"
            subtitle="A deeper library built around evidence-based psychology."
            items={premiumFeatures}
            accentColor={theme.colors.secondary}
            onNext={goNext}
            ctaLabel="See plans"
            theme={theme}
            isDark={isDark}
          />
        )}
        {step === 3 && (
          <PlansStep
            annualPackage={annualPackage}
            monthlyPackage={monthlyPackage}
            offeringLoading={subLoading}
            onPurchase={handlePurchase}
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
      maxWidth: 320,
    },

    // Feature list step
    featureScrollContent: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      gap: theme.spacing.md,
      ...theme.shadows.sm,
    },
    featureIconBubble: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureCardContent: {
      flex: 1,
    },
    featureCardLabel: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 2,
    },
    featureCardDesc: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      lineHeight: 18,
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

    // Plans step
    planCards: {
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
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
    planPlaceholder: {
      padding: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.gray[200],
      alignItems: 'center',
    },
    planPlaceholderText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 13,
      color: theme.colors.textLight,
      textAlign: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
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
