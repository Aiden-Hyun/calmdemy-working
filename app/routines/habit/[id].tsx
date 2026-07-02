/**
 * /routines/habit/[id] route — thin wrapper.
 *
 * Habit detail (streak, shields, summary). The dynamic `id` is read here and
 * passed as a prop; all logic lives in the routines feature module.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { HabitDetailScreen } from '../../../src/features/routines';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <HabitDetailScreen habitId={id} />
    </ProtectedRoute>
  );
}
