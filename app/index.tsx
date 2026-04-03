import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';

const ONBOARDING_KEY = '@calmdemy_onboarding';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((value) => {
      setOnboardingDone(value === 'true');
    });
  }, []);

  if (authLoading || onboardingDone === null) {
    return null;
  }

  if (!onboardingDone) {
    return <Redirect href={"/onboarding" as any} />;
  }

  return user ? <Redirect href="/(tabs)/home" /> : <Redirect href="/login" />;
}
