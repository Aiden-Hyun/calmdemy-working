/**
 * /routines/todos route — thin wrapper.
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { TodosScreen } from '../../src/features/routines';

export default function Todos() {
  return (
    <ProtectedRoute>
      <TodosScreen />
    </ProtectedRoute>
  );
}
