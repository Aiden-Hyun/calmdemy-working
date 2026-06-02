/**
 * Profile tab route — thin wrapper.
 *
 * All logic lives in the profile feature module (src/features/profile/).
 * This file only owns the auth gate required by the manifest's
 * `requiresAuth: true`.
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { ProfileScreen } from '../../src/features/profile';

export default function Profile() {
  return (
    <ProtectedRoute>
      <ProfileScreen />
    </ProtectedRoute>
  );
}
