/**
 * /routines route — thin wrapper.
 *
 * All logic lives in the routines feature module (src/features/routines/). This
 * file only owns the auth gate required by the manifest's `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { RoutinesHomeScreen } from '../src/features/routines';

export default function Routines() {
  return (
    <ProtectedRoute>
      <RoutinesHomeScreen />
    </ProtectedRoute>
  );
}
