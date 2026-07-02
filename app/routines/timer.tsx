/**
 * /routines/timer route — thin wrapper.
 *
 * Optional `label` query param (e.g. a habit name) is shown above the timer.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { TimerScreen } from '../../src/features/routines';

export default function Timer() {
  const { label } = useLocalSearchParams<{ label?: string }>();
  return (
    <ProtectedRoute>
      <TimerScreen label={label} />
    </ProtectedRoute>
  );
}
