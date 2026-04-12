import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { lightColors } from '../src/theme';

const ONBOARDING_KEY = '@calmdemy_onboarding';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  // Guard: only fire a single navigation replace. With <Redirect>, React can
  // re-render this screen while auth/subscription providers settle, which in
  // turn re-issues the navigation and re-mounts the target screen — resetting
  // state (e.g. onboarding step) mid-interaction. An imperative replace inside
  // an effect + ref guard sidesteps that.
  const navigatedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingDone(value === 'true');
    });
  }, []);

  useEffect(() => {
    if (navigatedRef.current) return;
    if (authLoading || onboardingDone === null) return;

    navigatedRef.current = true;
    if (!onboardingDone) {
      router.replace('/onboarding' as any);
    } else if (user) {
      router.replace('/(tabs)/home');
    } else {
      router.replace('/login');
    }
  }, [authLoading, onboardingDone, user]);

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🌿</Text>
      <Text style={styles.title}>Calmdemy</Text>
      <ActivityIndicator size="small" color={lightColors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: lightColors.primary,
    letterSpacing: -0.5,
  },
  spinner: {
    marginTop: 24,
  },
});
