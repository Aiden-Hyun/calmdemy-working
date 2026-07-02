/**
 * /routines/habit/[id]/edit route — thin wrapper.
 *
 * Edit-a-habit form. The dynamic `id` param is read here and passed as a prop;
 * all logic lives in the routines feature module.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../../../src/core/auth/ProtectedRoute';
import { HabitEditorScreen } from '../../../../src/features/routines';

export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <HabitEditorScreen habitId={id} />
    </ProtectedRoute>
  );
}
