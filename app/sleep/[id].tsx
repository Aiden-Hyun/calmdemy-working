import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { BedtimeStoryPlayerScreen } from '../../src/features/sleep';

export default function BedtimeStoryPlayer() {
  return (
    <ProtectedRoute>
      <BedtimeStoryPlayerScreen />
    </ProtectedRoute>
  );
}
