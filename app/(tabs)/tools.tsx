/**
 * app/(tabs)/tools.tsx — Tools tab
 *
 * Placeholder introduced in Phase 7c (tab restructure). The real Tools tab home
 * (breathing tile + "more coming soon" card) replaces this in Phase 7e.
 */
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';

function ToolsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.text}>Tools</Text>
      </View>
    </SafeAreaView>
  );
}

export default function Tools() {
  return (
    <ProtectedRoute>
      <ToolsScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});
