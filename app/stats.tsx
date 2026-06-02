/**
 * /stats route — thin wrapper.
 *
 * All logic lives in the progress feature module (src/features/progress/).
 * This file only owns the auth gate required by the manifest's
 * `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { StatsScreen } from '../src/features/progress';

export default function Stats() {
  return (
    <ProtectedRoute>
      <StatsScreen />
    </ProtectedRoute>
  );
}
