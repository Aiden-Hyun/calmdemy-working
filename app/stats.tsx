import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { StatsCard } from '../src/components/StatsCard';
import { AnimatedView } from '../src/components/AnimatedView';
import { AnimatedPressable } from '../src/components/AnimatedPressable';
import { Skeleton } from '../src/components/Skeleton';
import { useStats } from '../src/hooks/useStats';
import { useTheme } from '../src/contexts/ThemeContext';
import { Theme } from '../src/theme';

const { width } = Dimensions.get('window');

function StatsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { stats, loading } = useStats();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const [chartData, setChartData] = useState<any>(null);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = current week, -1 = last week, etc.
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.
  const [yearOffset, setYearOffset] = useState(0);   // 0 = current year period, -1 = previous, etc.
  const [canGoBack, setCanGoBack] = useState(true);  // Whether there's data to go back to

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  // Reset offsets when switching time ranges
  useEffect(() => {
    setWeekOffset(0);
    setMonthOffset(0);
    setYearOffset(0);
  }, [timeRange]);

  useEffect(() => {
    loadChartData();
  }, [stats, timeRange, weekOffset, monthOffset, yearOffset]);

  const loadChartData = () => {
    if (!stats) return;
    
    let labels: string[];
    let data: number[];
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();
    
    if (timeRange === 'week') {
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      // Find the Monday of the current week (or offset week)
      const today = new Date(now);
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Days since Monday
      
      const monday = new Date(today);
      monday.setDate(today.getDate() - daysFromMonday + (weekOffset * 7));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      // Get data from monthly_minutes for Mon-Sun
      const monthlyData = stats.monthly_minutes || Array(30).fill(0);
      data = [];
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(monday);
        dayDate.setDate(monday.getDate() + i);
        const daysAgo = Math.floor((now.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo >= 0 && daysAgo < 30) {
          const index = 29 - daysAgo;
          data.push(monthlyData[index] || 0);
        } else {
          data.push(0);
        }
      }
      
      // Check if we can go back (previous week has any data within 30-day window)
      const prevMonday = new Date(monday);
      prevMonday.setDate(monday.getDate() - 7);
      const prevMondayDaysAgo = Math.floor((now.getTime() - prevMonday.getTime()) / (1000 * 60 * 60 * 24));
      setCanGoBack(prevMondayDaysAgo < 30);
      
      // Format date range label
      const startMonth = monthNames[monday.getMonth()];
      const endMonth = monthNames[sunday.getMonth()];
      const startDay = monday.getDate();
      const endDay = sunday.getDate();
      const startYear = monday.getFullYear();
      const endYear = sunday.getFullYear();
      
      if (startYear !== endYear) {
        setDateRangeLabel(`${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`);
      } else if (startMonth === endMonth) {
        setDateRangeLabel(`${startMonth} ${startDay}-${endDay}, ${endYear}`);
      } else {
        setDateRangeLabel(`${startMonth} ${startDay} - ${endMonth} ${endDay}, ${endYear}`);
      }
    } else if (timeRange === 'month') {
      // Show calendar month with week labels (W1-W5)
      const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();
      const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      
      // Create week labels for the month
      labels = ['W1', 'W2', 'W3', 'W4', daysInMonth > 28 ? 'W5' : ''].filter(Boolean);
      
      // Get sessions for this specific month from monthly_minutes
      // monthly_minutes: index 0 = 29 days ago, index 29 = today
      const monthlyData = stats.monthly_minutes || Array(30).fill(0);
      
      // Calculate how many days ago the target month started/ended
      const monthStart = new Date(targetYear, targetMonth, 1);
      const monthEnd = new Date(targetYear, targetMonth + 1, 0);
      const daysAgoStart = Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
      const daysAgoEnd = Math.floor((now.getTime() - monthEnd.getTime()) / (1000 * 60 * 60 * 24));
      
      // Aggregate into weeks (only if data is within our 30-day window)
      const weekData: number[] = [];
      for (let week = 0; week < (daysInMonth > 28 ? 5 : 4); week++) {
        let weekTotal = 0;
        for (let day = 0; day < 7 && (week * 7 + day) < daysInMonth; day++) {
          const dayOfMonth = week * 7 + day + 1;
          const dayDate = new Date(targetYear, targetMonth, dayOfMonth);
          const daysAgo = Math.floor((now.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysAgo >= 0 && daysAgo < 30) {
            const index = 29 - daysAgo;
            weekTotal += monthlyData[index] || 0;
          }
        }
        weekData.push(weekTotal);
      }
      data = weekData;
      
      // Check if we can go back (previous month has any data within 30-day window)
      const prevMonthEnd = new Date(targetYear, targetMonth, 0);
      const prevMonthDaysAgo = Math.floor((now.getTime() - prevMonthEnd.getTime()) / (1000 * 60 * 60 * 24));
      setCanGoBack(prevMonthDaysAgo < 30);
      
      setDateRangeLabel(`${fullMonthNames[targetMonth]} ${targetYear}`);
    } else {
      // Year view - show single calendar year (Jan-Dec) with navigation
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const targetYear = currentYear + yearOffset;
      
      // Labels: Jan through Dec
      labels = monthNames; // ['Jan', 'Feb', ..., 'Dec']
      
      // Get data for each month of the target year
      const yearlyData = stats.yearly_minutes || Array(12).fill(0);
      data = Array(12).fill(0);
      
      // yearly_minutes: index 0 = 11 months ago, index 11 = current month
      // Map each month of target year to the correct index
      for (let month = 0; month < 12; month++) {
        const monthDate = new Date(targetYear, month, 1);
        const monthsDiff = (currentYear - targetYear) * 12 + (currentMonth - month);
        
        if (monthsDiff >= 0 && monthsDiff < 12) {
          const index = 11 - monthsDiff;
          data[month] = yearlyData[index] || 0;
        }
        // Future months or months > 12 months ago stay at 0
      }
      
      // Check if we can go back (previous year has any data within 12-month window)
      const prevYearLastMonth = new Date(targetYear - 1, 11, 1);
      const prevYearMonthsDiff = (currentYear - (targetYear - 1)) * 12 + (currentMonth - 11);
      setCanGoBack(prevYearMonthsDiff < 12);
      
      setDateRangeLabel(`${targetYear}`);
    }
    
    setChartData({
      labels,
      datasets: [{
        data,
      }],
    });
  };

  // Calculate smart segments to avoid duplicate Y-axis labels
  const getSmartSegments = (maxVal: number): number => {
    if (maxVal <= 0) return 2;
    if (maxVal <= 2) return Math.max(maxVal, 1); // 2 segments for max 2 (0, 1, 2)
    if (maxVal <= 5) return maxVal; // match max for small values
    if (maxVal <= 10) return 5;     // 5 segments (0, 2, 4, 6, 8, 10)
    return 4;                        // 4 segments for larger values
  };

  const chartConfig = useMemo(() => ({
    backgroundColor: 'transparent',
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 0,
    barPercentage: 0.6,
    color: (opacity = 1) => isDark 
      ? `rgba(157, 176, 148, ${opacity})` 
      : `rgba(139, 159, 130, ${opacity})`,
    labelColor: () => theme.colors.textMuted,
    fillShadowGradientFrom: theme.colors.primary,
    fillShadowGradientTo: theme.colors.primary,
    fillShadowGradientOpacity: 1,
    propsForBackgroundLines: {
      stroke: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      strokeWidth: 1,
    },
  }), [theme, isDark]);

  // Loading state with skeletons
  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </AnimatedPressable>
            <Text style={styles.title}>Statistics</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Summary Cards Skeleton */}
          <View style={styles.summaryGrid}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonCard}>
                <Skeleton width={40} height={40} borderRadius={20} style={{ marginBottom: 12 }} />
                <Skeleton width={50} height={28} style={{ marginBottom: 6 }} />
                <Skeleton width={70} height={14} />
              </View>
            ))}
          </View>

          {/* Chart Skeleton */}
          <View style={styles.chartContainer}>
            <Skeleton width={140} height={18} style={{ marginBottom: 16 }} />
            <Skeleton height={220} borderRadius={theme.borderRadius.lg} />
        </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <AnimatedView delay={0} duration={400}>
        <View style={styles.header}>
            <AnimatedPressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </AnimatedPressable>
          <Text style={styles.title}>Statistics</Text>
            <View style={{ width: 44 }} />
        </View>
        </AnimatedView>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <AnimatedView delay={50} duration={400} style={styles.statsCardWrapper}>
          <StatsCard
            icon="time"
            label="Total Time"
            value={Math.floor(stats.total_minutes / 60)}
            unit="hours"
            color={theme.colors.primary}
          />
          </AnimatedView>
          <AnimatedView delay={100} duration={400} style={styles.statsCardWrapper}>
          <StatsCard
            icon="calendar"
            label="Total Sessions"
            value={stats.total_sessions}
            color={theme.colors.secondary}
          />
          </AnimatedView>
          <AnimatedView delay={150} duration={400} style={styles.statsCardWrapper}>
          <StatsCard
            icon="flame"
            label="Current Streak"
            value={stats.current_streak}
            unit="days"
            color={theme.colors.error}
          />
          </AnimatedView>
          <AnimatedView delay={200} duration={400} style={styles.statsCardWrapper}>
          <StatsCard
            icon="trophy"
            label="Longest Streak"
            value={stats.longest_streak}
            unit="days"
            color={theme.colors.warning}
          />
          </AnimatedView>
        </View>

        {/* Chart */}
        <AnimatedView delay={250} duration={400}>
        {chartData && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Minutes Meditated</Text>
            {dateRangeLabel ? (
              <View style={styles.dateRangeLabelContainer}>
                <AnimatedPressable 
                  onPress={() => {
                    if (!canGoBack) return;
                    if (timeRange === 'week') setWeekOffset(prev => prev - 1);
                    else if (timeRange === 'month') setMonthOffset(prev => prev - 1);
                    else if (timeRange === 'year') setYearOffset(prev => prev - 1);
                  }} 
                  style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
                >
                  <Ionicons name="chevron-back" size={18} color={canGoBack ? theme.colors.text : theme.colors.textMuted} />
                </AnimatedPressable>
                <Text style={styles.chartSubtitle}>{dateRangeLabel}</Text>
                <AnimatedPressable 
                  onPress={() => {
                    const currentOffset = timeRange === 'week' ? weekOffset : timeRange === 'month' ? monthOffset : yearOffset;
                    if (currentOffset >= 0) return;
                    if (timeRange === 'week') setWeekOffset(prev => prev + 1);
                    else if (timeRange === 'month') setMonthOffset(prev => prev + 1);
                    else if (timeRange === 'year') setYearOffset(prev => prev + 1);
                  }} 
                  style={[styles.navButton, (timeRange === 'week' ? weekOffset >= 0 : timeRange === 'month' ? monthOffset >= 0 : yearOffset >= 0) && styles.navButtonDisabled]}
                >
                  <Ionicons 
                    name="chevron-forward" 
                    size={18} 
                    color={(timeRange === 'week' ? weekOffset >= 0 : timeRange === 'month' ? monthOffset >= 0 : yearOffset >= 0) ? theme.colors.textMuted : theme.colors.text} 
                  />
                </AnimatedPressable>
              </View>
            ) : null}
            
            {/* Time Range Toggle */}
            <View style={styles.toggleContainer}>
              <AnimatedPressable
                onPress={() => setTimeRange('week')}
                style={[styles.toggleButton, timeRange === 'week' && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, timeRange === 'week' && styles.toggleTextActive]}>
                  Week
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => setTimeRange('month')}
                style={[styles.toggleButton, timeRange === 'month' && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, timeRange === 'month' && styles.toggleTextActive]}>
                  Month
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => setTimeRange('year')}
                style={[styles.toggleButton, timeRange === 'year' && styles.toggleButtonActive]}
              >
                <Text style={[styles.toggleText, timeRange === 'year' && styles.toggleTextActive]}>
                  Year
                </Text>
              </AnimatedPressable>
            </View>
            
            <View style={styles.chartCard}>
              <BarChart
                data={chartData}
                width={width - 72}
                height={200}
                chartConfig={chartConfig}
                style={styles.chart}
                withInnerLines={true}
                showValuesOnTopOfBars={false}
                fromZero={true}
                segments={getSmartSegments(Math.max(...(chartData.datasets[0].data || [0])))}
                yAxisSuffix=""
                yAxisLabel=""
              />
            </View>
          </View>
        )}
        </AnimatedView>

        {/* Insights */}
        <View style={styles.insightsSection}>
          <AnimatedView delay={350} duration={400}>
          <Text style={styles.sectionTitle}>Insights</Text>
          </AnimatedView>
          
          {[
            { 
              icon: 'sunny-outline' as const, 
              title: 'Favorite Time', 
              value: stats.favorite_time_of_day || 'Not enough data',
              color: theme.colors.secondary 
            },
            { 
              icon: 'trending-up-outline' as const, 
              title: 'Average Session', 
              value: stats.total_sessions > 0 
                  ? `${Math.round(stats.total_minutes / stats.total_sessions)} minutes`
                : 'No sessions yet',
              color: theme.colors.primary 
            },
            { 
              icon: 'happy-outline' as const, 
              title: 'Mood Improvement', 
              value: stats.mood_improvement > 0 
                ? `+${stats.mood_improvement.toFixed(1)} points`
                : 'Track your mood to see',
              color: theme.colors.success 
            },
          ].map((insight, index) => (
            <AnimatedView key={insight.title} delay={400 + index * 50} duration={400}>
          <View style={styles.insightCard}>
                <View style={[styles.insightIcon, { backgroundColor: `${insight.color}15` }]}>
                  <Ionicons name={insight.icon} size={24} color={insight.color} />
            </View>
            <View style={styles.insightContent}>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightValue}>{insight.value}</Text>
            </View>
          </View>
            </AnimatedView>
          ))}
        </View>

        {/* Milestones */}
        <View style={styles.milestonesSection}>
          <AnimatedView delay={550} duration={400}>
          <Text style={styles.sectionTitle}>Milestones</Text>
          </AnimatedView>
          
          <View style={styles.milestonesList}>
            {[1, 3, 7, 14, 21, 30, 50, 100].map((days, index) => {
              const isAchieved = stats.longest_streak >= days;
              return (
                <AnimatedView 
                  key={days} 
                  delay={600 + index * 30} 
                  duration={400}
                  style={styles.milestoneWrapper}
                >
              <View 
                style={[
                  styles.milestone,
                      isAchieved && styles.milestoneAchieved
                ]}
              >
                    {isAchieved && (
                      <Ionicons 
                        name="checkmark-circle" 
                        size={16} 
                        color="white" 
                        style={styles.milestoneCheck}
                      />
                    )}
                <Text style={[
                  styles.milestoneText,
                      isAchieved && styles.milestoneTextAchieved
                ]}>
                  {days}
                </Text>
                <Text style={[
                  styles.milestoneLabel,
                      isAchieved && styles.milestoneLabelAchieved
                ]}>
                  days
                </Text>
              </View>
                </AnimatedView>
              );
            })}
          </View>
        </View>
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  backButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
      ...theme.shadows.sm,
  },
  title: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 22,
    color: theme.colors.text,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
      marginHorizontal: -theme.spacing.xs,
    },
    statsCardWrapper: {
      width: '50%',
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    skeletonCard: {
      width: '50%',
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
  },
  chartContainer: {
    marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  chartTitle: {
      fontFamily: theme.fonts.ui.semiBold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  chartSubtitle: {
    fontFamily: theme.fonts.ui.regular,
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  dateRangeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  navButton: {
    padding: theme.spacing.xs,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
    padding: 4,
    marginBottom: theme.spacing.md,
    alignSelf: 'flex-start',
    ...theme.shadows.sm,
  },
  toggleButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontFamily: theme.fonts.ui.semiBold,
    fontSize: 13,
    color: theme.colors.textLight,
  },
  toggleTextActive: {
    color: 'white',
  },
    chartCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.sm,
      ...theme.shadows.sm,
      overflow: 'hidden',
    },
  chart: {
    marginLeft: -16,
    borderRadius: theme.borderRadius.lg,
  },
  insightsSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 18,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  insightIcon: {
      width: 52,
      height: 52,
      borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
      fontFamily: theme.fonts.ui.regular,
    fontSize: 14,
    color: theme.colors.textLight,
      marginBottom: 4,
  },
  insightValue: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
    color: theme.colors.text,
  },
  milestonesSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  milestonesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
      marginHorizontal: -theme.spacing.xs,
    },
    milestoneWrapper: {
      width: '25%',
      paddingHorizontal: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
  },
  milestone: {
    aspectRatio: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
      ...theme.shadows.sm,
  },
  milestoneAchieved: {
    backgroundColor: theme.colors.primary,
  },
    milestoneCheck: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
  milestoneText: {
      fontFamily: theme.fonts.display.bold,
      fontSize: 22,
    color: theme.colors.textLight,
  },
  milestoneTextAchieved: {
    color: 'white',
  },
  milestoneLabel: {
      fontFamily: theme.fonts.ui.regular,
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 2,
  },
  milestoneLabelAchieved: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default function Stats() {
  return (
    <ProtectedRoute>
      <StatsScreen />
    </ProtectedRoute>
  );
}
