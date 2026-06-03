import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { MeditateHomeScreen } from '../../src/features/meditation';

export default function Meditate() {
  return (
    <ProtectedRoute>
      <MeditateHomeScreen />
    </ProtectedRoute>
  );
}
