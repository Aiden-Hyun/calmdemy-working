/**
 * /cbt/entry/[id] route — thin wrapper.
 *
 * The CBT entry detail UI is CbtEntryDetailScreen (src/features/cbt/). This file
 * only reads the id param and applies the auth gate.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { CbtEntryDetailScreen } from '../../../src/features/cbt';

export default function CbtEntryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <CbtEntryDetailScreen entryId={id} />
    </ProtectedRoute>
  );
}
