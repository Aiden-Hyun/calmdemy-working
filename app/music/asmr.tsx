import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { AsmrListScreen } from '../../src/features/music';

export default function ASMR() {
  return (
    <ProtectedRoute>
      <AsmrListScreen />
    </ProtectedRoute>
  );
}
