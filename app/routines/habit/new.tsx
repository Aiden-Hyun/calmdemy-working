/**
 * /routines/habit/new route — thin wrapper.
 *
 * Create-a-habit form. All logic lives in the routines feature module.
 */

import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { HabitEditorScreen } from '../../../src/features/routines';

export default function NewHabit() {
  return (
    <ProtectedRoute>
      <HabitEditorScreen />
    </ProtectedRoute>
  );
}
