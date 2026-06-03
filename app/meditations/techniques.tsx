import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { TechniquesScreen } from '../../src/features/meditation';

export default function Techniques() {
  return (
    <ProtectedRoute>
      <TechniquesScreen />
    </ProtectedRoute>
  );
}
