import { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { AuthProvider } from '../src/contexts/AuthContext';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { NetworkProvider } from '../src/contexts/NetworkContext';
import { SleepTimerProvider } from '../src/contexts/SleepTimerContext';
import { SubscriptionProvider } from '../src/contexts/SubscriptionContext';
import { QueryProvider } from '../src/providers/QueryProvider';
import { useFonts } from '../src/hooks/useFonts';
import { lightColors } from '../src/theme';
import { OfflineNavigator } from '../src/components/OfflineNavigator';

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingEmoji}>🌿</Text>
      <Text style={styles.loadingText}>Calmdemy</Text>
      <ActivityIndicator 
        size="small" 
        color={lightColors.primary} 
        style={styles.loadingSpinner}
      />
    </View>
  );
}

function RootNavigator() {
  const { theme } = useTheme();

  const screenOptions = useMemo(() => ({
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontFamily: 'DMSans-SemiBold',
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
  }), [theme]);

  return (
    <Stack screenOptions={screenOptions}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="login" 
          options={{ 
            title: 'Welcome',
            headerShown: false,
            animation: 'none',
            presentation: 'fullScreenModal',
          }} 
        />
        <Stack.Screen 
          name="meditation/[id]" 
          options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="sleep" 
        options={{ 
          headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="breathing" 
          options={{ 
            title: 'Breathe',
            presentation: 'modal',
          headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="stats" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="settings" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="terms" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="privacy" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="sleep-sounds" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="meditations" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="music" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="course" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="series" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="album" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="emergency" 
          options={{ 
            headerShown: false,
          }} 
        />
        <Stack.Screen 
          name="downloads" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
  );
}

export default function RootLayout() {
  const { fontsLoaded, fontError } = useFonts();

  // Log font errors for debugging
  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
  }, [fontError]);

  // Show loading screen while fonts are loading
  if (!fontsLoaded && !fontError) {
    return <LoadingScreen />;
  }

  return (
    <QueryProvider>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <NetworkProvider>
              <SleepTimerProvider>
                <OfflineNavigator>
                  <RootNavigator />
                </OfflineNavigator>
              </SleepTimerProvider>
            </NetworkProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: lightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '600',
    color: lightColors.primary,
    letterSpacing: -0.5,
  },
  loadingSpinner: {
    marginTop: 24,
  },
});
