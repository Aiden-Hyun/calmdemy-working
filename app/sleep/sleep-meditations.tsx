import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { SleepMeditationsScreen } from '../../src/features/sleep';

export default function SleepMeditations() {
  return (
    <ProtectedRoute>
      <SleepMeditationsScreen />
    </ProtectedRoute>
  );
}
