/**
 * ============================================================
 * ThemeContext.tsx — Dynamic Theme Provider (Strategy Pattern)
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Provider pattern to manage light/dark
 *   theme throughout the app. Supports three strategies: explicit light,
 *   explicit dark, or system (follows device settings). User preference
 *   is persisted to AsyncStorage for subsequent sessions.
 *
 * Design Patterns:
 *   - Provider Pattern: Exposes theme colors, typography, spacing, etc.
 *     via context and useTheme() hook.
 *   - Strategy Pattern: Three theme strategies (light, dark, system).
 *     Switch strategies by calling setThemeMode().
 *   - Observer Pattern: useColorScheme() watches device theme setting
 *     and triggers re-renders when system appearance changes.
 *   - Memoization: useMemo prevents context value identity churn,
 *     which would cause unnecessary re-renders in consuming components.
 *   - Persistence: AsyncStorage syncs user preference across app sessions.
 *   - Loading State: Waits for AsyncStorage load before rendering to
 *     prevent flash of wrong theme on startup.
 *
 * Key Dependencies:
 *   - react-native (useColorScheme)
 *   - AsyncStorage (persistence)
 *   - theme/index.ts (color and typography definitions)
 *
 * Consumed By:
 *   Every styled component/screen via useTheme() hook.
 * ============================================================
 */

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, createTheme, lightColors, darkColors } from '../theme';

// --- Type Definitions ---

/**
 * Theme mode: explicit light/dark or system-dependent.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Context value contract: theme colors, mode, and setter.
 */
interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
}

// --- Constants ---
const THEME_MODE_KEY = '@calmdemy_theme_mode';

// --- Context Definition ---
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Provider component that manages light/dark theme.
 *
 * On mount, loads user's saved theme preference from AsyncStorage.
 * Watches system color scheme via useColorScheme() hook.
 * Prevents rendering until theme is loaded to avoid flash of wrong theme.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // System color scheme from device settings (if user selected 'system' mode)
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * Load saved theme preference on mount.
   *
   * Reads from AsyncStorage with guard clauses to validate the value
   * before accepting it. If load fails or no preference exists,
   * defaults to 'system' mode.
   */
  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(THEME_MODE_KEY);
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system')) {
        setThemeModeState(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme mode:', error);
    } finally {
      // Always mark as loaded, even if fetch failed. This prevents
      // the app from getting stuck in a loading state.
      setIsLoaded(true);
    }
  };

  /**
   * Save theme preference and update state.
   *
   * Persists to AsyncStorage for future sessions. If save fails,
   * still updates local state (Graceful Degradation) — the theme
   * will change immediately but may revert on next app launch
   * if persistence failed.
   *
   * @param mode - ThemeMode to apply and save
   */
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_MODE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
      // Still update state even if save fails — user sees the change immediately
      setThemeModeState(mode);
    }
  };

  /**
   * Determine if dark mode should be active.
   *
   * If themeMode is 'system', read from systemColorScheme (device setting).
   * Otherwise, use the explicit light/dark choice.
   * Memoized to prevent unnecessary recalculations.
   */
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark';
    }
    return themeMode === 'dark';
  }, [themeMode, systemColorScheme]);

  /**
   * Create theme object (colors + typography + spacing).
   *
   * Based on isDark flag, selects appropriate color palette
   * (lightColors or darkColors) and builds the full theme via createTheme().
   * Memoized to prevent unnecessary object creation.
   */
  const theme = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    return createTheme(colors, isDark);
  }, [isDark]);

  /**
   * Context value object.
   *
   * Memoized to ensure referential stability. If we didn't memoize,
   * every render would create a new object identity, causing all consumers
   * to re-render even if the actual theme didn't change (the "context
   * value identity" pitfall). With memoization, consumers only re-render
   * when theme, themeMode, or isDark actually change.
   */
  const contextValue = useMemo<ThemeContextValue>(() => ({
    theme,
    themeMode,
    isDark,
    setThemeMode,
  }), [theme, themeMode, isDark]);

  /**
   * Guard: Don't render until theme preference is loaded.
   *
   * This prevents a "flash" of the wrong theme on app startup.
   * Without this guard, we'd render with the default 'system' mode
   * before AsyncStorage finishes loading the user's saved preference.
   */
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 *
 * Throws if used outside ThemeProvider (guard clause).
 * Returns the entire theme object and utilities for dynamic styling.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

