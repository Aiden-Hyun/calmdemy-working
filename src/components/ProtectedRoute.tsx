import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, useRootNavigationState } from 'expo-router';
import { LoadingScreen } from './LoadingScreen';

/**
 * ============================================================
 * ProtectedRoute.tsx — Authentication Guard (Higher-Order Component)
 * ============================================================
 *
 * Architectural Role:
 *   A Higher-Order Component that wraps protected screens and gates
 *   access to authenticated users. It sits at the route level and
 *   implements the "Gatekeeper" pattern — a single checkpoint that
 *   prevents unauthenticated users from accessing private screens.
 *
 * Design Patterns:
 *   - Gatekeeper Pattern: Checks auth status and redirects to login
 *     if the user is not authenticated. This is the first line of
 *     defense in the feature-based architecture.
 *   - Navigation State Guard: Waits for expo-router's navigation
 *     system to be ready (rootNavigationState.key != null) before
 *     attempting to navigate. This prevents race conditions where
 *     navigation is called before the router is initialized.
 *
 * Key Dependencies:
 *   - useAuth() from AuthContext (authentication state)
 *   - expo-router (client-side routing)
 *   - LoadingScreen (UI shown during auth check)
 * ============================================================
 */

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  // --- Navigation Ready Check ---
  // expo-router initializes asynchronously. The rootNavigationState.key
  // is only set once the navigation tree is ready. We must wait for this
  // before calling router.replace(), otherwise the navigation call is
  // silently dropped and causes subtle bugs.
  const navigationReady = rootNavigationState?.key != null;

  useEffect(() => {
    // --- Redirect Unauthenticated Users ---
    // Three conditions must align before redirecting to login:
    // 1. Auth check is complete (!loading)
    // 2. No authenticated user (!user)
    // 3. Router is ready (navigationReady)
    // This prevents race conditions and ensures smooth transitions.
    if (!loading && !user && navigationReady) {
      router.replace('/login');
    }
  }, [loading, user, router, navigationReady]);

  // --- Loading State ---
  // While Firebase Auth checks the user's session, show the loading screen.
  if (loading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // --- Unauthenticated State ---
  // If auth is complete and there's no user, render null. The useEffect
  // will have already queued the navigation to /login, so this brief moment
  // of null is part of the expected flow.
  if (!user) {
    return null;
  }

  // --- Authenticated State ---
  // User is logged in. Render the protected content.
  return <>{children}</>;
}
