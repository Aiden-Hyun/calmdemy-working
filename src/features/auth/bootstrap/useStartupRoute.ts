/**
 * ============================================================
 * features/auth/bootstrap/useStartupRoute.ts — First-screen routing
 * ============================================================
 *
 * Decides where the app sends the user on launch: onboarding (first run),
 * home (authenticated), or login. Extracted from app/index.tsx in Phase 6c so
 * the route file is a thin splash + this hook.
 *
 * Keeps the imperative `router.replace` + `navigatedRef` guard from the
 * original: with a declarative <Redirect>, React can re-render the launch
 * screen while the auth/subscription providers settle, re-issuing navigation
 * and re-mounting the target (resetting its state mid-interaction). A single
 * guarded replace inside an effect sidesteps that — do not convert to <Redirect>.
 * ============================================================
 */

import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../core/auth/AuthContext';
import { ONBOARDING_KEY } from '../../../core/storage/keys';

export function useStartupRoute() {
  const { user, loading: authLoading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
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
}
