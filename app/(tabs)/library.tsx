/**
 * app/(tabs)/library.tsx — Library tab
 *
 * Placeholder introduced in Phase 7c (tab restructure). The real Library tab
 * home (recently-played hero + browse tiles) replaces this in Phase 7d.
 */
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';

function LibraryScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <Text style={styles.text}>Library</Text>
      </View>
    </SafeAreaView>
  );
}

export default function Library() {
  return (
    <ProtectedRoute>
      <LibraryScreen />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 18 },
});
