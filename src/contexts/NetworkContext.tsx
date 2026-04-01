import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface NetworkContextType {
  isConnected: boolean;
  isOffline: boolean;
  isLoading: boolean;
  refresh: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

interface NetworkProviderProps {
  children: ReactNode;
}

// Dynamic import to handle cases where native module isn't available
let Network: typeof import('expo-network') | null = null;
let networkModuleAvailable = false;

// Try to load expo-network, but don't crash if it's not available
try {
  Network = require('expo-network');
  networkModuleAvailable = true;
} catch (error) {
  console.warn('expo-network native module not available. Network detection disabled.');
  networkModuleAvailable = false;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  // Default to connected if we can't check network status
  const [isConnected, setIsConnected] = useState(true);
  const [isLoading, setIsLoading] = useState(networkModuleAvailable);

  // Check network state
  const checkNetworkState = useCallback(async (): Promise<boolean> => {
    if (!networkModuleAvailable || !Network) {
      // If module not available, assume connected
      return true;
    }
    
    try {
      const networkState = await Network.getNetworkStateAsync();
      const connected = networkState.isConnected ?? true;
      return connected;
    } catch (error) {
      // On error, assume connected to not block the user
      console.warn('Error checking network state:', error);
      return true;
    }
  }, []);

  useEffect(() => {
    if (!networkModuleAvailable) {
      // Module not available, assume always connected
      setIsConnected(true);
      setIsLoading(false);
      return;
    }

    // Get initial state
    checkNetworkState().then((connected) => {
      setIsConnected(connected);
      setIsLoading(false);
    });

    // Poll for network changes every 3 seconds
    const interval = setInterval(async () => {
      const connected = await checkNetworkState();
      setIsConnected(connected);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [checkNetworkState]);

  // Manual refresh function that returns the current connection state
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

export function useNetwork(): NetworkContextType {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
