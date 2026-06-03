import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { SleepHomeScreen } from '../../src/features/sleep';

export default function Sleep() {
  return (
    <ProtectedRoute>
      <SleepHomeScreen />
    </ProtectedRoute>
  );
}
