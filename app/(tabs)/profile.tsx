import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ProtectedRoute } from '../../src/components/ProtectedRoute';
import { AnimatedView } from '../../src/components/AnimatedView';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { Skeleton } from '../../src/components/Skeleton';
import { PaywallModal } from '../../src/components/PaywallModal';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSubscription } from '../../src/contexts/SubscriptionContext';
import { useStats } from '../../src/hooks/useStats';
import { Theme } from '../../src/theme';

const milestones = [
  { id: 'week', icon: 'leaf-outline' as const, label: 'First Week', days: 7, description: 'Planted the seed', color: '#8B9F82' },
  { id: 'month', icon: 'flower-outline' as const, label: 'One Month', days: 30, description: 'Growing strong', color: '#A8B89F' },
  { id: 'quarter', icon: 'rose-outline' as const, label: '3 Months', days: 90, description: 'Deep roots', color: '#C4A77D' },
  { id: 'year', icon: 'trophy-outline' as const, label: 'One Year', days: 365, description: 'Mountain climber', color: '#D4A5A5' },
];

function ProfileScreen() {
  const router = useRouter();
  const { user, logout, isAnonymous } = useAuth();
  const { theme, isDark } = useTheme();
  const { stats, loading } = useStats();
  const { isPremium, restorePurchases } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);
  const avatarGradient = theme.gradients.sage as [string, string];

  // Generate a consistent random nickname for anonymous users based on their UID
  const generateGuestNickname = (uid: string): string => {
    const adjectives = [
      'Calm', 'Peaceful', 'Serene', 'Gentle', 'Mindful', 'Tranquil', 'Zen',
      'Cozy', 'Dreamy', 'Blissful', 'Mellow', 'Quiet', 'Still', 'Soft',
      'Happy', 'Bright', 'Sunny', 'Warm', 'Kind', 'Sweet', 'Lovely'
    ];
    const animals = [
      'Panda', 'Koala', 'Bunny', 'Owl', 'Fox', 'Bear', 'Deer', 'Dove',
      'Swan', 'Cloud', 'Moon', 'Star', 'Wave', 'Breeze', 'Leaf', 'Lotus',
      'Butterfly', 'Dolphin', 'Seal', 'Otter', 'Sloth', 'Cat', 'Penguin'
    ];
    const hash = uid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const adjIndex = hash % adjectives.length;
    const animalIndex = (hash * 7) % animals.length;
    return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
  };

  const displayName = useMemo(() => {
    const directName =
      user?.displayName ||
      user?.providerData?.find((provider) => provider.displayName)?.displayName;
    if (directName) return directName;

    const emailPrefix = user?.email?.split('@')[0];
    if (emailPrefix) return emailPrefix;
    
    // For anonymous users, generate a fun random nickname
    if (isAnonymous && user?.uid) {
      return generateGuestNickname(user.uid);
    }
    
    return 'Friend';
  }, [user, isAnonymous]);

  const avatarInitial = useMemo(() => {
    if (user?.email) return user.email.charAt(0).toUpperCase();
    if (isAnonymous && user?.uid) {
      const nickname = generateGuestNickname(user.uid);
      return nickname.charAt(0);
    }
    return 'G';
  }, [user, isAnonymous]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getMemberSince = () => {
    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const getNextMilestone = () => {
    const longestStreak = stats?.longest_streak || 0;
    return milestones.find(m => longestStreak < m.days);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Header */}
        <AnimatedView delay={0} duration={500}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <LinearGradient
                colors={avatarGradient}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {avatarInitial}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>
            {displayName}
          </Text>
          <Text style={styles.memberSince}>
            Meditating since {getMemberSince()}
          </Text>
        </View>
        </AnimatedView>

        {/* Subscription Status */}
        <AnimatedView delay={50} duration={500}>
          {isPremium ? (
            <View style={styles.premiumBanner}>
              <LinearGradient
                colors={[theme.colors.primaryLight, theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.premiumBannerGradient}
              >
                <View style={styles.premiumBannerContent}>
                  <View style={styles.premiumBannerLeft}>
                    <Ionicons name="sparkles" size={24} color="#fff" />
                    <View>
                      <Text style={styles.premiumBannerTitle}>Premium Member</Text>
                      <Text style={styles.premiumBannerSubtitle}>Unlimited access to all content</Text>
                    </View>
                  </View>
                  <Ionicons name="checkmark-circle" size={28} color="#fff" />
                </View>
              </LinearGradient>
            </View>
          ) : (
            <AnimatedPressable 
              onPress={() => setShowPaywall(true)}
              style={styles.upgradeBanner}
            >
              <View style={styles.upgradeBannerContent}>
                <View style={styles.upgradeBannerLeft}>
                  <View style={styles.upgradeBannerIcon}>
                    <Ionicons name="leaf" size={24} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.upgradeBannerTitle}>Upgrade to Premium</Text>
                    <Text style={styles.upgradeBannerSubtitle}>Unlock all meditations & more</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.primary} />
              </View>
            </AnimatedPressable>
          )}
        </AnimatedView>

        {/* Your Sanctuary Card */}
        <AnimatedView delay={100} duration={500}>
        <AnimatedPressable 
          onPress={() => router.push('/stats')}
          style={styles.sanctuaryCard}
        >
          <Text style={styles.sanctuaryTitle}>Your Sanctuary</Text>
          <View style={styles.sanctuaryDivider} />
          
            {loading ? (
              <View style={styles.sanctuaryStats}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.sanctuaryStat}>
                    <Skeleton width={28} height={28} borderRadius={14} style={{ marginBottom: 8 }} />
                    <Skeleton width={50} height={22} style={{ marginBottom: 4 }} />
                    <Skeleton width={60} height={12} />
                  </View>
                ))}
              </View>
            ) : (
          <View style={styles.sanctuaryStats}>
            <View style={styles.sanctuaryStat}>
                  <View style={[styles.sanctuaryIconContainer, { backgroundColor: `${theme.colors.secondary}20` }]}>
                    <Ionicons name="flame-outline" size={24} color={theme.colors.secondary} />
                  </View>
              <View style={styles.sanctuaryStatInfo}>
                <Text style={styles.sanctuaryStatValue}>{stats?.total_sessions || 0}</Text>
                <Text style={styles.sanctuaryStatLabel}>sessions</Text>
              </View>
            </View>
            
            <View style={styles.sanctuaryStat}>
                  <View style={[styles.sanctuaryIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                  </View>
              <View style={styles.sanctuaryStatInfo}>
                <Text style={styles.sanctuaryStatValue}>
                  {formatTime(stats?.total_minutes || 0)}
                </Text>
                <Text style={styles.sanctuaryStatLabel}>mindful</Text>
              </View>
            </View>
            
            <View style={styles.sanctuaryStat}>
                  <View style={[styles.sanctuaryIconContainer, { backgroundColor: `${theme.colors.accent}20` }]}>
                    <Ionicons name="trending-up-outline" size={24} color={theme.colors.accent} />
                  </View>
              <View style={styles.sanctuaryStatInfo}>
                <Text style={styles.sanctuaryStatValue}>{stats?.current_streak || 0}</Text>
                <Text style={styles.sanctuaryStatLabel}>day streak</Text>
              </View>
            </View>
          </View>
            )}
        </AnimatedPressable>
        </AnimatedView>

        {/* Milestones */}
        <View style={styles.section}>
          <AnimatedView delay={200} duration={500}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          </AnimatedView>
          
          <View style={styles.milestonesGrid}>
            {milestones.map((milestone, index) => {
              const isAchieved = (stats?.longest_streak || 0) >= milestone.days;
              return (
                <AnimatedView 
                  key={milestone.id}
                  delay={250 + index * 50} 
                  duration={400}
                  style={styles.milestoneCardWrapper}
                >
                  <View 
                  style={[
                    styles.milestoneCard,
                    isAchieved && styles.milestoneCardAchieved
                  ]}
                >
                    <View style={[
                      styles.milestoneIconContainer,
                      { backgroundColor: isAchieved ? `${milestone.color}20` : theme.colors.gray[100] }
                  ]}>
                      <Ionicons 
                        name={isAchieved ? milestone.icon : 'lock-closed-outline'} 
                        size={28} 
                        color={isAchieved ? milestone.color : theme.colors.textMuted} 
                      />
                    </View>
                  <Text style={[
                    styles.milestoneLabel,
                    isAchieved && styles.milestoneLabelAchieved
                  ]}>
                    {milestone.label}
                  </Text>
                  {isAchieved && (
                      <Text style={[styles.milestoneDescription, { color: milestone.color }]}>
                      {milestone.description}
                    </Text>
                  )}
                </View>
                </AnimatedView>
              );
            })}
          </View>
          
          {getNextMilestone() && (
            <AnimatedView delay={500} duration={400}>
            <View style={styles.nextMilestone}>
                <Ionicons name="flag-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.nextMilestoneText}>
                {getNextMilestone()!.days - (stats?.longest_streak || 0)} days until {getNextMilestone()!.label.toLowerCase()}
              </Text>
            </View>
            </AnimatedView>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <AnimatedView delay={650} duration={400}>
            <Text style={styles.sectionLabel}>ACTIONS</Text>
            <View style={styles.actionsCard}>
              <AnimatedPressable 
                onPress={() => router.push('/stats')}
                style={styles.actionItem}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="stats-chart-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.actionLabel}>Statistics</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </AnimatedPressable>
              
              <View style={styles.actionDivider} />
              
              <AnimatedPressable 
                onPress={() => router.push('/downloads')}
                style={styles.actionItem}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="cloud-download-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.actionLabel}>Downloads</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </AnimatedPressable>
              
              <View style={styles.actionDivider} />
              
              <AnimatedPressable 
                onPress={() => router.push('/settings')}
                style={styles.actionItem}
              >
                <View style={styles.actionLeft}>
                  <Ionicons name="settings-outline" size={20} color={theme.colors.text} />
                  <Text style={styles.actionLabel}>Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </AnimatedPressable>
            </View>
          </AnimatedView>
        </View>

        {/* Sign In / Link Account (for anonymous) or Logout (for authenticated) */}
        <AnimatedView delay={700} duration={400}>
          {isAnonymous ? (
            <AnimatedPressable 
              style={styles.signInButton} 
              onPress={() => router.push(isPremium ? '/login?mode=link' : '/login')}
            >
              <Ionicons 
                name={isPremium ? "link-outline" : "log-in-outline"} 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={styles.signInText}>
                {isPremium ? "Link Account" : "Sign In"}
              </Text>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable style={styles.logoutButton} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={styles.logoutText}>Log Out</Text>
            </AnimatedPressable>
          )}
        </AnimatedView>

        {/* Footer */}
        <AnimatedView delay={750} duration={400}>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Calmdemy v1.0.2</Text>
            <Text style={styles.footerSubtext}>Made with love for your peace</Text>
        </View>
        </AnimatedView>
      </ScrollView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  avatarContainer: {
    marginBottom: theme.spacing.md,
  },
  avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.md,
  },
  avatarText: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 40,
    color: 'white',
  },
  userName: {
    fontFamily: theme.fonts.display.semiBold,
      fontSize: 26,
    color: theme.colors.text,
    marginBottom: 4,
  },
  memberSince: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 14,
    color: theme.colors.textLight,
  },
  sanctuaryCard: {
    marginHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    ...theme.shadows.sm,
  },
  sanctuaryTitle: {
    fontFamily: theme.fonts.display.semiBold,
    fontSize: 18,
    color: theme.colors.text,
    textAlign: 'center',
  },
  sanctuaryDivider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginVertical: theme.spacing.lg,
  },
  sanctuaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sanctuaryStat: {
    alignItems: 'center',
  },
    sanctuaryIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
  },
  sanctuaryStatInfo: {
    alignItems: 'center',
  },
  sanctuaryStatValue: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 24,
    color: theme.colors.text,
  },
  sanctuaryStatLabel: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
      marginHorizontal: -theme.spacing.xs,
    },
    milestoneCardWrapper: {
      width: '50%',
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
  },
  milestoneCard: {
    backgroundColor: theme.colors.gray[100],
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
    alignItems: 'center',
  },
  milestoneCardAchieved: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
    milestoneIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.sm,
  },
  milestoneLabel: {
      fontFamily: theme.fonts.ui.semiBold,
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  milestoneLabelAchieved: {
    color: theme.colors.text,
  },
  milestoneDescription: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 12,
    marginTop: 4,
  },
  nextMilestone: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
      backgroundColor: isDark ? `${theme.colors.primary}30` : `${theme.colors.primary}10`,
    borderRadius: theme.borderRadius.lg,
      flexDirection: 'row',
    alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
  },
  nextMilestoneText: {
    fontFamily: theme.fonts.ui.medium,
    fontSize: 14,
    color: theme.colors.primary,
  },
  sectionLabel: {
    fontFamily: theme.fonts.ui.medium,
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.5,
  },
  actionsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.sm,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionLabel: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 16,
    color: theme.colors.text,
  },
  actionDivider: {
    height: 1,
    backgroundColor: theme.colors.gray[200],
    marginLeft: theme.spacing.lg + 20 + theme.spacing.md,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
      borderWidth: 1.5,
    borderColor: theme.colors.error,
      gap: theme.spacing.sm,
  },
  logoutText: {
      fontFamily: theme.fonts.ui.semiBold,
    fontSize: 15,
    color: theme.colors.error,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  signInText: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 15,
    color: theme.colors.primary,
  },
  footer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  footerText: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  footerSubtext: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  // Premium/Upgrade banner styles
  premiumBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    overflow: 'hidden',
  },
  premiumBannerGradient: {
    padding: theme.spacing.lg,
  },
  premiumBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  premiumBannerTitle: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 16,
    color: '#fff',
  },
  premiumBannerSubtitle: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  upgradeBanner: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    ...theme.shadows.sm,
  },
  upgradeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  upgradeBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeBannerTitle: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 16,
    color: theme.colors.text,
  },
  upgradeBannerSubtitle: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 13,
    color: theme.colors.textLight,
    marginTop: 2,
  },
});

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileScreen />
    </ProtectedRoute>
  );
}
