/**
 * /cbt route — thin wrapper.
 *
 * All logic lives in the cbt feature module (src/features/cbt/). This file only
 * owns the auth gate required by the manifest's `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { CbtHomeScreen } from '../src/features/cbt';

export default function Cbt() {
  return (
    <ProtectedRoute>
      <CbtHomeScreen />
    </ProtectedRoute>
  );
}
