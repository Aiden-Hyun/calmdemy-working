import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContentPreload } from '../contexts/ContentPreloadContext';
import { LoadingScreen } from './LoadingScreen';

/**
 * ============================================================
 * PreloadGate.tsx — Content Preload Guardian (Higher-Order Component)
 * ============================================================
 *
 * Architectural Role:
 *   Sits downstream of ProtectedRoute and orchestrates the Progressive
 *   Loading pattern. Once a user is authenticated, this component
 *   initiates a bulk preload of all content (meditations, courses, etc.)
 *   into local caches and the React Query store. This ensures the app's
 *   main views have instant access to data without individual fetch requests.
 *
 * Design Patterns:
 *   - Progressive Loading: Auth happens first (ProtectedRoute), then
 *     content preload (this component). Each stage blocks until complete.
 *   - Gatekeeper: Only allows authenticated users past this gate.
 *   - Factory/Initialization: preloadAll() is called once per session,
 *     triggering a cascade of parallel queries via React Query.
 *
 * Key Dependencies:
 *   - useAuth() (authentication state)
 *   - useContentPreload() (preload orchestration)
 *   - ContentPreloadContext (manages isPreloading, isPreloaded flags)
 * ============================================================
 */

interface PreloadGateProps {
  children: React.ReactNode;
}

export function PreloadGate({ children }: PreloadGateProps) {
  const { user, loading: authLoading, isAnonymous } = useAuth();
  const { isPreloading, isPreloaded, preloadAll } = useContentPreload();

  // --- Trigger Preload on Auth Completion ---
  useEffect(() => {
    // Preload only once, after auth is complete and user exists.
    // The guard (!isPreloaded && !isPreloading) ensures we don't
    // double-trigger the preload if dependencies change.
    if (!authLoading && user && !isPreloaded && !isPreloading) {
      preloadAll(user.uid, isAnonymous);
    }
  }, [authLoading, user, isPreloaded, isPreloading, preloadAll, isAnonymous]);

  // --- Phase 1: Auth Check ---
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // --- Phase 2: Unauthenticated User ---
  // If auth is complete but there's no user, render children anyway.
  // ProtectedRoute (parent wrapper) handles the redirect to login,
  // so we don't need to block here.
  if (!user) {
    return <>{children}</>;
  }

  // --- Phase 3: Content Preload ---
  // If we have a user and content is still loading, show the preload screen.
  if (isPreloading || !isPreloaded) {
    return <LoadingScreen message="Loading your content..." />;
  }

  // --- Phase 4: Ready ---
  // All content is cached and ready. Render the app.
  return <>{children}</>;
}
