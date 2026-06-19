import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/core/theme/ThemeContext';
import { TabBarButton } from '../../src/core/ui/TabBarButton';

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate proper bottom padding based on device safe area
  const bottomPadding = Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8;
  const tabBarHeight = 56 + bottomPadding;

  const screenOptions = useMemo(() => ({
    tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.textMuted,
    tabBarButton: TabBarButton,
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopWidth: 0,
      paddingBottom: bottomPadding,
      paddingTop: 8,
      height: tabBarHeight,
      // Ensure tab bar is above content and not covered by overlays
      zIndex: 100,
      elevation: 100,
      ...theme.shadows.md,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '500' as const,
      marginTop: 2,
    },
    tabBarIconStyle: {
      marginTop: 4,
    },
    headerShown: false,
  }), [theme, bottomPadding, tabBarHeight]);

  return (
    <Tabs screenOptions={screenOptions}>
      {/* Visible tab bar (left → right): Home, Library, Tools, Profile, Discover */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "sunny" : "sunny-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tools"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "construct" : "construct-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "compass" : "compass-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      {/* Orphan routes (Phase 7c): hidden from the tab bar via href:null but
          kept in the (tabs) group, so the tab bar persists when viewing them
          and deep links (/(tabs)/music|meditate|sleep) + the Library browse
          tiles still navigate. */}
      <Tabs.Screen name="music" options={{ href: null }} />
      <Tabs.Screen name="meditate" options={{ href: null }} />
      <Tabs.Screen name="sleep" options={{ href: null }} />
    </Tabs>
  );
}
