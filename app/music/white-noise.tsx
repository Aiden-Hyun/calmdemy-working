import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { WhiteNoiseListScreen } from '../../src/features/music';

export default function WhiteNoise() {
  return (
    <ProtectedRoute>
      <WhiteNoiseListScreen />
    </ProtectedRoute>
  );
}
