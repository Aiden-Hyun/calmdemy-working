/**
 * /routines/tracker/[id] route — thin wrapper.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { TrackerDetailScreen } from '../../../src/features/routines';

export default function TrackerDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <TrackerDetailScreen trackerId={id} />
    </ProtectedRoute>
  );
}
