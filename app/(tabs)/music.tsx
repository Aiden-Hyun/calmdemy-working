import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { MusicHomeScreen } from '../../src/features/music';

export default function Music() {
  return (
    <ProtectedRoute>
      <MusicHomeScreen />
    </ProtectedRoute>
  );
}
