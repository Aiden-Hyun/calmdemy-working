import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { HomeScreen } from '../../src/features/home';

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeScreen />
    </ProtectedRoute>
  );
}
