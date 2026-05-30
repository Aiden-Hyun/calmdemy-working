/**
 * ============================================================
 * NetworkContext.tsx — Offline Detection & Fallback Provider
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Provider pattern to supply network
 *   connectivity state to the entire app. It uses expo-network
 *   to poll device connectivity and gracefully handles cases where
 *   the native module is unavailable (e.g., web build, testing).
 *
 * Design Patterns:
 *   - Provider Pattern: Exposes isConnected/isOffline via context
 *     and useNetwork() hook.
 *   - Offline Detection: Polling via setInterval checks network
 *     state every 3 seconds. Can be manually refreshed via refresh().
 *   - Graceful Degradation: If expo-network is unavailable, defaults
 *     to assuming connected (isConnected = true). This prevents app
 *     crashes on unsupported platforms.
 *   - Defensive Defaults: On network check error, assumes connected
 *     rather than blocking the user.
 *
 * Key Dependencies:
 *   - expo-network: Native platform APIs for network detection
 *   - AsyncStorage: Future persistence (optional)
 *
 * Consumed By:
 *   Root app shell. Screens read isOffline to show offline UI or
 *   disable sync operations. Can manually trigger refresh() before
 *   critical network requests.
 * ============================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

/**
 * Network context type.
 *
 * @prop isConnected - true if device has active internet connectivity
 * @prop isOffline - Inverse of isConnected (convenience)
 * @prop isLoading - true if initial network check is in progress
 * @prop refresh - Manual function to check network state immediately
 */
interface NetworkContextType {
  isConnected: boolean;
  isOffline: boolean;
  isLoading: boolean;
  refresh: () => Promise<boolean>;
}

// --- Context Definition ---
const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

// --- Graceful Module Loading ---
// Dynamic require with try-catch: expo-network is not available on web builds,
// testing environments, or if the native module hasn't been linked.
// If loading fails, we default to assuming the device is connected, which is
// the Graceful Degradation pattern — the app continues functioning on unsupported
// platforms, just without real-time network detection.
let Network: typeof import('expo-network') | null = null;
let networkModuleAvailable = false;

try {
  Network = require('expo-network');
  networkModuleAvailable = true;
} catch (error) {
  console.warn('expo-network native module not available. Network detection disabled.');
  networkModuleAvailable = false;
}

/**
 * Provider component for network connectivity detection.
 *
 * On mount, immediately checks network state (if module available) and
 * starts polling every 3 seconds. Consumers can call refresh() to get
 * an immediate up-to-date check (useful before critical operations).
 */
export function NetworkProvider({ children }: NetworkProviderProps) {
  // Default to connected (optimistic) if we can't check network status.
  // This prevents the app from falsely reporting offline.
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(networkModuleAvailable);

  /**
   * Internal helper to check network state via expo-network API.
   *
   * Returns true on error (Graceful Degradation) so that transient
   * network check failures don't block the user. Only if the module
   * is genuinely unavailable do we skip the check.
   */
  const checkNetworkState = useCallback(async (): Promise<boolean> => {
    if (!networkModuleAvailable || !Network) {
      // Module not available, assume connected
      return true;
    }

    try {
      const networkState = await Network.getNetworkStateAsync();
      const connected = networkState.isConnected ?? true;
      return connected;
    } catch (error) {
      // Defensive: if the check itself fails (e.g., permission denied),
      // assume connected rather than blocking the app with false offline state.
      console.warn('Error checking network state:', error);
      return true;
    }
  }, []);

  /**
   * Effect: Initialize network detection.
   *
   * On mount, immediately fetch the initial network state if the module is
   * available. Then start polling every 3 seconds to detect online/offline
   * transitions. Cleanup removes the interval on unmount.
   */
  useEffect(() => {
    if (!networkModuleAvailable) {
      // Module not available, assume always connected. Skip polling.
      setIsConnected(true);
      setIsLoading(false);
      return;
    }

    // --- Initial State Check ---
    checkNetworkState().then((connected) => {
      setIsConnected(connected);
      setIsLoading(false);
    });

    // --- Polling Strategy ---
    // Every 3 seconds, check for network state changes.
    // This detects when the user disables WiFi, moves out of range, etc.
    const interval = setInterval(async () => {
      const connected = await checkNetworkState();
      setIsConnected(connected);
    }, 3000);

    // Cleanup: remove interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [checkNetworkState]);

  /**
   * Manual network refresh.
   *
   * Call this before critical operations (e.g., syncing data to Firestore)
   * to get an immediate, up-to-date connectivity check without waiting for
   * the next poll interval.
   *
   * @returns true if connected, false if offline
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    const connected = await checkNetworkState();
    setIsConnected(connected);
    return connected;
  }, [checkNetworkState]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected,
        isOffline: !isConnected,
        isLoading,
        refresh,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

/**
 * Hook to access the network context.
 *
 * Throws if used outside NetworkProvider (guard clause).
 * Screens use this to conditionally show offline UI or disable sync operations.
 */
export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
