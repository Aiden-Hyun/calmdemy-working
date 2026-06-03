import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { NatureSoundsListScreen } from '../../src/features/music';

export default function NatureSounds() {
  return (
    <ProtectedRoute>
      <NatureSoundsListScreen />
    </ProtectedRoute>
  );
}
