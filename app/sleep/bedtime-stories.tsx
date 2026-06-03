import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { BedtimeStoriesScreen } from '../../src/features/sleep';

export default function BedtimeStories() {
  return (
    <ProtectedRoute>
      <BedtimeStoriesScreen />
    </ProtectedRoute>
  );
}
