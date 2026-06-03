import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { SleepMeditationPlayerScreen } from '../../../src/features/sleep';

export default function SleepMeditationPlayer() {
  return (
    <ProtectedRoute>
      <SleepMeditationPlayerScreen />
    </ProtectedRoute>
  );
}
