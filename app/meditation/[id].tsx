import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { MeditationPlayerScreen } from '../../src/features/meditation';

export default function MeditationPlayer() {
  return (
    <ProtectedRoute>
      <MeditationPlayerScreen />
    </ProtectedRoute>
  );
}
