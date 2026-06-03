/**
 * / (index) route — launch splash + startup routing.
 *
 * The routing decision (onboarding | home | login) lives in the auth feature's
 * useStartupRoute hook; this file only renders the branded splash while that
 * hook resolves and navigates.
 */

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { lightColors } from '../src/core/theme';
import { useStartupRoute } from '../src/features/auth';

export default function Index() {
  useStartupRoute();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🌿</Text>
      <Text style={styles.title}>Calmdemy</Text>
      <ActivityIndicator size="small" color={lightColors.primary} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    color: lightColors.primary,
    letterSpacing: -0.5,
  },
  spinner: {
    marginTop: 24,
  },
});
