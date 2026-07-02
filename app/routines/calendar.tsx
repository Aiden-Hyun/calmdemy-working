/**
 * /routines/calendar route — thin wrapper.
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { TodoCalendarScreen } from '../../src/features/routines';

export default function Calendar() {
  return (
    <ProtectedRoute>
      <TodoCalendarScreen />
    </ProtectedRoute>
  );
}
