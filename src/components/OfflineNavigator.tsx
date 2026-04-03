import React, { useEffect, useRef } from 'react';
import { useRouter, usePathname, useRootNavigationState } from 'expo-router';
import { useNetwork } from '../contexts/NetworkContext';

interface OfflineNavigatorProps {
  children: React.ReactNode;
}

/**
 * ============================================================
 * OfflineNavigator.tsx — Network State Navigator (Higher-Order Component)
 * ============================================================
 *
 * Architectural Role:
 *   A Higher-Order Component that monitors network connectivity
 *   and automatically routes users to the offline-capable Downloads page
 *   when connection is lost. When connectivity is restored, it returns
 *   the user to their previous location. This implements graceful
 *   degradation for offline scenarios.
 *
 * Design Patterns:
 *   - Observer Pattern: Watches NetworkContext.isOffline and reacts
 *     to state changes by re-routing.
 *   - Stateful Navigation Memory: Uses refs (previousPathRef, hasNavigatedToOffline)
 *     to remember where the user was before going offline, ensuring they
 *     can return to that spot when connectivity returns.
 *   - Graceful Degradation: The /downloads page works fully offline
 *     with cached content, while other screens require connectivity.
 *
 * Key Dependencies:
 *   - useNetwork() from NetworkContext (isOffline, isLoading state)
 *   - expo-router (useRouter, usePathname)
 * ============================================================
 */

export function OfflineNavigator({ children }: OfflineNavigatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const { isOffline, isLoading } = useNetwork();
  const previousPathRef = useRef<string | null>(null);
  const isOnDownloadsPage = pathname === '/downloads' || pathname.startsWith('/downloads/');
  const hasNavigatedToOffline = useRef(false);

  // --- Navigation Ready Check ---
  // Like ProtectedRoute, we must wait for expo-router to initialize
  // before calling router.replace().
  const navigationReady = rootNavigationState?.key != null;

  useEffect(() => {
    // --- Guard Clauses ---
    // Skip navigation logic until the network state is determined
    // and the router is ready. isLoading is true on app boot while
    // we probe for connectivity.
    if (isLoading || !navigationReady) return;

    // --- Offline Detection ---
    // User has lost connectivity and is not already on the Downloads page.
    // Store the current route so we can return to it when online, then
    // navigate to /downloads where they can access cached content.
    if (isOffline && !isOnDownloadsPage) {
      previousPathRef.current = pathname;
      hasNavigatedToOffline.current = true;
      router.replace('/downloads');
    }
    // --- Connection Restored ---
    // We regained connectivity, we previously navigated due to offline,
    // and the user is still on the Downloads page. Return them to where
    // they were before the outage. If no previous route was stored,
    // default to the home tab.
    else if (!isOffline && hasNavigatedToOffline.current && isOnDownloadsPage) {
      hasNavigatedToOffline.current = false;
      if (previousPathRef.current && previousPathRef.current !== '/downloads') {
        router.replace(previousPathRef.current as any);
      } else {
        router.replace('/(tabs)/home');
      }
      previousPathRef.current = null;
    }
  }, [isOffline, isLoading, isOnDownloadsPage, pathname, navigationReady]);

  return <>{children}</>;
}
