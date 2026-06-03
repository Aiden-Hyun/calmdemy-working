import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { AllMeditationsScreen } from '../../src/features/meditation';

export default function AllMeditations() {
  return (
    <ProtectedRoute>
      <AllMeditationsScreen />
    </ProtectedRoute>
  );
}
