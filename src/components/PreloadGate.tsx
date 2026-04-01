import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContentPreload } from '../contexts/ContentPreloadContext';
import { LoadingScreen } from './LoadingScreen';

interface PreloadGateProps {
  children: React.ReactNode;
}

export function PreloadGate({ children }: PreloadGateProps) {
  const { user, loading: authLoading, isAnonymous } = useAuth();
  const { isPreloading, isPreloaded, preloadAll } = useContentPreload();

  useEffect(() => {
    // Only preload after authentication is complete and we have a user
    if (!authLoading && user && !isPreloaded && !isPreloading) {
      preloadAll(user.uid, isAnonymous);
    }
  }, [authLoading, user, isPreloaded, isPreloading, preloadAll, isAnonymous]);

  // Still loading auth
  if (authLoading) {
    return <LoadingScreen message="Checking authentication..." />;
  }

  // User not logged in - don't block, let ProtectedRoute handle redirect
  if (!user) {
    return <>{children}</>;
  }

  // Preloading content
  if (isPreloading || !isPreloaded) {
    return <LoadingScreen message="Loading your content..." />;
  }

  // Content loaded, show the app
  return <>{children}</>;
}
